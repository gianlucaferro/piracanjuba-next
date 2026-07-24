-- Painel publico do FUNPREPI, com reconciliacao entre o portal historico e
-- a carga canonica do NucleoGov. Nenhum valor de divida e inferido.

create table if not exists public.funprepi_referencia_anual (
  ano integer primary key check (ano between 2000 and 2100),
  periodo_fim date not null,
  quantidade_empenhos integer not null check (quantidade_empenhos >= 0),
  valor_pago numeric not null check (valor_pago >= 0),
  fonte_url text not null,
  verificado_em date not null
);

create table if not exists public.funprepi_evidencias (
  chave text primary key,
  titulo text not null,
  tipo text not null,
  data_referencia date,
  valor numeric,
  unidade text,
  situacao text not null,
  descricao text not null,
  orgao_emissor text not null,
  fonte_url text not null,
  verificado_em date not null,
  updated_at timestamptz not null default now()
);

alter table public.funprepi_referencia_anual enable row level security;
alter table public.funprepi_evidencias enable row level security;

drop policy if exists funprepi_referencia_select_public
  on public.funprepi_referencia_anual;
create policy funprepi_referencia_select_public
  on public.funprepi_referencia_anual
  for select
  to anon, authenticated
  using (true);

drop policy if exists funprepi_evidencias_select_public
  on public.funprepi_evidencias;
create policy funprepi_evidencias_select_public
  on public.funprepi_evidencias
  for select
  to anon, authenticated
  using (true);

grant select on public.funprepi_referencia_anual to anon, authenticated;
grant select on public.funprepi_evidencias to anon, authenticated;

insert into public.funprepi_referencia_anual (
  ano,
  periodo_fim,
  quantidade_empenhos,
  valor_pago,
  fonte_url,
  verificado_em
)
values
  (2011, date '2011-12-31', 211,  3304311.94, 'https://piracanjuba.centi.com.br/despesas/orgao', date '2026-07-24'),
  (2012, date '2012-12-31', 221,  4951031.87, 'https://piracanjuba.centi.com.br/despesas/orgao', date '2026-07-24'),
  (2013, date '2013-12-31', 216,  6237186.21, 'https://piracanjuba.centi.com.br/despesas/orgao', date '2026-07-24'),
  (2014, date '2014-12-31', 183,  6482938.50, 'https://piracanjuba.centi.com.br/despesas/orgao', date '2026-07-24'),
  (2015, date '2015-12-31', 168,  7536288.72, 'https://piracanjuba.centi.com.br/despesas/orgao', date '2026-07-24'),
  (2016, date '2016-12-31', 186,  9127166.33, 'https://piracanjuba.centi.com.br/despesas/orgao', date '2026-07-24'),
  (2017, date '2017-12-31', 212, 11322968.53, 'https://piracanjuba.centi.com.br/despesas/orgao', date '2026-07-24'),
  (2018, date '2018-12-31', 190, 12773421.40, 'https://piracanjuba.centi.com.br/despesas/orgao', date '2026-07-24'),
  (2019, date '2019-12-31', 159, 13454083.89, 'https://piracanjuba.centi.com.br/despesas/orgao', date '2026-07-24'),
  (2020, date '2020-12-31', 142, 14048627.67, 'https://piracanjuba.centi.com.br/despesas/orgao', date '2026-07-24'),
  (2021, date '2021-12-31',  88, 15298593.47, 'https://piracanjuba.centi.com.br/despesas/orgao', date '2026-07-24'),
  (2022, date '2022-12-31',  58, 20379398.01, 'https://piracanjuba.centi.com.br/despesas/orgao', date '2026-07-24'),
  (2023, date '2023-12-31',  59, 21895905.02, 'https://piracanjuba.centi.com.br/despesas/orgao', date '2026-07-24'),
  (2024, date '2024-12-31',  65, 25616657.76, 'https://piracanjuba.centi.com.br/despesas/orgao', date '2026-07-24'),
  (2025, date '2025-12-31',  51, 25915991.10, 'https://piracanjuba.centi.com.br/despesas/orgao', date '2026-07-24'),
  (2026, date '2026-06-30',  24, 14162219.41, 'https://piracanjuba.centi.com.br/despesas/orgao', date '2026-07-24')
