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
    'BENEFICIO TESTE',
    44,
    'APOSENTADORIA',
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
end;
$$;

rollback;
