-- Mantem a fila historica continua conforme a janela movel do sync diario e
-- explicita a cobertura parcial de cruzamentos baseados em socios PJ.

create or replace function public.maintain_empenhos_backfill_coverage()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inicio date;
  fim date;
  limite date :=
    (
      date_trunc('month', current_date)
      - interval '1 month'
      - interval '1 day'
    )::date;
  inseridas integer := 0;
begin
  select coalesce(max(data_fim) + 1, date '2012-01-01')
  into inicio
  from public.prefeitura_empenhos_backfill_fila;

  while inicio <= limite loop
    fim := least(
      (
        date_trunc('month', inicio)
        + interval '1 month'
        - interval '1 day'
      )::date,
      limite
    );

    insert into public.prefeitura_empenhos_backfill_fila (
      scope,
      data_inicio,
      data_fim,
      prioridade
    )
    values (
      to_char(inicio, 'DD/MM/YYYY') || ':' || to_char(fim, 'DD/MM/YYYY'),
      inicio,
      fim,
      case
        when exists (
          select 1
          from public.prefeitura_pagamentos_ordem pagamento
          where pagamento.data_pagamento between inicio and fim
        ) then 100
        else 10
      end
    )
    on conflict (scope) do update
    set
      data_inicio = excluded.data_inicio,
      data_fim = excluded.data_fim,
      prioridade = excluded.prioridade,
      updated_at = now();

    inseridas := inseridas + 1;
    inicio := fim + 1;
  end loop;

  if (
    select min(data_inicio) <> date '2012-01-01'
      or max(data_fim) < limite
    from public.prefeitura_empenhos_backfill_fila
  ) or exists (
    select 1
    from (
      select
        data_inicio,
        lag(data_fim) over (order by data_inicio) as data_fim_anterior
      from public.prefeitura_empenhos_backfill_fila
      where data_inicio <= limite
    ) janela
    where data_fim_anterior is not null
      and data_inicio <> data_fim_anterior + 1
  ) then
    raise exception
      'fila de empenhos nao cobre continuamente 2012-01-01 a %',
      limite;
  end if;

  return jsonb_build_object(
    'limite', limite,
    'janelas_inseridas', inseridas,
    'cobertura_ate', (
      select max(data_fim)
      from public.prefeitura_empenhos_backfill_fila
    )
  );
end;
$$;

revoke execute on function public.maintain_empenhos_backfill_coverage()
  from public, anon, authenticated;
grant execute on function public.maintain_empenhos_backfill_coverage()
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
  documentos_pj_integrais bigint;
  correspondencias_ativas bigint;
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
  documentos_pj_integrais :=
    coalesce((metricas->>'socios_pj_documento_integral')::bigint, 0);
  correspondencias_ativas :=
    coalesce((metricas->>'correspondencias_ativas')::bigint, 0);

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
      when documentos_pf_integrais > 0
        or documentos_pj_integrais > 0
        or correspondencias_ativas > 0
        then 'parcial'
      else 'indisponivel'
    end,
    case
      when documentos_pf_integrais > 0
        then 'A regra usa somente socios com documento integral; a cobertura permanece parcial.'
      when documentos_pj_integrais > 0
        or correspondencias_ativas > 0
        then 'A cobertura esta disponivel somente para socios pessoa juridica com CNPJ integral; CPFs de socios pessoa fisica permanecem mascarados.'
      else 'As fontes publicas de QSA mascaram o CPF de socios pessoa fisica. O cruzamento nominal foi recusado para evitar falsos positivos.'
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

do $$
begin
  if exists (
    select 1
    from cron.job
    where jobname = 'maintain-empenhos-backfill-coverage'
  ) then
    perform cron.unschedule('maintain-empenhos-backfill-coverage');
  end if;
end
$$;

select cron.schedule(
  'maintain-empenhos-backfill-coverage',
  '11 0 * * *',
  $$select public.maintain_empenhos_backfill_coverage();$$
);

select public.maintain_empenhos_backfill_coverage();
select public.refresh_cobertura_socios_doacoes();