on conflict (ano) do update
set
  periodo_fim = excluded.periodo_fim,
  quantidade_empenhos = excluded.quantidade_empenhos,
  valor_pago = excluded.valor_pago,
  fonte_url = excluded.fonte_url,
  verificado_em = excluded.verificado_em;

insert into public.funprepi_evidencias (
  chave,
  titulo,
  tipo,
  data_referencia,
  valor,
  unidade,
  situacao,
  descricao,
  orgao_emissor,
  fonte_url,
  verificado_em
)
values
  (
    'tcm-acordao-consulta-15-2019',
    'Déficit atuarial e plano de amortização confirmados',
    'acordao',
    date '2019-08-01',
    null,
    null,
    'deficit_atuarial_confirmado',
    'A consulta do Município ao TCM-GO trata de aportes periódicos e contribuição suplementar para cobertura do déficit atuarial do RPPS. O acórdão não informa o saldo atual da dívida.',
    'Tribunal de Contas dos Municípios do Estado de Goiás',
    'https://www.tcm.go.gov.br/site/wp-content/uploads/2019/08/AC-CONS-015-2019-processo-17680-18-Piracanjuba-CONSULTA.-REQUISITOS-DE-ADMISSIBILIDADE-ATENDIDOS.-RPPS.-PLANO-DE-AMORTIZA%C3%87%C3%83O.-APORTE-PER%C3%8DODO-DE-RECURSOS.pdf',
    date '2026-07-24'
  ),
  (
    'saldo-divida-atual-nao-publicado',
    'Saldo atual da dívida não localizado',
    'lacuna_documental',
    date '2026-07-24',
    null,
    null,
    'nao_publicado',
    'As fontes consultadas confirmam o déficit atuarial, mas não oferecem um documento recente com o saldo atual da obrigação da Prefeitura, data-base e metodologia.',
    'Piracanjuba.ai',
    'https://piracanjuba.go.gov.br/',
    date '2026-07-24'
  )
on conflict (chave) do update
set
  titulo = excluded.titulo,
  tipo = excluded.tipo,
  data_referencia = excluded.data_referencia,
  valor = excluded.valor,
  unidade = excluded.unidade,
  situacao = excluded.situacao,
  descricao = excluded.descricao,
  orgao_emissor = excluded.orgao_emissor,
  fonte_url = excluded.fonte_url,
  verificado_em = excluded.verificado_em,
  updated_at = now();

