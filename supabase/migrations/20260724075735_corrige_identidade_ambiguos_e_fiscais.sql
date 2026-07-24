-- A primeira migracao de identidade associou por nome registros legados ao
-- menor portal_id. Quando o portal possui dois IDs para o mesmo nome, essa
-- atribuicao nao e demonstravel. Preservamos o historico em uma identidade
-- legada explicitamente ambigua e mantemos cada ID NucleoGov separado.
with nomes_ambiguos as (
  select nome_normalizado
  from public.prefeitura_folha_nucleogov
  group by nome_normalizado
  having count(distinct portal_id) > 1
),
servidores_afetados as (
  select distinct s.*
  from public.servidores s
  join nomes_ambiguos a
    on lower(trim(regexp_replace(unaccent(s.nome), '\s+', ' ', 'g'))) =
      lower(a.nome_normalizado)
  where s.orgao_tipo = 'prefeitura'
    and s.nucleogov_portal_id is not null
    and exists (
      select 1
      from public.remuneracao_servidores r
      where r.servidor_id = s.id
        and coalesce(r.fonte_url, '') not like
          'https://acessoainformacao.piracanjuba.go.gov.br/%'
    )
)
insert into public.servidores (
  nome,
  cargo,
  secretaria_id,
  fonte_url,
  updated_at,
  orgao_tipo,
  nucleogov_portal_id,
  origem_chave
)
select
  s.nome,
  s.cargo,
  s.secretaria_id,
  s.fonte_url,
  now(),
  'prefeitura',
  null,
  'prefeitura:legado-ambiguo:' || s.id::text
from servidores_afetados s
on conflict (origem_chave) do update
set
  nome = excluded.nome,
  cargo = excluded.cargo,
  updated_at = now();

with nomes_ambiguos as (
  select nome_normalizado
  from public.prefeitura_folha_nucleogov
  group by nome_normalizado
  having count(distinct portal_id) > 1
),
movimentos as (
  select
    canonico.id as canonico_id,
    legado.id as legado_id
  from public.servidores canonico
  join nomes_ambiguos a
    on lower(trim(regexp_replace(unaccent(canonico.nome), '\s+', ' ', 'g'))) =
      lower(a.nome_normalizado)
  join public.servidores legado
    on legado.origem_chave =
      'prefeitura:legado-ambiguo:' || canonico.id::text
  where canonico.orgao_tipo = 'prefeitura'
    and canonico.nucleogov_portal_id is not null
)
update public.remuneracao_servidores r
set
  servidor_id = movimentos.legado_id,
  updated_at = now()
from movimentos
where r.servidor_id = movimentos.canonico_id
  and coalesce(r.fonte_url, '') not like
    'https://acessoainformacao.piracanjuba.go.gov.br/%';

-- Sem identificador do fiscal na fonte, o grafo deve representar a evidencia
-- do registro, nao afirmar identidade pessoal apenas pela igualdade do nome.
create or replace view public.v_grafo_contratacoes_arestas_completas
with (security_invoker = true) as
select origem, relacao, destino, data_evento, valor, fonte_url
from public.v_grafo_contratacoes_arestas

union all

select distinct
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

do $$
begin
  if exists (
    with nomes_ambiguos as (
      select nome_normalizado
      from public.prefeitura_folha_nucleogov
      group by nome_normalizado
      having count(distinct portal_id) > 1
    )
    select 1
    from public.servidores s
    join nomes_ambiguos a
      on lower(trim(regexp_replace(unaccent(s.nome), '\s+', ' ', 'g'))) =
        lower(a.nome_normalizado)
    join public.remuneracao_servidores r on r.servidor_id = s.id
    where s.nucleogov_portal_id is not null
      and coalesce(r.fonte_url, '') not like
        'https://acessoainformacao.piracanjuba.go.gov.br/%'
  ) then
    raise exception
      'historico legado ainda atribuido a identidade NucleoGov ambigua';
  end if;
end
$$;
