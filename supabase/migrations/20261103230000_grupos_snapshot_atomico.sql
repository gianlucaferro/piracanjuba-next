-- Publicação atômica de grupos determinísticos. Não executa refresh nesta migration.
alter table public.grupo_economico add column if not exists chave text;
alter table public.grupo_economico add column if not exists snapshot_hash text;
update public.grupo_economico g set chave = (
  select string_agg(m.cnpj, ',' order by m.cnpj) from public.grupo_economico_membro m where m.grupo_id = g.id
) where chave is null;
create unique index if not exists grupo_economico_chave_key on public.grupo_economico(chave);

create table if not exists public.grupo_economico_atualizacao (
  id boolean primary key default true check (id),
  verificado_em timestamptz not null,
  fontes jsonb not null,
  grupos integer not null check (grupos >= 0)
);
alter table public.grupo_economico_atualizacao enable row level security;
create policy "Atualizacao dos grupos publica" on public.grupo_economico_atualizacao for select to anon, authenticated using (true);
revoke all on public.grupo_economico_atualizacao from anon, authenticated;
grant select on public.grupo_economico_atualizacao to anon, authenticated;
grant all on public.grupo_economico_atualizacao to service_role;
revoke insert, update, delete, truncate, references, trigger on public.grupo_economico, public.grupo_economico_membro from anon, authenticated;

create or replace function public.publicar_grupos_economicos(p_grupos jsonb, p_fontes jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare
  fonte text;
  quantidade bigint;
  ultima timestamptz;
  grupo jsonb;
  membro jsonb;
  v_grupo_id uuid;
  chaves text[] := '{}';
  hash_atual text;
  alterados integer := 0;
begin
  perform pg_advisory_xact_lock(hashtextextended('public.publicar_grupos_economicos', 0));
  if jsonb_typeof(p_grupos) is distinct from 'array' or jsonb_array_length(p_grupos) > 10000 then
    raise exception 'Snapshot de grupos inválido';
  end if;
  if jsonb_array_length(p_grupos)=0 and exists(select 1 from public.grupo_economico) then
    raise exception 'Snapshot vazio recusado; revisar a cobertura do QSA antes de remover todos os grupos';
  end if;
  lock table public.contratos, public.contrato_camara, public.fornecedores_cnpj in share mode;
  -- Recusar uma leitura truncada ou anterior a uma alteração concorrente de origem.
  foreach fonte in array array['contratos', 'contrato_camara', 'fornecedores_cnpj'] loop
    execute format('select count(*), max(updated_at) from public.%I', fonte) into quantidade, ultima;
    if quantidade = 0 or quantidade is distinct from (p_fontes->fonte->>'quantidade')::bigint
      or ultima is distinct from (p_fontes->fonte->>'atualizado_em')::timestamptz then
      raise exception 'Origem % mudou ou está incompleta; snapshot preservado', fonte;
    end if;
  end loop;
  for grupo in select value from jsonb_array_elements(p_grupos) loop
    if coalesce(grupo->>'chave','') = '' or jsonb_typeof(grupo->'membros') is distinct from 'array'
      or jsonb_array_length(grupo->'membros') < 2
      or jsonb_typeof(grupo->'socios_conectores') is distinct from 'array'
      or (grupo->>'n_empresas')::integer is distinct from jsonb_array_length(grupo->'membros')
      or grupo->>'chave' = any(chaves) then
      raise exception 'Grupo inválido ou duplicado';
    end if;
    if grupo->>'chave' is distinct from (
      select string_agg(value->>'cnpj', ',' order by value->>'cnpj') from jsonb_array_elements(grupo->'membros')
    ) then raise exception 'Chave incompatível com os membros'; end if;
    if exists(select 1 from jsonb_array_elements(grupo->'socios_conectores') s
      where coalesce(s->>'doc','') !~ '^([0-9]{14}|\*{3}[0-9]{6}\*{2})$') then
      raise exception 'Documento de sócio precisa ser CNPJ ou CPF mascarado';
    end if;
    chaves := array_append(chaves, grupo->>'chave');
    hash_atual := md5(grupo::text);
    v_grupo_id := null;
    insert into public.grupo_economico as g(chave,snapshot_hash,rotulo,tipo,n_empresas,valor_total,socios_conectores,atualizado_em)
    values(grupo->>'chave',hash_atual,grupo->>'rotulo','socio_comum',(grupo->>'n_empresas')::integer,
      (grupo->>'valor_total')::numeric,grupo->'socios_conectores',now())
    on conflict(chave) do update set snapshot_hash=excluded.snapshot_hash,rotulo=excluded.rotulo,tipo=excluded.tipo,
      n_empresas=excluded.n_empresas,valor_total=excluded.valor_total,socios_conectores=excluded.socios_conectores,atualizado_em=excluded.atualizado_em
    where g.snapshot_hash is distinct from excluded.snapshot_hash
    returning id into v_grupo_id;
    if v_grupo_id is not null then alterados := alterados + 1; end if;
    if v_grupo_id is null then select g.id into v_grupo_id from public.grupo_economico g where g.chave=grupo->>'chave'; end if;
    for membro in select value from jsonb_array_elements(grupo->'membros') loop
      if coalesce(membro->>'cnpj','') !~ '^[0-9]{14}$' then raise exception 'CNPJ inválido'; end if;
      insert into public.grupo_economico_membro as m(grupo_id,cnpj,razao_social,poderes,n_contratos,valor)
      values(v_grupo_id,membro->>'cnpj',membro->>'razao_social',array(select jsonb_array_elements_text(membro->'poderes')),
        (membro->>'n_contratos')::integer,(membro->>'valor')::numeric)
      on conflict(grupo_id,cnpj) do update set razao_social=excluded.razao_social,poderes=excluded.poderes,n_contratos=excluded.n_contratos,valor=excluded.valor;
    end loop;
    delete from public.grupo_economico_membro m where m.grupo_id=v_grupo_id
      and not exists(select 1 from jsonb_array_elements(grupo->'membros') v where v->>'cnpj'=m.cnpj);
  end loop;
  delete from public.grupo_economico g where g.chave is null or not(g.chave=any(chaves));
  insert into public.grupo_economico_atualizacao(id,verificado_em,fontes,grupos)
    values(true,now(),p_fontes,jsonb_array_length(p_grupos))
    on conflict(id) do update set verificado_em=excluded.verificado_em,fontes=excluded.fontes,grupos=excluded.grupos;
  return jsonb_build_object('grupos',jsonb_array_length(p_grupos),'alterados',alterados,'verificado_em',now());
end;
$function$;
revoke all on function public.publicar_grupos_economicos(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.publicar_grupos_economicos(jsonb,jsonb) to service_role;