create or replace function public.funprepi_dashboard()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with
base as (
  select
    e.*,
    case
      when unaccent(upper(
        coalesce(e.elemento, '') || ' ' || coalesce(e.historico, '')
      )) ~ '(APOSENTADOR|INATIV)' then 'aposentadorias'
      when unaccent(upper(
        coalesce(e.elemento, '') || ' ' || coalesce(e.historico, '')
      )) ~ '(PENSAO|PENSOES|PENSIONISTA)' then 'pensoes'
      when unaccent(upper(
        coalesce(e.elemento, '') || ' ' || coalesce(e.historico, '')
      )) ~ '(TARIFA|BANCARI)' then 'tarifas'
      when unaccent(upper(coalesce(e.fornecedor_nome, ''))) like '%FUNPREPI%'
        or unaccent(upper(coalesce(e.fornecedor_nome, '')))
          like '%FUNDO DE PREVIDENCIA SOCIAL DE PIRACANJUBA%'
        then 'outros'
      else 'fornecedor_externo'
    end as tipo_despesa
  from public.prefeitura_empenhos e
  where e.orgao_id = 44
),
limites as (
  select
    min(data) as periodo_inicio,
    max(data) as periodo_fim,
    max(updated_at) as atualizado_em,
    extract(year from max(data))::integer as ano_atual
  from base
),
resumo as (
  select
    count(*) as empenhos,
    coalesce(sum(valor_empenhado), 0) as empenhado,
    coalesce(sum(valor_anulacao), 0) as anulado,
    coalesce(sum(valor_liquidado), 0) as liquidado,
    coalesce(sum(valor_pago), 0) as pago,
    coalesce(sum(saldo_pagar), 0) as saldo_pagar
  from base
),
anual_novo as (
  select
    extract(year from data)::integer as ano,
    count(*) as empenhos,
    coalesce(sum(valor_empenhado), 0) as empenhado,
    coalesce(sum(valor_anulacao), 0) as anulado,
    coalesce(sum(valor_liquidado), 0) as liquidado,
    coalesce(sum(valor_pago), 0) as pago,
    coalesce(sum(saldo_pagar), 0) as saldo_pagar
  from base
  where data is not null
  group by 1
),
anos as (
  select ano from public.funprepi_referencia_anual
  union
  select ano from anual_novo
),
serie_anual as (
  select
    anos.ano,
    referencia.periodo_fim as periodo_fim_referencia,
    coalesce(novo.empenhos, 0) as empenhos_novo,
    coalesce(referencia.quantidade_empenhos, 0) as empenhos_referencia,
    coalesce(novo.empenhado, 0) as empenhado_novo,
    coalesce(novo.anulado, 0) as anulado_novo,
    coalesce(novo.liquidado, 0) as liquidado_novo,
    coalesce(novo.pago, 0) as pago_novo,
    coalesce(referencia.valor_pago, 0) as pago_referencia,
    coalesce(novo.saldo_pagar, 0) as saldo_pagar_novo,
    referencia.fonte_url as fonte_referencia,
    case
      when referencia.ano is null then 'sem_referencia'
      when coalesce(novo.empenhos, 0) = 0 then 'ausente'
      when novo.empenhos < referencia.quantidade_empenhos then 'parcial'
      when novo.empenhos <> referencia.quantidade_empenhos then 'divergente'
      when abs(novo.pago - referencia.valor_pago) <= 1 then 'reconciliado'
      else 'divergente'
    end as status
  from anos
  left join anual_novo novo using (ano)
  left join public.funprepi_referencia_anual referencia using (ano)
),
mensal as (
  select
    extract(month from b.data)::integer as mes,
    coalesce(sum(b.valor_pago) filter (
      where b.tipo_despesa = 'aposentadorias'
    ), 0) as aposentadorias,
    coalesce(sum(b.valor_pago) filter (
      where b.tipo_despesa = 'pensoes'
    ), 0) as pensoes,
    coalesce(sum(b.valor_pago) filter (
      where b.tipo_despesa = 'tarifas'
    ), 0) as tarifas,
    coalesce(sum(b.valor_pago) filter (
      where b.tipo_despesa = 'fornecedor_externo'
    ), 0) as fornecedores_externos,
    coalesce(sum(b.valor_pago) filter (
      where b.tipo_despesa = 'outros'
    ), 0) as outros
  from base b
  cross join limites l
  where extract(year from b.data)::integer = l.ano_atual
  group by 1
),
composicao as (
  select
    tipo_despesa as categoria,
    count(*) as empenhos,
    coalesce(sum(valor_pago), 0) as valor
  from base
  group by tipo_despesa
),
fornecedores_agrupados as (
  select
    coalesce(
      nullif(fornecedor_documento_digitos, ''),
      unaccent(upper(trim(regexp_replace(
        coalesce(fornecedor_nome, ''),
        '\s+',
        ' ',
        'g'
      ))))
    ) as chave,
    max(fornecedor_nome) as nome,
    max(nullif(fornecedor_documento_digitos, '')) as documento,
    count(*) as empenhos,
    coalesce(sum(valor_pago), 0) as valor_pago,
    min(extract(year from data)::integer) as primeiro_ano,
    max(extract(year from data)::integer) as ultimo_ano
  from base
  where tipo_despesa = 'fornecedor_externo'
    and fornecedor_nome is not null
  group by 1
),
fornecedores_top as (
  select *
  from fornecedores_agrupados
  order by valor_pago desc, nome
  limit 12
),
contratos_top as (
  select
    c.id,
    c.numero,
    c.ano,
    c.valor,
    c.fornecedor_nome,
    c.fornecedor_documento_digitos as documento,
    c.objeto,
    c.fiscal_contrato,
    c.situacao,
    c.licitacao_id,
    c.fonte_url,
    f.razao_social,
    f.data_abertura,
    f.situacao_cadastral
  from public.prefeitura_contratos c
  left join public.fornecedores_cnpj f
    on f.cnpj = c.fornecedor_documento_digitos
  where c.orgao_id = 44
  order by c.ano desc nulls last, c.valor desc nulls last, c.id desc
  limit 15
),
indicios_top as (
  select
    chave,
    regra,
    categoria,
    severidade,
    score,
    titulo,
    descricao,
    contrato_id,
    fornecedor_cnpj,
    periodo_inicio,
    periodo_fim,
    fonte_urls
  from public.indicio_contratacao
  where orgao_id = 44
    and ativo
  order by score desc, atualizado_em desc
  limit 12
),
comparativo as (
  select
    l.ano_atual,
    l.periodo_fim,
    coalesce(sum(b.valor_pago) filter (
      where extract(year from b.data)::integer = l.ano_atual
        and b.data <= l.periodo_fim
    ), 0) as pago_periodo_atual,
    coalesce(sum(b.valor_pago) filter (
      where extract(year from b.data)::integer = l.ano_atual - 1
        and b.data <= (l.periodo_fim - interval '1 year')::date
    ), 0) as pago_periodo_anterior
  from limites l
  left join base b on true
  group by l.ano_atual, l.periodo_fim
)
select jsonb_build_object(
  'orgao_id', 44,
  'divida_status', 'nao_publicada',
  'divida_valor', null,
  'periodo_inicio', limites.periodo_inicio,
  'periodo_fim', limites.periodo_fim,
  'atualizado_em', limites.atualizado_em,
  'ano_atual', limites.ano_atual,
  'resumo', jsonb_build_object(
    'empenhos', resumo.empenhos,
    'empenhado', resumo.empenhado,
    'anulado', resumo.anulado,
    'liquidado', resumo.liquidado,
    'pago', resumo.pago,
    'saldo_pagar', resumo.saldo_pagar,
    'pago_periodo_atual', comparativo.pago_periodo_atual,
    'pago_periodo_anterior', comparativo.pago_periodo_anterior
  ),
  'serie_anual', coalesce((
    select jsonb_agg(to_jsonb(s) order by s.ano)
    from serie_anual s
  ), '[]'::jsonb),
  'serie_mensal', coalesce((
    select jsonb_agg(to_jsonb(m) order by m.mes)
    from mensal m
  ), '[]'::jsonb),
  'composicao', coalesce((
    select jsonb_agg(to_jsonb(c) order by c.valor desc)
    from composicao c
  ), '[]'::jsonb),
  'fornecedores_externos', coalesce((
    select jsonb_agg(to_jsonb(f) order by f.valor_pago desc)
    from fornecedores_top f
  ), '[]'::jsonb),
  'contratos', coalesce((
    select jsonb_agg(to_jsonb(c) order by c.ano desc nulls last)
    from contratos_top c
  ), '[]'::jsonb),
  'indicios', coalesce((
    select jsonb_agg(to_jsonb(i) order by i.score desc)
    from indicios_top i
  ), '[]'::jsonb),
  'evidencias', coalesce((
    select jsonb_agg(to_jsonb(e) order by e.data_referencia desc nulls last)
    from public.funprepi_evidencias e
  ), '[]'::jsonb)
)
from limites
cross join resumo
cross join comparativo;
$$;

revoke all on function public.funprepi_dashboard() from public;
grant execute on function public.funprepi_dashboard() to anon, authenticated;

-- A serie historica do portal comeca em 2011. As quatro janelas entram na
-- mesma fila idempotente e serao processadas pelo cron existente, sem
-- sobrepor chamadas ao portal.
insert into public.prefeitura_empenhos_backfill_fila (
  scope,
  data_inicio,
  data_fim,
  prioridade
)
values
  ('01/01/2011:31/03/2011', date '2011-01-01', date '2011-03-31', 110),
  ('01/04/2011:30/06/2011', date '2011-04-01', date '2011-06-30', 110),
  ('01/07/2011:30/09/2011', date '2011-07-01', date '2011-09-30', 110),
  ('01/10/2011:31/12/2011', date '2011-10-01', date '2011-12-31', 110)
on conflict (scope) do update
set
  prioridade = greatest(
    public.prefeitura_empenhos_backfill_fila.prioridade,
    excluded.prioridade
  ),
  updated_at = now();
