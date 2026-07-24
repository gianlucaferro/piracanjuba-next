begin;

insert into public.funprepi_referencia_anual (
  ano,
  periodo_fim,
  quantidade_empenhos,
  valor_pago,
  fonte_url,
  verificado_em
)
values (
  2099,
  date '2099-06-30',
  1,
  100,
  'https://example.invalid/funprepi-test',
  current_date
)
on conflict (ano) do update
set
  periodo_fim = excluded.periodo_fim,
  quantidade_empenhos = excluded.quantidade_empenhos,
  valor_pago = excluded.valor_pago,
  fonte_url = excluded.fonte_url,
  verificado_em = excluded.verificado_em;

insert into public.prefeitura_empenhos (
  id,
  data,
  fornecedor_nome,
  fornecedor_documento_digitos,
  orgao_id,
  elemento,
  valor_empenhado,
  valor_anulacao,
  valor_liquidado,
  valor_pago,
  saldo_pagar,
  raw_payload,
  fonte_url
)
values
  (
    -2099001,
    date '2099-06-01',
    'FORNECEDOR CPF TESTE',
    '12345678901',
    44,
    'SERVICOS ADMINISTRATIVOS',
    100,
    0,
    100,
    100,
    0,
    '{}'::jsonb,
    'https://example.invalid/funprepi-test'
  ),
  (
    -2099002,
    date '2099-07-01',
    'BENEFICIO FORA DO CORTE',
    null,
    44,
    'APOSENTADORIA',
    900,
    0,
    900,
    900,
    0,
    '{}'::jsonb,
    'https://example.invalid/funprepi-test'
  ),
  (
    -2099003,
    date '2099-06-01',
    'ORGAO FORA DO ESCOPO',
    null,
    45,
    'APOSENTADORIA',
    777,
    0,
    777,
    777,
    0,
    '{}'::jsonb,
    'https://example.invalid/funprepi-test'
  )
on conflict (id) do update
set
  data = excluded.data,
  fornecedor_nome = excluded.fornecedor_nome,
  fornecedor_documento_digitos = excluded.fornecedor_documento_digitos,
  orgao_id = excluded.orgao_id,
  elemento = excluded.elemento,
  valor_empenhado = excluded.valor_empenhado,
  valor_anulacao = excluded.valor_anulacao,
  valor_liquidado = excluded.valor_liquidado,
  valor_pago = excluded.valor_pago,
  saldo_pagar = excluded.saldo_pagar,
  raw_payload = excluded.raw_payload,
  fonte_url = excluded.fonte_url,
  updated_at = now();

insert into public.prefeitura_contratos (
  id,
  numero,
  ano,
  orgao_id,
  valor,
  fornecedor_nome,
  fornecedor_documento_digitos,
  objeto,
  raw_payload,
  fonte_url
)
values
  (
    -209944,
    'TESTE-44',
    2099,
    44,
    100,
    'CONTRATADO CPF TESTE',
    '98765432100',
    'Contrato sintético do teste FUNPREPI',
    '{}'::jsonb,
    'https://example.invalid/funprepi-test'
  ),
  (
    -209945,
    'TESTE-45',
    2099,
    45,
    900,
    'CONTRATADO FORA DO ESCOPO',
    '11122233344',
    'Contrato sintético fora do órgão 44',
    '{}'::jsonb,
    'https://example.invalid/funprepi-test'
  )
on conflict (id) do update
set
  numero = excluded.numero,
  ano = excluded.ano,
  orgao_id = excluded.orgao_id,
  valor = excluded.valor,
  fornecedor_nome = excluded.fornecedor_nome,
  fornecedor_documento_digitos = excluded.fornecedor_documento_digitos,
  objeto = excluded.objeto,
  raw_payload = excluded.raw_payload,
  fonte_url = excluded.fonte_url,
  updated_at = now();

insert into public.indicio_contratacao (
  chave,
  regra,
  categoria,
  severidade,
  score,
  titulo,
  descricao,
  contrato_id,
  orgao_id,
  evidencias,
  fonte_urls,
  regra_versao,
  ativo
)
values
  (
    'funprepi-teste-orgao-44',
    'TESTE_FUNPREPI',
    'teste',
    'informativa',
    1,
    'Indício sintético do órgão 44',
    'Fixture transacional',
    -209944,
    44,
    '{}'::jsonb,
    array['https://example.invalid/funprepi-test'],
    'teste-1',
    true
  ),
  (
    'funprepi-teste-orgao-45',
    'TESTE_FUNPREPI',
    'teste',
    'informativa',
    1,
    'Indício sintético fora do escopo',
    'Fixture transacional',
    -209945,
    45,
    '{}'::jsonb,
    array['https://example.invalid/funprepi-test'],
    'teste-1',
    true
  )
on conflict (chave) do update
set
  contrato_id = excluded.contrato_id,
  orgao_id = excluded.orgao_id,
  ativo = excluded.ativo,
  atualizado_em = now();

do $$
declare
  painel jsonb;
  ano_teste jsonb;
begin
  select public.funprepi_dashboard() into painel;

  if painel->>'divida_status' is distinct from 'nao_publicada' then
    raise exception 'status da divida incorreto: %', painel;
  end if;

  if (painel->>'orgao_id')::integer <> 44 then
    raise exception 'painel consultou orgao diferente de 44';
  end if;

  if jsonb_array_length(painel->'serie_anual') = 0 then
    raise exception 'serie anual vazia';
  end if;

  select item
  into ano_teste
  from jsonb_array_elements(painel->'serie_anual') item
  where item->>'ano' = '2099';

  if ano_teste->>'status' is distinct from 'reconciliado'
    or (ano_teste->>'empenhos_novo')::integer <> 1
    or (ano_teste->>'pago_novo')::numeric <> 100
  then
    raise exception
      'reconciliacao incluiu registros posteriores ao corte: %',
      ano_teste;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(painel->'fornecedores_externos') item
    where upper(item->>'nome')
      like '%FUNDO DE PREVIDENCIA SOCIAL DE PIRACANJUBA%'
  ) then
    raise exception 'o proprio fundo apareceu como fornecedor externo';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(
      (painel->'fornecedores_externos') || (painel->'contratos')
    ) item
    where coalesce(item->>'documento', '') ~ '^\d{11}$'
       or coalesce(item->>'chave', '') ~ '^\d{11}$'
  ) then
    raise exception 'o payload publico expos CPF integral';
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(painel->'contratos') item
    where item->>'id' = '-209944'
      and item->>'documento' is null
  ) then
    raise exception 'contrato PF do orgao 44 nao foi sanitizado';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(painel->'contratos') item
    where item->>'id' = '-209945'
  ) then
    raise exception 'contrato de outro orgao apareceu no painel';
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(painel->'indicios') item
    where item->>'chave' = 'funprepi-teste-orgao-44'
  ) or exists (
    select 1
    from jsonb_array_elements(painel->'indicios') item
    where item->>'chave' = 'funprepi-teste-orgao-45'
  ) then
    raise exception 'isolamento de indicios por orgao falhou';
  end if;
end;
$$;

rollback;
