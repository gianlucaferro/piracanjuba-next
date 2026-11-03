\set ON_ERROR_STOP on
begin;
do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
end $$;
create table public.contratos(id uuid primary key, updated_at timestamptz);
create table public.contrato_camara(id uuid primary key, updated_at timestamptz);
create table public.fornecedores_cnpj(id uuid primary key, updated_at timestamptz);
insert into public.contratos values('00000000-0000-4000-8000-000000000001','2026-11-03T10:00:00Z');
insert into public.contrato_camara values('00000000-0000-4000-8000-000000000001','2026-11-03T10:00:00Z');
insert into public.fornecedores_cnpj values('00000000-0000-4000-8000-000000000001','2026-11-03T10:00:00Z');
\ir ../supabase/migrations/20260715235000_grupos_economicos.sql
insert into public.grupo_economico(id,rotulo,setor,n_empresas,valor_total) values('00000000-0000-4000-8000-000000000010','Original','Saúde',2,10);
insert into public.grupo_economico_membro(grupo_id,cnpj) values
('00000000-0000-4000-8000-000000000010','12345678000190'),
('00000000-0000-4000-8000-000000000010','98765432000100');
\ir ../supabase/migrations/20261103230000_grupos_snapshot_atomico.sql
create function pg_temp.fontes() returns jsonb language sql as $$
select '{"contratos":{"quantidade":1,"atualizado_em":"2026-11-03T10:00:00Z"},"contrato_camara":{"quantidade":1,"atualizado_em":"2026-11-03T10:00:00Z"},"fornecedores_cnpj":{"quantidade":1,"atualizado_em":"2026-11-03T10:00:00Z"}}'::jsonb;
$$;
create function pg_temp.grupos() returns jsonb language sql as $$
select '[{"chave":"12345678000190,98765432000100","rotulo":"Grupo exemplo","tipo":"socio_comum","n_empresas":2,"valor_total":200,"socios_conectores":[{"nome":"Pessoa Exemplo","doc":"***123456**","n_empresas":2,"cnpjs":["12345678000190","98765432000100"]}],"membros":[{"cnpj":"12345678000190","razao_social":"Empresa A","poderes":["prefeitura"],"n_contratos":1,"valor":100},{"cnpj":"98765432000100","razao_social":"Empresa B","poderes":["camara"],"n_contratos":1,"valor":100}]}]'::jsonb;
$$;
do $$ declare resultado jsonb; begin
  resultado := public.publicar_grupos_economicos(pg_temp.grupos(),pg_temp.fontes());
  if resultado->>'alterados'<>'1' then raise exception 'Snapshot não atualizou grupo'; end if;
  if not exists(select 1 from public.grupo_economico where id='00000000-0000-4000-8000-000000000010' and setor='Saúde' and valor_total=200) then
    raise exception 'ID ou classificação existente foi perdida';
  end if;
  resultado := public.publicar_grupos_economicos(pg_temp.grupos(),pg_temp.fontes());
  if resultado->>'alterados'<>'0' then raise exception 'Snapshot idêntico gerou falsa atualização'; end if;
  if (select count(*) from public.grupo_economico_membro)<>2 then raise exception 'Snapshot duplicou membros'; end if;
end $$;
do $$ begin
  begin
    perform public.publicar_grupos_economicos(pg_temp.grupos(),jsonb_set(pg_temp.fontes(),'{contratos,quantidade}','2'));
    raise exception 'Teste deveria recusar origem alterada';
  exception when others then
    if sqlerrm not like 'Origem % mudou ou está incompleta%' then raise; end if;
  end;
  begin
    perform public.publicar_grupos_economicos('[]',pg_temp.fontes());
    raise exception 'Teste deveria recusar esvaziamento';
  exception when others then
    if sqlerrm not like 'Snapshot vazio recusado%' then raise; end if;
  end;
  begin
    perform public.publicar_grupos_economicos(jsonb_set(pg_temp.grupos(),'{0,socios_conectores,0,doc}','"12345678901"'),pg_temp.fontes());
    raise exception 'Teste deveria recusar CPF integral';
  exception when others then
    if sqlerrm not like 'Documento de sócio precisa%' then raise; end if;
  end;
  if (select valor_total from public.grupo_economico limit 1)<>200 then raise exception 'Falha parcial alterou snapshot'; end if;
  if has_function_privilege('anon','public.publicar_grupos_economicos(jsonb,jsonb)','EXECUTE') or
     has_function_privilege('authenticated','public.publicar_grupos_economicos(jsonb,jsonb)','EXECUTE') then
    raise exception 'RPC de escrita acessível publicamente';
  end if;
  if not has_function_privilege('service_role','public.publicar_grupos_economicos(jsonb,jsonb)','EXECUTE') then raise exception 'RPC indisponível ao coletor'; end if;
end $$;
rollback;
\echo 'Grupos: publicação atômica, identidade estável, idempotência, cobertura e ACL aprovados'
