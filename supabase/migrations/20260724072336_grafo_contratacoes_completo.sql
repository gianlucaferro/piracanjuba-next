-- Camada de arestas pronta para consumo por consultas SQL ou banco de grafos.
-- Mantem a view base e acrescenta fiscais e pagamentos por fornecedor.
create or replace view public.v_grafo_contratacoes_arestas_completas
with (security_invoker = true) as
select
  origem,
  relacao,
  destino,
  data_evento,
  valor,
  fonte_url
from public.v_grafo_contratacoes_arestas

union all

select distinct
  'servidor:' || upper(
    trim(regexp_replace(unaccent(coalesce(f.fiscal_nome, '')), '\s+', ' ', 'g'))
  ) as origem,
  'FISCALIZA'::text as relacao,
  'contrato:' || f.portal_key::text as destino,
  f.data_publicacao as data_evento,
  null::numeric as valor,
  f.fonte_url
from public.prefeitura_fiscais_contratos f
where f.fiscal_nome is not null
  and exists (
    select 1
    from public.prefeitura_contratos c
    where c.id = f.portal_key
  )

union all

select
  'empresa:' || coalesce(
    p.fornecedor_documento_digitos,
    upper(trim(regexp_replace(unaccent(p.fornecedor_nome), '\s+', ' ', 'g')))
  ),
  'RECEBE_PAGAMENTO',
  'pagamento:' || p.chave,
  p.data_pagamento,
  p.valor_pago,
  p.fonte_url
from public.prefeitura_pagamentos_ordem p;

grant select on public.v_grafo_contratacoes_arestas_completas
  to anon, authenticated;
