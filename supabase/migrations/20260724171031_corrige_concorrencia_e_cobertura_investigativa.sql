-- Serializa o dispatcher e mede a cobertura CNPJ somente no universo dos
-- fornecedores contratados pelo municipio.

do $$
declare
  definicao text;
  corrigida text;
begin
  select pg_get_functiondef(
    'public.dispatch_next_empenhos_backfill()'::regprocedure
  )
  into definicao;

  corrigida := replace(
    definicao,
    E'begin\n'
      || E'  -- Confirma janelas cuja execucao ja registrou estado completo.',
    E'begin\n'
      || E'  perform pg_advisory_xact_lock(\n'
      || E'    hashtext(''dispatch_next_empenhos_backfill'')\n'
      || E'  );\n\n'
      || E'  -- Confirma janelas cuja execucao ja registrou estado completo.'
  );

  if corrigida = definicao then
    raise exception 'dispatcher nao recebeu o lock transacional';
  end if;
  execute corrigida;

  select pg_get_functiondef(
    'public.recalcular_indicios_contratacao()'::regprocedure
  )
  into definicao;

  corrigida := replace(
    definicao,
    $antigo$
  from (
    select
      (
        select count(distinct fornecedor_documento_digitos)
        from public.prefeitura_contratos
        where fornecedor_documento_digitos ~ '^[0-9]{14}$'
      ) as cnpjs_contratados,
      (
        select count(*)
        from public.fornecedores_cnpj
      ) as cnpjs_enriquecidos,
      (
        select count(*)
        from public.fornecedores_cnpj
        where jsonb_typeof(socios) = 'array'
          and jsonb_array_length(socios) > 0
      ) as cnpjs_com_qsa
  ) cobertura
$antigo$,
    $novo$
  from (
    with contratados as (
      select distinct fornecedor_documento_digitos as cnpj
      from public.prefeitura_contratos
      where fornecedor_documento_digitos ~ '^[0-9]{14}$'
    )
    select
      count(*) as cnpjs_contratados,
      count(fornecedor.cnpj) as cnpjs_enriquecidos,
      count(fornecedor.cnpj) filter (
        where jsonb_typeof(fornecedor.socios) = 'array'
          and jsonb_array_length(fornecedor.socios) > 0
      ) as cnpjs_com_qsa
    from contratados
    left join public.fornecedores_cnpj fornecedor
      on fornecedor.cnpj = contratados.cnpj
  ) cobertura
$novo$
  );

  if corrigida = definicao then
    raise exception 'cobertura CNPJ nao recebeu o recorte contratado';
  end if;
  execute corrigida;
end
$$;

select public.refresh_investigacao_piracanjuba();

do $$
declare
  metricas jsonb;
begin
  select cobertura.metricas
  into metricas
  from public.cobertura_regra_investigativa cobertura
  where cobertura.regra = 'CNPJ_QSA';

  if (metricas->>'cnpjs_enriquecidos')::integer >
      (metricas->>'cnpjs_contratados')::integer then
    raise exception 'cobertura CNPJ compara universos diferentes: %', metricas;
  end if;
end
$$;
