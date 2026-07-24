-- Fecha a continuidade dos empenhos, serializa o enriquecimento de CNPJ,
-- publica a limitacao do cruzamento socio-doador e remove chaves internas da
-- API publica.

insert into public.prefeitura_empenhos_backfill_fila (
  scope,
  data_inicio,
  data_fim,
  prioridade
)
select
  to_char(periodo.data_inicio, 'DD/MM/YYYY') || ':' ||
    to_char(periodo.data_fim, 'DD/MM/YYYY'),
  periodo.data_inicio,
  periodo.data_fim,
  case
    when exists (
      select 1
      from public.prefeitura_pagamentos_ordem pagamento
      where pagamento.data_pagamento between
        periodo.data_inicio and periodo.data_fim
    ) then 100
    else 10
  end
from (
  values
    (date '2026-01-01', date '2026-03-31'),
    (date '2026-04-01', date '2026-05-31')
) as periodo(data_inicio, data_fim)
on conflict (scope) do update
set
  data_inicio = excluded.data_inicio,
  data_fim = excluded.data_fim,
  prioridade = excluded.prioridade,
  updated_at = now();

do $$
begin
  if (
    select min(data_inicio) <> date '2012-01-01'
      or max(data_fim) <> date '2026-05-31'
    from public.prefeitura_empenhos_backfill_fila
  ) or exists (
    select 1
    from (
      select
        data_inicio,
        lag(data_fim) over (order by data_inicio) as data_fim_anterior
      from public.prefeitura_empenhos_backfill_fila
    ) janela
    where data_fim_anterior is not null
      and data_inicio <> data_fim_anterior + 1
  ) then
    raise exception
      'fila de empenhos nao cobre continuamente 2012-01-01 a 2026-05-31';
  end if;
end
$$;

do $$
declare
  definicao text;
  corrigida text;
begin
  select pg_get_functiondef(
    'public.recalcular_indicios_contratacao()'::regprocedure
  )
  into definicao;

  corrigida := replace(
    definicao,
    'Todas as janelas de 2012 a 2025 foram confirmadas.',
    'Todas as janelas de 2012 a maio de 2026 foram confirmadas.'
  );

  if corrigida = definicao then
    raise exception 'descricao da cobertura de empenhos nao foi atualizada';
  end if;
  execute corrigida;
end
$$;

create table if not exists public.sync_fornecedores_cnpj_lease (
  id boolean primary key default true check (id),
  token uuid,
  locked_until timestamptz not null default '-infinity',
  updated_at timestamptz not null default now()
);

alter table public.sync_fornecedores_cnpj_lease
  enable row level security;
revoke all on public.sync_fornecedores_cnpj_lease
  from public, anon, authenticated;

create or replace function public.claim_sync_fornecedores_cnpj()
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  novo_token uuid := gen_random_uuid();
  token_adquirido uuid;
begin
  insert into public.sync_fornecedores_cnpj_lease as lease (
    id,
    token,
    locked_until,
    updated_at
  )
  values (
    true,
    novo_token,
    now() + interval '12 minutes',
    now()
  )
  on conflict (id) do update
  set
    token = excluded.token,
    locked_until = excluded.locked_until,
    updated_at = now()
  where lease.locked_until <= now()
  returning token into token_adquirido;

  return token_adquirido;
end;
$$;

