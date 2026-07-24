-- Uma identidade textual unica evita dividir o mesmo fornecedor por acentos
-- ou espacos quando o CPF ou CNPJ nao esta disponivel.
create or replace view public.v_grafo_contratacoes_arestas
with (security_invoker = true) as
select
  'empresa:' || coalesce(
    c.fornecedor_documento_digitos,
    upper(trim(regexp_replace(
      unaccent(coalesce(c.fornecedor_nome, '')),
      '\s+',
      ' ',
      'g'
    )))
  ) as origem,
  'FORNECE_EM'::text as relacao,
  'contrato:' || c.id::text as destino,
  c.data_firmatura as data_evento,
  c.valor as valor,
  c.fonte_url
from public.prefeitura_contratos c
where c.fornecedor_nome is not null

union all

select
  'licitacao:' || c.licitacao_id::text,
  'ORIGINA',
  'contrato:' || c.id::text,
  c.data_firmatura,
  c.valor,
  c.fonte_url
from public.prefeitura_contratos c
where c.licitacao_id is not null

union all

select
  'contrato:' || a.contrato_id::text,
  'RECEBE_ADITIVO',
  'aditivo:' || a.id::text,
  a.data_termo,
  a.valor,
  a.fonte_url
from public.prefeitura_aditivos a

union all

select
  'empresa:' || coalesce(
    e.fornecedor_documento_digitos,
    upper(trim(regexp_replace(
      unaccent(coalesce(e.fornecedor_nome, '')),
      '\s+',
      ' ',
      'g'
    )))
  ),
  'RECEBE_EMPENHO',
  'empenho:' || e.id::text,
  e.data,
  e.valor_empenhado,
  e.fonte_url
from public.prefeitura_empenhos e
where e.fornecedor_nome is not null

union all

select
  'licitacao:' || e.licitacao_id::text,
  'GERA_EMPENHO',
  'empenho:' || e.id::text,
  e.data,
  e.valor_empenhado,
  e.fonte_url
from public.prefeitura_empenhos e
where e.licitacao_id is not null

union all

select
  'empenho:' || vinculo.id::text,
  'RECEBE_PAGAMENTO',
  'pagamento:' || p.chave,
  p.data_pagamento,
  p.valor_pago,
  p.fonte_url
from public.prefeitura_pagamentos_ordem p
join lateral (
  select empenho.id
  from public.prefeitura_empenhos empenho
  where regexp_replace(coalesce(empenho.numero, ''), '[^0-9]', '', 'g') =
      regexp_replace(coalesce(p.numero_empenho, ''), '[^0-9]', '', 'g')
    and (
      empenho.fornecedor_documento_digitos = p.fornecedor_documento_digitos
      or (
        empenho.fornecedor_documento_digitos is null
        and p.fornecedor_documento_digitos is null
        and upper(trim(regexp_replace(
          unaccent(coalesce(empenho.fornecedor_nome, '')),
          '\s+',
          ' ',
          'g'
        ))) = upper(trim(regexp_replace(
          unaccent(coalesce(p.fornecedor_nome, '')),
          '\s+',
          ' ',
          'g'
        )))
      )
    )
  order by
    abs(coalesce(p.data_pagamento, p.data_atesto, empenho.data) - empenho.data),
    empenho.id
  limit 1
) vinculo on true

union all

select
  'empenho:' || d.empenho_id::text,
  'FINANCIA_DIARIA',
  'diaria:' || d.chave,
  d.data_inicio,
  d.valor,
  d.fonte_url
from public.prefeitura_diarias_nucleogov d;

grant select on public.v_grafo_contratacoes_arestas to anon, authenticated;

create or replace view public.v_grafo_contratacoes_arestas_completas
with (security_invoker = true) as
select origem, relacao, destino, data_evento, valor, fonte_url
from public.v_grafo_contratacoes_arestas

union all

select distinct
  -- A fonte nao fornece CPF, matricula ou ID do fiscal. A chave do registro
  -- preserva a evidencia sem afirmar que homonimos sao a mesma pessoa.
  'fiscal-origem:' || f.chave,
  'FISCALIZA',
  'contrato:' || f.portal_key::text,
  f.data_publicacao,
  null::numeric,
  f.fonte_url
from public.prefeitura_fiscais_contratos f
where f.fiscal_nome is not null
  and exists (
    select 1 from public.prefeitura_contratos c where c.id = f.portal_key
  )

union all

select
  'empresa:' || coalesce(
    p.fornecedor_documento_digitos,
    upper(trim(regexp_replace(
      unaccent(p.fornecedor_nome),
      '\s+',
      ' ',
      'g'
    )))
  ),
  'RECEBE_PAGAMENTO',
  'pagamento:' || p.chave,
  p.data_pagamento,
  p.valor_pago,
  p.fonte_url
from public.prefeitura_pagamentos_ordem p;

grant select on public.v_grafo_contratacoes_arestas_completas
  to anon, authenticated;
