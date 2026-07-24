-- Regras deterministicas de indicios.
-- Versao aplicada em producao: 20260724170033.
-- Cada registro representa um ponto de partida para auditoria, nunca uma
-- conclusao de ilegalidade ou corrupcao.

create table if not exists public.indicio_contratacao (
  chave text primary key,
  regra text not null,
  categoria text not null,
  severidade text not null check (
    severidade in ('informativa', 'baixa', 'media', 'alta', 'critica')
  ),
  score integer not null check (score between 0 and 100),
  titulo text not null,
  descricao text not null,
  sujeito_no text,
  contrato_id bigint,
  fornecedor_cnpj text,
  orgao_id integer,
  periodo_inicio date,
  periodo_fim date,
  evidencias jsonb not null,
  fonte_urls text[] not null default '{}',
  regra_versao text not null,
  ativo boolean not null default true,
  detectado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (
    fornecedor_cnpj is null
    or fornecedor_cnpj ~ '^[0-9]{14}$'
  )
);

create index if not exists indicio_contratacao_regra_idx
  on public.indicio_contratacao (regra, severidade)
  where ativo;
create index if not exists indicio_contratacao_fornecedor_idx
  on public.indicio_contratacao (fornecedor_cnpj)
  where ativo and fornecedor_cnpj is not null;
create index if not exists indicio_contratacao_contrato_idx
  on public.indicio_contratacao (contrato_id)
  where ativo and contrato_id is not null;

create table if not exists public.cobertura_regra_investigativa (
  regra text primary key,
  status text not null check (
    status in ('disponivel', 'parcial', 'indisponivel')
  ),
  motivo text not null,
  metricas jsonb not null default '{}'::jsonb,
  fonte text,
  atualizado_em timestamptz not null default now()
);

alter table public.indicio_contratacao enable row level security;
alter table public.cobertura_regra_investigativa enable row level security;

drop policy if exists indicios_publicos on public.indicio_contratacao;
create policy indicios_publicos
  on public.indicio_contratacao
  for select to anon, authenticated
  using (ativo);

drop policy if exists cobertura_regras_publica
  on public.cobertura_regra_investigativa;
create policy cobertura_regras_publica
  on public.cobertura_regra_investigativa
  for select to anon, authenticated
  using (true);

grant select on public.indicio_contratacao,
  public.cobertura_regra_investigativa
  to anon, authenticated;

create or replace view public.v_indicios_contratacao
with (security_invoker = true) as
select
  indicio.*,
  case
    when severidade in ('critica', 'alta') then 1
    when severidade = 'media' then 2
    when severidade = 'baixa' then 3
    else 4
  end as ordem_severidade
from public.indicio_contratacao indicio
where ativo;

create or replace view public.v_resumo_indicios_contratacao
with (security_invoker = true) as
select
  regra,
  categoria,
  severidade,
  count(*) as quantidade,
  round(avg(score), 1) as score_medio,
  max(atualizado_em) as atualizado_em
from public.indicio_contratacao
where ativo
group by regra, categoria, severidade;

grant select on public.v_indicios_contratacao,
  public.v_resumo_indicios_contratacao
  to anon, authenticated;

create or replace function public.recalcular_indicios_contratacao()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  total_ativos integer;
  por_regra jsonb;
