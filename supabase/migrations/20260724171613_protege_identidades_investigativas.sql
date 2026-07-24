-- Separa a chave privada de correlacao do identificador publico e fecha a
-- exposicao direta de documentos eleitorais.

insert into public.app_settings (key, value, updated_at)
values (
  'investigative_hash_secret',
  encode(extensions.gen_random_bytes(32), 'hex'),
  now()
)
on conflict (key) do nothing;

create or replace function public.hash_investigativo(valor text)
returns text
language plpgsql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  segredo text;
begin
  select configuracao.value
  into segredo
  from public.app_settings configuracao
  where configuracao.key = 'investigative_hash_secret';

  if segredo is null or segredo = '' then
    raise exception 'segredo investigativo nao configurado';
  end if;

  return encode(
    extensions.hmac(
      convert_to(coalesce(valor, ''), 'UTF8'),
      convert_to(segredo, 'UTF8'),
      'sha256'
    ),
    'hex'
  );
end;
$$;

revoke execute on function public.hash_investigativo(text)
  from public, anon, authenticated;
grant execute on function public.hash_investigativo(text)
  to postgres, service_role;

do $$
declare
  definicao text;
  corrigida text;
begin
  select pg_get_functiondef(
    'public.refresh_cadastro_canonico_investigativo()'::regprocedure
  )
  into definicao;

  corrigida := replace(
    definicao,
    $qsa_antigo$
      case
        when length(documento) = 14 then 'empresa:' || documento
        when length(documento) = 11
          then 'pessoa:doc:' ||
            left(public.hash_investigativo(documento), 32)
        else 'pessoa:qsa:' ||
          left(
            public.hash_investigativo(
              public.normaliza_nome_investigativo(nome)
            ),
            32
          )
      end as no_grafo,
$qsa_antigo$,
    $qsa_novo$
      case
        when length(documento) = 14 then 'empresa:' || documento
        else 'pessoa:' || gen_random_uuid()::text
      end as no_grafo,
$qsa_novo$
  );

  corrigida := replace(
    corrigida,
    $doador_antigo$
      case
        when length(documento_doador) = 14
          then 'empresa:' || documento_doador
        when length(documento_doador) = 11
          then 'pessoa:doc:' ||
            left(public.hash_investigativo(documento_doador), 32)
        else 'pessoa:doador:' ||
          left(
            public.hash_investigativo(
              public.normaliza_nome_investigativo(nome_doador) ||
              ':' || ano_eleicao::text
            ),
            32
          )
      end as no_grafo,
$doador_antigo$,
    $doador_novo$
      case
        when length(documento_doador) = 14
          then 'empresa:' || documento_doador
        else 'pessoa:' || gen_random_uuid()::text
      end as no_grafo,
$doador_novo$
  );

  corrigida := replace(
    corrigida,
    $candidatura_antiga$
      case
        when doacao.pessoa_publica_id is not null
          then 'pessoa-publica:' || doacao.pessoa_publica_id::text
        else 'candidatura:' || left(
          public.hash_investigativo(
            coalesce(
              nullif(
                regexp_replace(
                  coalesce(doacao.cpf_candidato, ''),
                  '[^0-9]',
                  '',
                  'g'
                ),
                ''
              ),
              public.normaliza_nome_investigativo(doacao.nome_candidato)
            ) || ':' || doacao.ano_eleicao::text
          ),
          32
        )
      end as no_grafo,
$candidatura_antiga$,
    $candidatura_nova$
      case
        when doacao.pessoa_publica_id is not null
          then 'pessoa-publica:' || doacao.pessoa_publica_id::text
        else 'candidatura:' || gen_random_uuid()::text
      end as no_grafo,
$candidatura_nova$
  );

  if corrigida = definicao then
    raise exception 'identificadores publicos nao receberam a protecao';
  end if;
  execute corrigida;
end
$$;

update public.entidade_canonica
set
  no_grafo = case
    when tipo = 'candidatura'
      then 'candidatura:' || gen_random_uuid()::text
    else 'pessoa:' || gen_random_uuid()::text
  end,
  updated_at = now()
where ativo
  and (
    no_grafo like 'pessoa:doc:%'
    or no_grafo like 'pessoa:qsa:%'
    or no_grafo like 'pessoa:doador:%'
    or (
      tipo = 'candidatura'
      and no_grafo like 'candidatura:%'
    )
  );

alter table public.tse_doador_campanha
  add column if not exists documento_doador_publico text
  generated always as (
    case
      when regexp_replace(
        coalesce(cpf_cnpj_doador, ''),
        '[^0-9]',
        '',
        'g'
      ) ~ '^[0-9]{14}$'
        then regexp_replace(cpf_cnpj_doador, '[^0-9]', '', 'g')
      when regexp_replace(
        coalesce(cpf_cnpj_doador, ''),
        '[^0-9]',
        '',
        'g'
      ) ~ '^[0-9]{11}$'
        then '***.***.***-' || right(
          regexp_replace(cpf_cnpj_doador, '[^0-9]', '', 'g'),
          2
        )
      else 'NAO DIVULGADO'
    end
  ) stored;

revoke all on public.tse_doador_campanha
  from anon, authenticated;
grant select (
  id,
  ano_eleicao,
  nome_candidato,
  ds_cargo,
  sg_partido,
  nome_doador,
  tipo_doador,
  vr_receita,
  ds_recurso,
  dt_receita,
  pessoa_publica_id,
  created_at,
  documento_doador_publico
) on public.tse_doador_campanha to anon, authenticated;

select public.refresh_investigacao_piracanjuba();

do $$
begin
  if exists (
    select 1
    from public.entidade_canonica
    where ativo
      and (
        no_grafo like 'pessoa:doc:%'
        or no_grafo like 'pessoa:qsa:%'
        or no_grafo like 'pessoa:doador:%'
      )
  ) then
    raise exception 'identificador derivado de pessoa ainda esta publico';
  end if;

  if has_function_privilege(
    'anon',
    'public.hash_investigativo(text)',
    'EXECUTE'
  ) then
    raise exception 'anon ainda executa hash_investigativo';
  end if;
end
$$;
