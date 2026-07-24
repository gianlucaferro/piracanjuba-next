-- Compara cada fotografia historica somente ate a data final declarada pela
-- propria referencia. Os demais agregados continuam usando toda a carga nova.

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
    extract(year from b.data)::integer as ano,
    count(*) as empenhos,
    coalesce(sum(b.valor_empenhado), 0) as empenhado,
    coalesce(sum(b.valor_anulacao), 0) as anulado,
    coalesce(sum(b.valor_liquidado), 0) as liquidado,
    coalesce(sum(b.valor_pago), 0) as pago,
    coalesce(sum(b.saldo_pagar), 0) as saldo_pagar
  from base b
  left join public.funprepi_referencia_anual referencia
    on referencia.ano = extract(year from b.data)::integer
  where b.data is not null
    and (
      referencia.ano is null
      or b.data <= referencia.periodo_fim
    )
  group by 1
),
anos as (
  select ano from public.funprepi_referencia_anual
  union
  select extract(year from data)::integer as ano
  from base
  where data is not null
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
      nullif(
        case
          when length(fornecedor_documento_digitos) = 14
            then fornecedor_documento_digitos
        end,
        ''
      ),
      unaccent(upper(trim(regexp_replace(
        coalesce(fornecedor_nome, ''),
        '\s+',
        ' ',
        'g'
      ))))
    ) as chave,
    max(fornecedor_nome) as nome,
    max(
      case
        when length(fornecedor_documento_digitos) = 14
          then fornecedor_documento_digitos
      end
    ) as documento,
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
    case
      when length(c.fornecedor_documento_digitos) = 14
        then c.fornecedor_documento_digitos
    end as documento,
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