begin
  update public.indicio_contratacao
  set ativo = false, atualizado_em = now();

  -- Aditivos acima de 25% do valor original.
  with aditivos as (
    select
      contrato.id as contrato_id,
      contrato.fornecedor_documento_digitos as cnpj,
      contrato.orgao_id,
      contrato.valor as valor_contrato,
      coalesce(sum(aditivo.valor), 0) as valor_aditivos,
      count(*) as quantidade_aditivos,
      min(aditivo.data_termo) as primeira_data,
      max(aditivo.data_termo) as ultima_data,
      contrato.fonte_url,
      array_remove(
        array_agg(distinct aditivo.fonte_url),
        null
      ) as fontes_aditivos
    from public.prefeitura_contratos contrato
    join public.prefeitura_aditivos aditivo
      on aditivo.contrato_id = contrato.id
    where contrato.valor >= 1000
      and aditivo.valor is not null
      and aditivo.valor > 0
      and coalesce(aditivo.tipo_aditivo, '') !~* '^Prazo$'
    group by
      contrato.id,
      contrato.fornecedor_documento_digitos,
      contrato.orgao_id,
      contrato.valor,
      contrato.fonte_url
  )
  insert into public.indicio_contratacao (
    chave,
    regra,
    categoria,
    severidade,
    score,
    titulo,
    descricao,
    sujeito_no,
    contrato_id,
    fornecedor_cnpj,
    orgao_id,
    periodo_inicio,
    periodo_fim,
    evidencias,
    fonte_urls,
    regra_versao,
    ativo,
    atualizado_em
  )
  select
    'aditivos-elevados:' || contrato_id::text,
    'ADITIVOS_ELEVADOS',
    'execucao_contratual',
    case
      when valor_aditivos / valor_contrato >= 1 then 'alta'
      else 'media'
    end,
    least(
      75,
      round(40 + 20 * (valor_aditivos / valor_contrato))::integer
    ),
    'Aditivos relevantes no contrato',
    'A soma dos valores publicados nos aditivos fica entre 25% e 200% do valor original. O portal pode misturar valores mensais e totais, portanto os documentos de cada termo precisam ser conferidos antes de qualquer conclusao.',
    'contrato:' || contrato_id::text,
    contrato_id,
    case when cnpj ~ '^[0-9]{14}$' then cnpj end,
    orgao_id,
    primeira_data,
    ultima_data,
    jsonb_build_object(
      'valor_contrato', valor_contrato,
      'valor_aditivos', valor_aditivos,
      'percentual', round(100 * valor_aditivos / valor_contrato, 2),
      'quantidade_aditivos', quantidade_aditivos
    ),
    array_prepend(fonte_url, fontes_aditivos),
    'aditivos-v1',
    true,
    now()
  from aditivos
  where valor_aditivos / valor_contrato between 0.25 and 2
  on conflict (chave) do update
  set
    severidade = excluded.severidade,
    score = excluded.score,
    descricao = excluded.descricao,
    fornecedor_cnpj = excluded.fornecedor_cnpj,
    periodo_inicio = excluded.periodo_inicio,
    periodo_fim = excluded.periodo_fim,
    evidencias = excluded.evidencias,
    fonte_urls = excluded.fonte_urls,
    regra_versao = excluded.regra_versao,
    ativo = true,
    atualizado_em = now();

  -- Empresa aberta menos de 180 dias antes do contrato.
  with contratos_recentes as (
    select
      contrato.id as contrato_id,
      contrato.fornecedor_documento_digitos as cnpj,
      contrato.orgao_id,
      contrato.valor,
      fornecedor.data_abertura,
      coalesce(
        contrato.data_firmatura,
        contrato.vigencia_inicio,
        contrato.data_publicacao
      ) as data_contrato,
      contrato.fonte_url,
      fornecedor.razao_social
    from public.prefeitura_contratos contrato
    join public.fornecedores_cnpj fornecedor
      on fornecedor.cnpj = contrato.fornecedor_documento_digitos
    where fornecedor.data_abertura is not null
      and coalesce(
        contrato.data_firmatura,
        contrato.vigencia_inicio,
        contrato.data_publicacao
      ) is not null
  )
  insert into public.indicio_contratacao (
    chave,
    regra,
    categoria,
    severidade,
    score,
    titulo,
    descricao,
    sujeito_no,
    contrato_id,
    fornecedor_cnpj,
    orgao_id,
    periodo_inicio,
    periodo_fim,
    evidencias,
    fonte_urls,
    regra_versao,
    ativo,
    atualizado_em
  )
  select
    'empresa-recente:' || contrato_id::text,
    'EMPRESA_RECENTE',
    'perfil_fornecedor',
    case
      when data_contrato - data_abertura <= 90 and coalesce(valor, 0) >= 100000
        then 'alta'
      else 'media'
    end,
    case
      when data_contrato - data_abertura <= 90 and coalesce(valor, 0) >= 100000
        then 78
      else 58
    end,
    'Empresa recente na data do contrato',
    'O CNPJ foi aberto menos de seis meses antes da contratacao. Isso nao e irregular por si so, mas merece verificacao de capacidade operacional e experiencia.',
    'contrato:' || contrato_id::text,
    contrato_id,
    cnpj,
    orgao_id,
    data_abertura,
    data_contrato,
    jsonb_build_object(
      'razao_social', razao_social,
      'data_abertura', data_abertura,
      'data_contrato', data_contrato,
      'idade_dias', data_contrato - data_abertura,
      'valor_contrato', valor
    ),
    array[fonte_url],
    'empresa-recente-v1',
    true,
    now()
  from contratos_recentes
  where data_contrato >= data_abertura
    and data_contrato - data_abertura < 180
  on conflict (chave) do update
  set
    severidade = excluded.severidade,
    score = excluded.score,
    evidencias = excluded.evidencias,
    ativo = true,
    atualizado_em = now();

  -- Concentracao por fornecedor, orgao e ano.
  with fornecedores as (
    select
      contrato.ano,
      contrato.orgao_id,
      contrato.fornecedor_documento_digitos as cnpj,
      count(*) as quantidade_contratos,
      sum(coalesce(contrato.valor, 0)) as valor_fornecedor
    from public.prefeitura_contratos contrato
    where contrato.fornecedor_documento_digitos ~ '^[0-9]{14}$'
      and contrato.ano is not null
    group by
      contrato.ano,
      contrato.orgao_id,
      contrato.fornecedor_documento_digitos
  ),
  concentracao as (
    select
      fornecedor.*,
      sum(valor_fornecedor) over (
        partition by ano, orgao_id
      ) as valor_orgao
    from fornecedores fornecedor
  )
  insert into public.indicio_contratacao (
    chave,
    regra,
    categoria,
    severidade,
    score,
    titulo,
    descricao,
    sujeito_no,
    fornecedor_cnpj,
    orgao_id,
    periodo_inicio,
    periodo_fim,
    evidencias,
    fonte_urls,
    regra_versao,
    ativo,
    atualizado_em
  )
  select
    'concentracao:' || ano::text || ':' || coalesce(orgao_id, 0)::text ||
      ':' || cnpj,
    'CONCENTRACAO_FORNECEDOR_ORGAO',
    'concentracao',
    case
      when valor_fornecedor / nullif(valor_orgao, 0) >= 0.7 then 'alta'
      else 'media'
    end,
    least(
      90,
      round(
        35 +
        60 * valor_fornecedor / nullif(valor_orgao, 0) +
        least(quantidade_contratos, 20)
      )::integer
    ),
    'Concentracao de contratos no orgao',
    'O fornecedor concentra pelo menos 40% do valor contratado pelo orgao no ano e possui cinco ou mais contratos. A analise deve considerar o mercado e o objeto contratado.',
    'empresa:' || cnpj,
    cnpj,
    orgao_id,
    make_date(ano, 1, 1),
    make_date(ano, 12, 31),
    jsonb_build_object(
      'ano', ano,
      'quantidade_contratos', quantidade_contratos,
      'valor_fornecedor', valor_fornecedor,
      'valor_total_orgao', valor_orgao,
      'participacao_percentual',
        round(100 * valor_fornecedor / nullif(valor_orgao, 0), 2)
    ),
    array[
      'https://acessoainformacao.piracanjuba.go.gov.br/cidadao/informacao/contratos_cnt'
    ],
    'concentracao-v1',
    true,
    now()
  from concentracao
  where quantidade_contratos >= 5
    and valor_orgao > 0
    and valor_fornecedor / valor_orgao >= 0.4
  on conflict (chave) do update
  set
    severidade = excluded.severidade,
    score = excluded.score,
    evidencias = excluded.evidencias,
    ativo = true,
    atualizado_em = now();

  -- Repeticao de vencedor, independentemente do orgao.
  with recorrencia as (
    select
      contrato.ano,
      contrato.fornecedor_documento_digitos as cnpj,
      count(*) as quantidade_contratos,
      count(distinct contrato.orgao_id) as quantidade_orgaos,
      sum(coalesce(contrato.valor, 0)) as valor_total
    from public.prefeitura_contratos contrato
    where contrato.fornecedor_documento_digitos ~ '^[0-9]{14}$'
      and contrato.ano is not null
    group by contrato.ano, contrato.fornecedor_documento_digitos
    having count(*) >= 10
  )
  insert into public.indicio_contratacao (
    chave,
    regra,
    categoria,
    severidade,
    score,
    titulo,
    descricao,
    sujeito_no,
    fornecedor_cnpj,
    periodo_inicio,
    periodo_fim,
    evidencias,
    fonte_urls,
    regra_versao,
    ativo,
    atualizado_em
  )
  select
    'vencedor-recorrente:' || ano::text || ':' || cnpj,
    'VENCEDOR_RECORRENTE',
    'recorrencia',
    case when quantidade_contratos >= 25 then 'media' else 'baixa' end,
    least(70, 30 + quantidade_contratos),
    'Fornecedor recorrente no ano',
    'O fornecedor aparece em dez ou mais contratos no mesmo ano. Recorrencia pode ser normal em mercados especializados e deve ser cruzada com modalidade, objeto e concorrencia.',
    'empresa:' || cnpj,
    cnpj,
    make_date(ano, 1, 1),
    make_date(ano, 12, 31),
    jsonb_build_object(
      'ano', ano,
      'quantidade_contratos', quantidade_contratos,
      'quantidade_orgaos', quantidade_orgaos,
      'valor_total', valor_total
    ),
    array[
      'https://acessoainformacao.piracanjuba.go.gov.br/cidadao/informacao/contratos_cnt'
    ],
    'recorrencia-v1',
    true,
    now()
  from recorrencia
  on conflict (chave) do update
  set
    severidade = excluded.severidade,
    score = excluded.score,
    evidencias = excluded.evidencias,
    ativo = true,
    atualizado_em = now();

  -- Concentração de contratos fiscalizados por um mesmo nome e fornecedor.
  with fiscais as (
    select
      public.normaliza_nome_investigativo(fiscal.fiscal_nome) as fiscal_nome,
      contrato.fornecedor_documento_digitos as cnpj,
      count(distinct contrato.id) as quantidade_contratos,
      sum(coalesce(contrato.valor, 0)) as valor_total,
      min(coalesce(contrato.data_firmatura, contrato.vigencia_inicio))
        as primeira_data,
      max(coalesce(contrato.data_firmatura, contrato.vigencia_inicio))
        as ultima_data
    from public.prefeitura_fiscais_contratos fiscal
    join public.prefeitura_contratos contrato
      on contrato.id = fiscal.portal_key
    where nullif(fiscal.fiscal_nome, '') is not null
      and contrato.fornecedor_documento_digitos ~ '^[0-9]{14}$'
    group by
      public.normaliza_nome_investigativo(fiscal.fiscal_nome),
      contrato.fornecedor_documento_digitos
    having count(distinct contrato.id) >= 5
  )
  insert into public.indicio_contratacao (
    chave,
    regra,
    categoria,
    severidade,
    score,
    titulo,
    descricao,
    sujeito_no,
    fornecedor_cnpj,
    periodo_inicio,
    periodo_fim,
    evidencias,
    fonte_urls,
    regra_versao,
    ativo,
    atualizado_em
  )
  select
    'fiscal-concentrado:' ||
      left(public.hash_investigativo(fiscal_nome), 24) || ':' || cnpj,
    'CONCENTRACAO_FISCAL_FORNECEDOR',
    'fiscalizacao',
    case when quantidade_contratos >= 15 then 'media' else 'baixa' end,
    least(70, 30 + 2 * quantidade_contratos),
    'Fiscal recorrente para o mesmo fornecedor',
    'O mesmo nome de fiscal aparece em pelo menos cinco contratos do fornecedor. A fonte nao oferece CPF ou matricula, portanto a igualdade de nome e uma evidencia de confianca media, nao identidade confirmada.',
    'empresa:' || cnpj,
    cnpj,
    primeira_data,
    ultima_data,
    jsonb_build_object(
      'fiscal_nome_normalizado', fiscal_nome,
      'quantidade_contratos', quantidade_contratos,
      'valor_total', valor_total,
      'criterio_identidade', 'nome_normalizado'
    ),
    array[
      'https://acessoainformacao.piracanjuba.go.gov.br/cidadao/informacao/fiscais_contratos_sg'
    ],
    'fiscal-v1',
    true,
    now()
  from fiscais
  on conflict (chave) do update
  set
    severidade = excluded.severidade,
    score = excluded.score,
    evidencias = excluded.evidencias,
    ativo = true,
    atualizado_em = now();

  -- Possivel fracionamento em dispensas: tres ou mais empenhos do mesmo
  -- fornecedor, orgao e classificacao em uma janela mensal.
  with dispensas as (
    select
      empenho.fornecedor_documento_digitos as cnpj,
      empenho.orgao_id,
      date_trunc('month', empenho.data)::date as mes,
      coalesce(
        nullif(empenho.subelemento, ''),
        nullif(empenho.elemento, ''),
        nullif(empenho.programa, ''),
        'NAO INFORMADO'
      ) as classificacao,
      count(*) as quantidade_empenhos,
      count(distinct empenho.data) as quantidade_datas,
      sum(coalesce(empenho.valor_empenhado, 0)) as valor_total,
      max(coalesce(empenho.valor_empenhado, 0)) as maior_empenho,
      min(empenho.data) as primeira_data,
      max(empenho.data) as ultima_data,
      array_agg(empenho.id order by empenho.data, empenho.id)
        as empenhos_ids
    from public.prefeitura_empenhos empenho
    where empenho.fornecedor_documento_digitos ~ '^[0-9]{14}$'
      and empenho.data is not null
      and empenho.valor_empenhado > 0
      and public.normaliza_nome_investigativo(
        empenho.licitacao_modalidade
      ) like '%DISPENSA%'
    group by
      empenho.fornecedor_documento_digitos,
      empenho.orgao_id,
      date_trunc('month', empenho.data)::date,
      coalesce(
        nullif(empenho.subelemento, ''),
        nullif(empenho.elemento, ''),
        nullif(empenho.programa, ''),
        'NAO INFORMADO'
      )
    having count(*) >= 3
      and count(distinct empenho.data) >= 2
      and sum(coalesce(empenho.valor_empenhado, 0)) >=
        1.8 * max(coalesce(empenho.valor_empenhado, 0))
  )
  insert into public.indicio_contratacao (
    chave,
    regra,
    categoria,
    severidade,
    score,
    titulo,
    descricao,
    sujeito_no,
    fornecedor_cnpj,
    orgao_id,
    periodo_inicio,
    periodo_fim,
    evidencias,
    fonte_urls,
    regra_versao,
    ativo,
    atualizado_em
  )
  select
    'fracionamento:' || cnpj || ':' || coalesce(orgao_id, 0)::text ||
      ':' || to_char(mes, 'YYYY-MM') || ':' ||
      left(public.hash_investigativo(classificacao), 16),
    'FRACIONAMENTO_POTENCIAL',
    'planejamento_compra',
    case when quantidade_empenhos >= 6 then 'alta' else 'media' end,
    least(85, 45 + 5 * quantidade_empenhos),
    'Dispensas repetidas em janela mensal',
    'Foram encontrados tres ou mais empenhos por dispensa para o mesmo fornecedor, orgao e classificacao orcamentaria no mes. A regra aponta fragmentacao temporal potencial, sem afirmar violacao de limite legal.',
    'empresa:' || cnpj,
    cnpj,
    orgao_id,
    primeira_data,
    ultima_data,
    jsonb_build_object(
      'mes', mes,
      'classificacao', classificacao,
      'quantidade_empenhos', quantidade_empenhos,
      'quantidade_datas', quantidade_datas,
      'valor_total', valor_total,
      'maior_empenho', maior_empenho,
      'empenhos_ids', empenhos_ids
    ),
    array[
      'https://acessoainformacao.piracanjuba.go.gov.br/cidadao/transparencia/despesas'
    ],
    'fracionamento-v1',
    true,
    now()
  from dispensas
  on conflict (chave) do update
  set
    severidade = excluded.severidade,
    score = excluded.score,
    periodo_inicio = excluded.periodo_inicio,
    periodo_fim = excluded.periodo_fim,
    evidencias = excluded.evidencias,
    ativo = true,
    atualizado_em = now();

  -- Empresas que compartilham socio e possuem contratos municipais.
  with empresas_contratadas as (
    select distinct relacao.origem_id as empresa_id
    from public.relacao_entidade relacao
    where relacao.relacao = 'FORNECEU_PARA'
      and relacao.ativo
  ),
  redes as (
    select
      qsa.origem_id as socio_id,
      count(distinct qsa.destino_id) as quantidade_empresas,
      jsonb_agg(
        distinct jsonb_build_object(
          'empresa_no', empresa.no_grafo,
          'cnpj', empresa.cnpj,
          'nome', empresa.nome
        )
      ) as empresas,
      bool_and(qsa.confianca = 'alta') as identificacao_documental
    from public.relacao_entidade qsa
    join empresas_contratadas contratada
      on contratada.empresa_id = qsa.destino_id
    join public.entidade_canonica empresa on empresa.id = qsa.destino_id
    where qsa.relacao = 'SOCIO_DE'
      and qsa.ativo
    group by qsa.origem_id
    having count(distinct qsa.destino_id) >= 2
  )
  insert into public.indicio_contratacao (
    chave,
    regra,
    categoria,
    severidade,
    score,
    titulo,
    descricao,
    sujeito_no,
    evidencias,
    fonte_urls,
    regra_versao,
    ativo,
    atualizado_em
  )
  select
    'rede-societaria:' || socio.id::text,
    'REDE_SOCIETARIA_COMPARTILHADA',
    'rede_societaria',
    case
      when rede.identificacao_documental then 'media'
      else 'informativa'
    end,
    case
      when rede.identificacao_documental
        then least(70, 40 + 5 * rede.quantidade_empresas)
      else 25
    end,
    'Empresas contratadas compartilham socio',
    case
      when rede.identificacao_documental
        then 'O mesmo identificador documental do QSA conecta duas ou mais empresas com contratos municipais.'
      else 'O mesmo nome normalizado aparece no QSA de duas ou mais empresas contratadas. Homonimos sao possiveis e a identidade precisa ser confirmada.'
    end,
    socio.no_grafo,
    jsonb_build_object(
      'socio_nome', socio.nome,
      'quantidade_empresas', rede.quantidade_empresas,
      'empresas', rede.empresas,
      'criterio_identidade',
        case
          when rede.identificacao_documental then 'documento_hash'
          else 'nome_normalizado'
        end
    ),
    array[
      'https://brasilapi.com.br/docs#tag/CNPJ'
    ],
    'rede-societaria-v1',
    true,
    now()
  from redes rede
  join public.entidade_canonica socio on socio.id = rede.socio_id
  on conflict (chave) do update
  set
    severidade = excluded.severidade,
    score = excluded.score,
    descricao = excluded.descricao,
    evidencias = excluded.evidencias,
    ativo = true,
    atualizado_em = now();

  -- Fornecedor com sancao vigente.
  with sancoes_ativas as (
    select
      sancao.cnpj_digitos as cnpj,
      count(*) as quantidade_sancoes,
      jsonb_agg(
        jsonb_build_object(
          'cadastro', sancao.cadastro,
          'tipo', sancao.tipo_sancao,
          'inicio', sancao.data_inicio_sancao,
          'fim', sancao.data_fim_sancao,
          'orgao', sancao.orgao_sancionador
        )
        order by sancao.data_inicio_sancao desc nulls last
      ) as sancoes
    from public.empresa_sancionada sancao
    where sancao.cnpj_digitos ~ '^[0-9]{14}$'
      and (
        sancao.data_fim_sancao is null
        or sancao.data_fim_sancao >= current_date
      )
    group by sancao.cnpj_digitos
  ),
  contratos_sancionados as (
    select
      contrato.id,
      contrato.fornecedor_documento_digitos as cnpj,
      contrato.orgao_id,
      contrato.valor,
      contrato.fonte_url,
      sancao.quantidade_sancoes,
      sancao.sancoes
    from public.prefeitura_contratos contrato
    join sancoes_ativas sancao
      on sancao.cnpj = contrato.fornecedor_documento_digitos
  )
  insert into public.indicio_contratacao (
    chave,
    regra,
    categoria,
    severidade,
    score,
    titulo,
    descricao,
    sujeito_no,
    contrato_id,
    fornecedor_cnpj,
    orgao_id,
    evidencias,
    fonte_urls,
    regra_versao,
    ativo,
    atualizado_em
  )
  select
    'fornecedor-sancionado:' || contrato.id::text,
    'FORNECEDOR_SANCIONADO',
    'integridade_fornecedor',
    'alta',
    least(95, 75 + 5 * quantidade_sancoes),
    'Fornecedor com registro sancionador vigente',
    'O CNPJ do fornecedor aparece em cadastro federal de sancoes com vigencia atual ou sem data final informada. O alcance juridico da sancao precisa ser verificado no registro original.',
    'contrato:' || contrato.id::text,
    contrato.id,
    contrato.cnpj,
    contrato.orgao_id,
    jsonb_build_object(
      'valor_contrato', contrato.valor,
      'quantidade_sancoes', quantidade_sancoes,
      'sancoes', sancoes
    ),
    array[
      contrato.fonte_url,
      'https://portaldatransparencia.gov.br/sancoes'
    ],
    'sancoes-v1',
    true,
    now()
  from contratos_sancionados contrato
  on conflict (chave) do update
  set
    score = excluded.score,
    evidencias = excluded.evidencias,
    ativo = true,
    atualizado_em = now();

  -- Socio identificado por documento que tambem aparece como doador.
  with vinculos as (
    select distinct
      doacao.chave as doacao_chave,
      doacao.origem_id as pessoa_id,
      qsa.destino_id as empresa_id,
      contrato.destino_id as contrato_id_entidade,
      doacao.destino_id as candidatura_id,
      doacao.data_evento,
      doacao.valor,
      qsa.evidencias as qsa_evidencias,
      doacao.evidencias as doacao_evidencias
    from public.relacao_entidade doacao
    join public.relacao_entidade qsa
      on qsa.origem_id = doacao.origem_id
      and qsa.relacao = 'SOCIO_DE'
      and qsa.confianca = 'alta'
      and qsa.ativo
    join public.relacao_entidade contrato
      on contrato.origem_id = qsa.destino_id
      and contrato.relacao = 'FORNECEU_PARA'
      and contrato.ativo
    where doacao.relacao = 'DOOU_PARA'
      and doacao.ativo
      and doacao.confianca = 'alta'
  )
  insert into public.indicio_contratacao (
    chave,
    regra,
    categoria,
    severidade,
    score,
    titulo,
    descricao,
    sujeito_no,
    contrato_id,
    fornecedor_cnpj,
    periodo_inicio,
    periodo_fim,
    evidencias,
    fonte_urls,
    regra_versao,
    ativo,
    atualizado_em
  )
  select
    'socio-doador:' || vinculo.doacao_chave || ':' || contrato.no_grafo,
    'SOCIO_DOADOR_COM_EMPRESA_CONTRATADA',
    'financiamento_eleitoral',
    'informativa',
    30,
    'Socio de empresa contratada aparece como doador',
    'Um identificador pessoal em hash conecta o QSA da empresa a uma doacao eleitoral. O vinculo e informativo e nao implica favorecimento.',
    pessoa.no_grafo,
    nullif(regexp_replace(contrato.no_grafo, '[^0-9]', '', 'g'), '')::bigint,
    empresa.cnpj,
    vinculo.data_evento,
    vinculo.data_evento,
    jsonb_build_object(
      'pessoa_nome', pessoa.nome,
      'empresa_nome', empresa.nome,
      'empresa_cnpj', empresa.cnpj,
      'contrato_no', contrato.no_grafo,
      'candidatura_no', candidatura.no_grafo,
      'valor_doacao', vinculo.valor,
      'qsa', vinculo.qsa_evidencias,
      'doacao', vinculo.doacao_evidencias
    ),
    array[
      'https://dadosabertos.tse.jus.br/',
      'https://brasilapi.com.br/docs#tag/CNPJ'
    ],
    'socio-doador-v1',
    true,
    now()
  from vinculos vinculo
  join public.entidade_canonica pessoa on pessoa.id = vinculo.pessoa_id
  join public.entidade_canonica empresa on empresa.id = vinculo.empresa_id
  join public.entidade_canonica contrato
    on contrato.id = vinculo.contrato_id_entidade
  join public.entidade_canonica candidatura
    on candidatura.id = vinculo.candidatura_id
  on conflict (chave) do update
  set
    evidencias = excluded.evidencias,
    ativo = true,
    atualizado_em = now();

  -- Cobertura e limitacoes observaveis.
  insert into public.cobertura_regra_investigativa (
    regra,
    status,
    motivo,
    metricas,
    fonte,
    atualizado_em
  )
  values (
    'BAIXA_COMPETICAO',
    'indisponivel',
    'O portal lista vencedores e contratos, mas nao publica no endpoint atual o conjunto completo de participantes ou propostas. Sem esse denominador, a regra produziria falsos positivos.',
    jsonb_build_object(
      'licitacoes_catalogadas',
      (
        select count(*)
        from public.licitacoes
        where fonte = 'nucleogov' and tipo = 'licitacao'
      )
    ),
    'NucleoGov',
    now()
  )
  on conflict (regra) do update
  set
    status = excluded.status,
    motivo = excluded.motivo,
    metricas = excluded.metricas,
    fonte = excluded.fonte,
    atualizado_em = now();

  insert into public.cobertura_regra_investigativa (
    regra,
    status,
    motivo,
    metricas,
    fonte,
    atualizado_em
  )
  select
    'VINCULO_PAGAMENTO_EMPENHO',
    case
      when total_pagamentos = pagamentos_vinculados then 'disponivel'
      else 'parcial'
    end,
    case
      when total_pagamentos = pagamentos_vinculados
        then 'Todos os pagamentos publicados possuem empenho correspondente.'
      else 'O backfill historico de empenhos ainda esta em andamento.'
    end,
    jsonb_build_object(
      'pagamentos', total_pagamentos,
      'pagamentos_vinculados', pagamentos_vinculados,
      'pagamentos_pendentes', total_pagamentos - pagamentos_vinculados
    ),
    'NucleoGov',
    now()
  from (
    select
      (
        select count(*)
        from public.prefeitura_pagamentos_ordem
      ) as total_pagamentos,
      (
        select count(*)
        from public.v_grafo_contratacoes_arestas_completas
        where relacao = 'RECEBE_PAGAMENTO'
          and origem like 'empenho:%'
      ) as pagamentos_vinculados
  ) cobertura
  on conflict (regra) do update
  set
    status = excluded.status,
    motivo = excluded.motivo,
    metricas = excluded.metricas,
    fonte = excluded.fonte,
    atualizado_em = now();

  insert into public.cobertura_regra_investigativa (
    regra,
    status,
    motivo,
    metricas,
    fonte,
    atualizado_em
  )
  select
    'CNPJ_QSA',
    case
      when cnpjs_contratados = cnpjs_enriquecidos then 'disponivel'
      else 'parcial'
    end,
    case
      when cnpjs_contratados = cnpjs_enriquecidos
        then 'Todos os CNPJs de contratos possuem cadastro enriquecido.'
      else 'O enriquecimento de CNPJ e QSA continua em lotes controlados.'
    end,
    jsonb_build_object(
      'cnpjs_contratados', cnpjs_contratados,
      'cnpjs_enriquecidos', cnpjs_enriquecidos,
      'cnpjs_com_qsa', cnpjs_com_qsa
    ),
    'Receita Federal via BrasilAPI ou OpenCNPJ',
    now()
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
  on conflict (regra) do update
  set
    status = excluded.status,
    motivo = excluded.motivo,
    metricas = excluded.metricas,
    fonte = excluded.fonte,
    atualizado_em = now();

  insert into public.cobertura_regra_investigativa (
    regra,
    status,
    motivo,
    metricas,
    fonte,
    atualizado_em
  )
  select
    'BACKFILL_EMPENHOS',
    case
      when count(*) filter (where status = 'success') = count(*)
        then 'disponivel'
      else 'parcial'
    end,
    case
      when count(*) filter (where status = 'success') = count(*)
        then 'Todas as janelas de 2012 a 2025 foram confirmadas.'
      else 'As janelas historicas sao processadas sem sobreposicao para proteger o portal oficial.'
    end,
    jsonb_build_object(
      'janelas_total', count(*),
      'janelas_concluidas', count(*) filter (where status = 'success'),
      'janelas_pendentes', count(*) filter (where status = 'pending'),
      'janelas_em_execucao', count(*) filter (where status = 'running'),
      'janelas_com_erro', count(*) filter (where status = 'error')
    ),
    'NucleoGov',
    now()
  from public.prefeitura_empenhos_backfill_fila
  on conflict (regra) do update
  set
    status = excluded.status,
    motivo = excluded.motivo,
    metricas = excluded.metricas,
    fonte = excluded.fonte,
    atualizado_em = now();

  select count(*) into total_ativos
  from public.indicio_contratacao
  where ativo;

  select jsonb_object_agg(regra, quantidade)
  into por_regra
  from (
    select regra, count(*) as quantidade
    from public.indicio_contratacao
    where ativo
    group by regra
    order by regra
  ) resumo;

  return jsonb_build_object(
    'total_indicios_ativos', total_ativos,
    'por_regra', coalesce(por_regra, '{}'::jsonb),
    'atualizado_em', now()
  );
end;
$$;

revoke execute on function public.recalcular_indicios_contratacao()
  from public, anon, authenticated;
grant execute on function public.recalcular_indicios_contratacao()
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
begin
  cadastro := public.refresh_cadastro_canonico_investigativo();
  indicios := public.recalcular_indicios_contratacao();
  return jsonb_build_object(
    'cadastro', cadastro,
    'indicios', indicios
  );
end;
$$;

revoke execute on function public.refresh_investigacao_piracanjuba()
  from public, anon, authenticated;
grant execute on function public.refresh_investigacao_piracanjuba()
  to postgres, service_role;

select public.recalcular_indicios_contratacao();