create or replace function public.release_sync_fornecedores_cnpj(
  lease_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.sync_fornecedores_cnpj_lease
  set
    token = null,
    locked_until = now(),
    updated_at = now()
  where id
    and token = lease_token;

  return found;
end;
$$;

revoke execute on function public.claim_sync_fornecedores_cnpj()
  from public, anon, authenticated;
revoke execute on function public.release_sync_fornecedores_cnpj(uuid)
  from public, anon, authenticated;
grant execute on function public.claim_sync_fornecedores_cnpj()
  to postgres, service_role;
grant execute on function public.release_sync_fornecedores_cnpj(uuid)
  to postgres, service_role;

create or replace function
  public.refresh_cobertura_socios_doacoes()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  metricas jsonb;
  documentos_pf_integrais bigint;
begin
  with qsa as (
    select socio
    from public.fornecedores_cnpj fornecedor
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(fornecedor.socios) = 'array'
          then fornecedor.socios
        else '[]'::jsonb
      end
    ) socio
  ),
  medidas as (
    select
      count(*) as socios_publicados,
      count(*) filter (
        where regexp_replace(
          coalesce(
            socio->>'cnpj_cpf_do_socio',
            socio->>'cnpj_cpf_socio',
            ''
          ),
          '[^0-9]',
          '',
          'g'
        ) ~ '^[0-9]{11}$'
      ) as socios_pf_documento_integral,
      count(*) filter (
        where regexp_replace(
          coalesce(
            socio->>'cnpj_cpf_do_socio',
            socio->>'cnpj_cpf_socio',
            ''
          ),
          '[^0-9]',
          '',
          'g'
        ) ~ '^[0-9]{14}$'
      ) as socios_pj_documento_integral
    from qsa
  )
  select jsonb_build_object(
    'socios_publicados', medidas.socios_publicados,
    'socios_pf_documento_integral',
      medidas.socios_pf_documento_integral,
    'socios_pj_documento_integral',
      medidas.socios_pj_documento_integral,
    'doadores_pf_documento_integral',
      (
        select count(*)
        from public.tse_doador_campanha doacao
        where regexp_replace(
          coalesce(doacao.cpf_cnpj_doador, ''),
          '[^0-9]',
          '',
          'g'
        ) ~ '^[0-9]{11}$'
      ),
    'correspondencias_ativas',
      (
        select count(*)
        from public.indicio_contratacao indicio
        where indicio.ativo
          and indicio.regra =
            'SOCIO_DOADOR_COM_EMPRESA_CONTRATADA'
      )
  )
  into metricas
  from medidas;

  documentos_pf_integrais :=
    coalesce((metricas->>'socios_pf_documento_integral')::bigint, 0);

  insert into public.cobertura_regra_investigativa (
    regra,
    status,
    motivo,
    metricas,
    fonte,
    atualizado_em
  )
  values (
    'SOCIO_DOADOR_COM_EMPRESA_CONTRATADA',
    case
      when documentos_pf_integrais = 0 then 'indisponivel'
      else 'parcial'
    end,
    case
      when documentos_pf_integrais = 0
        then 'As fontes publicas de QSA mascaram o CPF de socios pessoa fisica. O cruzamento nominal foi recusado para evitar falsos positivos.'
      else 'A regra usa somente socios com documento integral; a cobertura permanece parcial.'
    end,
    metricas,
    'BrasilAPI, OpenCNPJ e TSE',
    now()
  )
  on conflict (regra) do update
  set
    status = excluded.status,
    motivo = excluded.motivo,
    metricas = excluded.metricas,
    fonte = excluded.fonte,
    atualizado_em = now();

  return metricas;
end;
$$;

revoke execute on function public.refresh_cobertura_socios_doacoes()
  from public, anon, authenticated;
grant execute on function public.refresh_cobertura_socios_doacoes()
  to postgres, service_role;

create or replace function public.refresh_investigacao_piracanjuba()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cadastro jsonb;
  indicios jsonb;
  cobertura_socios_doacoes jsonb;
begin
  cadastro := public.refresh_cadastro_canonico_investigativo();
  indicios := public.recalcular_indicios_contratacao();
  cobertura_socios_doacoes :=
    public.refresh_cobertura_socios_doacoes();

  return jsonb_build_object(
    'cadastro', cadastro,
    'indicios', indicios,
    'cobertura_socios_doacoes', cobertura_socios_doacoes
  );
end;
$$;

revoke execute on function public.refresh_investigacao_piracanjuba()
  from public, anon, authenticated;
grant execute on function public.refresh_investigacao_piracanjuba()
  to postgres, service_role;

alter table public.relacao_entidade
  add column if not exists id_publico uuid
  not null default gen_random_uuid();

create unique index if not exists relacao_entidade_id_publico_uidx
  on public.relacao_entidade (id_publico);

revoke all on public.relacao_entidade
  from anon, authenticated;
grant select (
  id_publico,
  origem_id,
  relacao,
  destino_id,
  data_evento,
  valor,
  confianca,
  fonte,
  fonte_url,
  evidencias,
  ativo,
  created_at,
  updated_at
) on public.relacao_entidade to anon, authenticated;

create or replace view public.v_relacoes_entidades
with (security_invoker = true) as
select
  relacao.id_publico::text as chave,
  origem.no_grafo as origem,
  relacao.relacao,
  destino.no_grafo as destino,
  relacao.data_evento,
  relacao.valor,
  relacao.confianca,
  relacao.fonte,
  relacao.fonte_url,
  relacao.evidencias,
  relacao.updated_at
from public.relacao_entidade relacao
join public.entidade_canonica origem on origem.id = relacao.origem_id
join public.entidade_canonica destino on destino.id = relacao.destino_id
where relacao.ativo
  and origem.ativo
  and destino.ativo;

grant select on public.v_relacoes_entidades
  to anon, authenticated;

do $$
begin
  if exists (
    select 1
    from cron.job
    where jobname = 'sync-fornecedores-cnpj-investigativo'
  ) then
    perform cron.unschedule('sync-fornecedores-cnpj-investigativo');
  end if;
end
$$;

select cron.schedule(
  'sync-fornecedores-cnpj-investigativo',
  '*/5 * * * *',
  $$select public.invoke_edge_function_secure(
    'sync-fornecedores-cnpj',
    '{"batch_size":20}'::jsonb
  );$$
);

update public.sync_job_registry
set
  cron_expression = '*/5 * * * *',
  description_pt =
    'CNPJ e QSA dos fornecedores, em lotes serializados de ate 20.'
where function_name = 'sync-fornecedores-cnpj';

select public.refresh_investigacao_piracanjuba();
