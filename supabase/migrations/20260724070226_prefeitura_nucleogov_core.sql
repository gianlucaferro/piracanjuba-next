-- Camada canonica do portal NucleoGov da Prefeitura de Piracanjuba.
-- Mantem as tabelas legadas durante a transicao e cria chaves oficiais para o grafo.

create table if not exists public.prefeitura_contratos (
  id bigint primary key,
  label text,
  numero text,
  ano integer,
  orgao_id integer,
  orgao_nome text,
  licitacao_id bigint,
  valor numeric,
  data_publicacao date,
  data_firmatura date,
  vigencia_inicio date,
  vigencia_fim date,
  fornecedor_nome text,
  fornecedor_documento text,
  fornecedor_documento_digitos text,
  objeto text,
  fiscal_contrato text,
  situacao text,
  assunto text,
  tipo_ajuste text,
  tipo text,
  opcoes text,
  parcelas text,
  acrescimos jsonb,
  decrescimos jsonb,
  rescisoes jsonb,
  anexos jsonb not null default '[]'::jsonb,
  raw_payload jsonb not null,
  fonte_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prefeitura_contratos_ano_idx
  on public.prefeitura_contratos (ano desc);
create index if not exists prefeitura_contratos_licitacao_idx
  on public.prefeitura_contratos (licitacao_id);
create index if not exists prefeitura_contratos_fornecedor_idx
  on public.prefeitura_contratos (fornecedor_documento_digitos);
create index if not exists prefeitura_contratos_orgao_idx
  on public.prefeitura_contratos (orgao_id);

create table if not exists public.prefeitura_aditivos (
  id bigint primary key,
  contrato_id bigint not null,
  termo integer,
  label text,
  ano integer,
  tipo text,
  tipo_aditivo text,
  data_termo date,
  prazo date,
  valor numeric,
  credor_nome text,
  credor_documento text,
  credor_documento_digitos text,
  documentos jsonb not null default '[]'::jsonb,
  raw_payload jsonb not null,
  fonte_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prefeitura_aditivos_contrato_idx
  on public.prefeitura_aditivos (contrato_id);
create index if not exists prefeitura_aditivos_credor_idx
  on public.prefeitura_aditivos (credor_documento_digitos);
create index if not exists prefeitura_aditivos_ano_idx
  on public.prefeitura_aditivos (ano desc);

create table if not exists public.prefeitura_fiscais_contratos (
  portal_key bigint primary key,
  fiscal_nome text,
  contrato_label text,
  contrato_numero text,
  contrato_ano integer,
  orgao_id integer,
  orgao_nome text,
  situacao text,
  data_publicacao date,
  vigencia_inicio date,
  raw_payload jsonb not null,
  fonte_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prefeitura_fiscais_nome_idx
  on public.prefeitura_fiscais_contratos (fiscal_nome);
create index if not exists prefeitura_fiscais_contrato_idx
  on public.prefeitura_fiscais_contratos (contrato_ano, contrato_numero);

create table if not exists public.prefeitura_empenhos (
  id bigint primary key,
  numero text,
  data date,
  fornecedor_nome text,
  fornecedor_documento text,
  fornecedor_documento_digitos text,
  orgao_id integer,
  orgao_gestor text,
  unidade_orcamentaria text,
  licitacao_id bigint,
  licitacao_modalidade text,
  historico text,
  funcao text,
  subfuncao text,
  programa text,
  acao text,
  fonte_recurso text,
  destinacao_recurso text,
  categoria text,
  grupo text,
  modalidade text,
  elemento text,
  subelemento text,
  valor_empenhado numeric,
  valor_anulacao numeric,
  valor_liquidado numeric,
  valor_pago numeric,
  saldo_pagar numeric,
  raw_payload jsonb not null,
  fonte_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prefeitura_empenhos_numero_idx
  on public.prefeitura_empenhos (numero);
create index if not exists prefeitura_empenhos_data_idx
  on public.prefeitura_empenhos (data desc);
create index if not exists prefeitura_empenhos_fornecedor_idx
  on public.prefeitura_empenhos (fornecedor_documento_digitos);
create index if not exists prefeitura_empenhos_licitacao_idx
  on public.prefeitura_empenhos (licitacao_id);

create table if not exists public.prefeitura_pagamentos_ordem (
  chave text primary key,
  numero_empenho text not null,
  fornecedor_nome text not null,
  fornecedor_documento text,
  fornecedor_documento_digitos text,
  orgao_nome text,
  fonte_recurso text,
  categoria_contrato text,
  data_atesto date,
  data_liquidacao date,
  data_vencimento date,
  data_pagamento date,
  valor_empenho numeric,
  valor_pago numeric,
  justificativa text,
  raw_payload jsonb not null,
  fonte_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prefeitura_pagamentos_empenho_idx
  on public.prefeitura_pagamentos_ordem (numero_empenho);
create index if not exists prefeitura_pagamentos_fornecedor_idx
  on public.prefeitura_pagamentos_ordem (fornecedor_documento_digitos);
create index if not exists prefeitura_pagamentos_data_idx
  on public.prefeitura_pagamentos_ordem (data_pagamento desc);

create table if not exists public.prefeitura_diarias_nucleogov (
  chave text primary key,
  portal_id bigint not null,
  empenho_id bigint not null,
  orgao_id integer,
  orgao_nome text,
  favorecido text,
  cargo text,
  destino text,
  cidade text,
  valor numeric,
  data_inicio date,
  data_fim date,
  quantidade integer,
  descricao text,
  raw_payload jsonb not null,
  fonte_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prefeitura_diarias_empenho_idx
  on public.prefeitura_diarias_nucleogov (empenho_id);
create index if not exists prefeitura_diarias_favorecido_idx
  on public.prefeitura_diarias_nucleogov (favorecido);
create index if not exists prefeitura_diarias_data_idx
  on public.prefeitura_diarias_nucleogov (data_inicio desc);

create table if not exists public.prefeitura_folha_nucleogov (
  chave text primary key,
  portal_id bigint not null,
  ano integer not null,
  mes integer not null check (mes between 1 and 12),
  referencia text,
  matricula text,
  nome text not null,
  nome_normalizado text not null,
  cargo text,
  data_admissao date,
  tipo_admissao text,
  decreto text,
  lotacao text,
  possui_estabilidade text,
  tipo_folha text,
  tipo_movimentacao text,
  carga_horaria text,
  situacao text,
  funcao text,
  hierarquia text,
  salario_base numeric,
  total_proventos numeric,
  total_descontos numeric,
  total_liquido numeric,
  outros_proventos numeric,
  outros_descontos_obrigatorios numeric,
  raw_payload jsonb not null,
  fonte_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (portal_id, ano, mes)
);

create index if not exists prefeitura_folha_competencia_idx
  on public.prefeitura_folha_nucleogov (ano desc, mes desc);
create index if not exists prefeitura_folha_matricula_idx
  on public.prefeitura_folha_nucleogov (matricula);
create index if not exists prefeitura_folha_nome_idx
  on public.prefeitura_folha_nucleogov (nome_normalizado);

create table if not exists public.prefeitura_atos_nucleogov (
  chave text primary key,
  numero text,
  data_publicacao date,
  ementa text,
  tipo_id integer,
  tipo text,
  documento_url text,
  arquivo_nome text,
  raw_payload jsonb not null,
  fonte_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prefeitura_atos_data_idx
  on public.prefeitura_atos_nucleogov (data_publicacao desc);
create index if not exists prefeitura_atos_tipo_idx
  on public.prefeitura_atos_nucleogov (tipo);

create table if not exists public.prefeitura_sync_state (
  dataset text not null,
  scope text not null,
  fetched integer not null,
  source_total integer,
  complete boolean not null,
  checked_at timestamptz not null default now(),
  primary key (dataset, scope)
);

-- Campos de compatibilidade para manter a interface atual durante a migracao.
alter table public.servidores
  add column if not exists matricula text,
  add column if not exists lotacao text,
  add column if not exists data_admissao date,
  add column if not exists tipo_admissao text,
  add column if not exists decreto_admissao text,
  add column if not exists carga_horaria text,
  add column if not exists situacao_funcional text;

-- Leitura publica dos dados oficiais. Escrita continua restrita ao service role.
alter table public.prefeitura_contratos enable row level security;
alter table public.prefeitura_aditivos enable row level security;
alter table public.prefeitura_fiscais_contratos enable row level security;
alter table public.prefeitura_empenhos enable row level security;
alter table public.prefeitura_pagamentos_ordem enable row level security;
alter table public.prefeitura_diarias_nucleogov enable row level security;
alter table public.prefeitura_folha_nucleogov enable row level security;
alter table public.prefeitura_atos_nucleogov enable row level security;
alter table public.prefeitura_sync_state enable row level security;

drop policy if exists prefeitura_contratos_select_public on public.prefeitura_contratos;
create policy prefeitura_contratos_select_public on public.prefeitura_contratos
  for select to anon, authenticated using (true);
drop policy if exists prefeitura_aditivos_select_public on public.prefeitura_aditivos;
create policy prefeitura_aditivos_select_public on public.prefeitura_aditivos
  for select to anon, authenticated using (true);
drop policy if exists prefeitura_fiscais_select_public on public.prefeitura_fiscais_contratos;
create policy prefeitura_fiscais_select_public on public.prefeitura_fiscais_contratos
  for select to anon, authenticated using (true);
drop policy if exists prefeitura_empenhos_select_public on public.prefeitura_empenhos;
create policy prefeitura_empenhos_select_public on public.prefeitura_empenhos
  for select to anon, authenticated using (true);
drop policy if exists prefeitura_pagamentos_select_public on public.prefeitura_pagamentos_ordem;
create policy prefeitura_pagamentos_select_public on public.prefeitura_pagamentos_ordem
  for select to anon, authenticated using (true);
drop policy if exists prefeitura_diarias_select_public on public.prefeitura_diarias_nucleogov;
create policy prefeitura_diarias_select_public on public.prefeitura_diarias_nucleogov
  for select to anon, authenticated using (true);
drop policy if exists prefeitura_folha_select_public on public.prefeitura_folha_nucleogov;
create policy prefeitura_folha_select_public on public.prefeitura_folha_nucleogov
  for select to anon, authenticated using (true);
drop policy if exists prefeitura_atos_select_public on public.prefeitura_atos_nucleogov;
create policy prefeitura_atos_select_public on public.prefeitura_atos_nucleogov
  for select to anon, authenticated using (true);
drop policy if exists prefeitura_sync_state_select_public on public.prefeitura_sync_state;
create policy prefeitura_sync_state_select_public on public.prefeitura_sync_state
  for select to anon, authenticated using (true);

-- Armazena configuracoes operacionais sem expor leitura pela API publica.
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
revoke all on table public.app_settings from public, anon, authenticated;

-- Helper seguro versionado. O segredo permanece em app_settings e nunca entra no codigo.
create or replace function public.invoke_edge_function_secure(
  function_name text,
  body_json jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  proj_url text := 'https://oinweocqcptwxqsztlcl.supabase.co';
  cron_secret text;
  request_id bigint;
begin
  if function_name is null or not (
    function_name = any(array[
      'sync-aditivos-prefeitura-nucleogov',
      'sync-atos-prefeitura-nucleogov',
      'sync-bolsa-familia',
      'sync-camara-financeiro',
      'sync-camara-servidores',
      'sync-contratos-camara',
      'sync-contratos-prefeitura-nucleogov',
      'sync-diarias-camara',
      'sync-diarias-prefeitura-nucleogov',
      'sync-empenhos-prefeitura-nucleogov',
      'sync-empresa-sancionada',
      'sync-fiscais-prefeitura-nucleogov',
      'sync-folha-camara',
      'sync-folha-prefeitura-nucleogov',
      'sync-licitacoes-camara',
      'sync-licitacoes-prefeitura',
      'sync-pagamentos-prefeitura-nucleogov',
      'sync-postos-combustivel'
    ]::text[])
  ) then
    raise exception 'edge function nao permitida: %', function_name;
  end if;

  if octet_length(body_json::text) > 10000 then
    raise exception 'payload do cron excede o limite';
  end if;

  select value into cron_secret
  from public.app_settings
  where key = 'cron_secret';

  if cron_secret is null or cron_secret = '' then
    raise exception 'cron_secret nao encontrado em app_settings';
  end if;

  select net.http_post(
    url := proj_url || '/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', cron_secret,
      'x-centi-ingest-secret', cron_secret
    ),
    body := body_json,
    timeout_milliseconds := 290000
  ) into request_id;

  return request_id;
end;
$$;

revoke execute on function public.invoke_edge_function_secure(text, jsonb)
  from public, anon, authenticated;
grant execute on function public.invoke_edge_function_secure(text, jsonb)
  to postgres;

-- Jobs diarios, separados para isolar falhas e controlar carga sobre o portal.
do $$
declare
  cron_name text;
begin
  foreach cron_name in array array[
    'sync-contratos-prefeitura-nucleogov-daily',
    'sync-aditivos-prefeitura-nucleogov-daily',
    'sync-fiscais-prefeitura-nucleogov-daily',
    'sync-pagamentos-prefeitura-nucleogov-daily',
    'sync-diarias-prefeitura-nucleogov-daily',
    'sync-empenhos-prefeitura-nucleogov-daily',
    'sync-folha-prefeitura-nucleogov-daily',
    'sync-atos-prefeitura-nucleogov-daily'
  ]
  loop
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = cron_name;
  end loop;
end
$$;

select cron.schedule(
  'sync-contratos-prefeitura-nucleogov-daily',
  '10 6 * * *',
  $$select public.invoke_edge_function_secure('sync-contratos-prefeitura-nucleogov');$$
);
select cron.schedule(
  'sync-aditivos-prefeitura-nucleogov-daily',
  '20 6 * * *',
  $$select public.invoke_edge_function_secure('sync-aditivos-prefeitura-nucleogov');$$
);
select cron.schedule(
  'sync-fiscais-prefeitura-nucleogov-daily',
  '30 6 * * *',
  $$select public.invoke_edge_function_secure('sync-fiscais-prefeitura-nucleogov');$$
);
select cron.schedule(
  'sync-pagamentos-prefeitura-nucleogov-daily',
  '40 6 * * *',
  $$select public.invoke_edge_function_secure('sync-pagamentos-prefeitura-nucleogov');$$
);
select cron.schedule(
  'sync-diarias-prefeitura-nucleogov-daily',
  '50 6 * * *',
  $$select public.invoke_edge_function_secure('sync-diarias-prefeitura-nucleogov');$$
);
select cron.schedule(
  'sync-empenhos-prefeitura-nucleogov-daily',
  '0 7 * * *',
  $$select public.invoke_edge_function_secure('sync-empenhos-prefeitura-nucleogov');$$
);
select cron.schedule(
  'sync-folha-prefeitura-nucleogov-daily',
  '20 7 * * *',
  $$select public.invoke_edge_function_secure('sync-folha-prefeitura-nucleogov');$$
);
select cron.schedule(
  'sync-atos-prefeitura-nucleogov-daily',
  '30 7 * * *',
  $$select public.invoke_edge_function_secure('sync-atos-prefeitura-nucleogov');$$
);

insert into public.sync_job_registry (
  function_name,
  cron_name,
  cron_expression,
  frequency_tier,
  data_source,
  description_pt,
  max_stale_hours,
  depends_on,
  is_active
) values
  (
    'sync-licitacoes-prefeitura',
    'sync-licitacoes-prefeitura-daily',
    '40 5 * * *',
    'daily',
    'NucleoGov Prefeitura',
    'Licitacoes e dispensas com chave oficial do portal.',
    36,
    null,
    true
  ),
  (
    'sync-contratos-prefeitura-nucleogov',
    'sync-contratos-prefeitura-nucleogov-daily',
    '10 6 * * *',
    'daily',
    'NucleoGov Prefeitura',
    'Contratos com CNPJ, licitacao, fiscal, vigencia e valores.',
    36,
    array['sync-licitacoes-prefeitura'],
    true
  ),
  (
    'sync-aditivos-prefeitura-nucleogov',
    'sync-aditivos-prefeitura-nucleogov-daily',
    '20 6 * * *',
    'daily',
    'NucleoGov Prefeitura',
    'Aditivos ligados ao id oficial do contrato.',
    36,
    array['sync-contratos-prefeitura-nucleogov'],
    true
  ),
  (
    'sync-fiscais-prefeitura-nucleogov',
    'sync-fiscais-prefeitura-nucleogov-daily',
    '30 6 * * *',
    'daily',
    'NucleoGov Prefeitura',
    'Fiscais e contratos sob responsabilidade.',
    36,
    array['sync-contratos-prefeitura-nucleogov'],
    true
  ),
  (
    'sync-pagamentos-prefeitura-nucleogov',
    'sync-pagamentos-prefeitura-nucleogov-daily',
    '40 6 * * *',
    'daily',
    'NucleoGov Prefeitura',
    'Ordem cronologica de pagamentos e justificativas.',
    36,
    null,
    true
  ),
  (
    'sync-diarias-prefeitura-nucleogov',
    'sync-diarias-prefeitura-nucleogov-daily',
    '50 6 * * *',
    'daily',
    'NucleoGov Prefeitura',
    'Diarias com id do empenho, destino e favorecido.',
    36,
    array['sync-empenhos-prefeitura-nucleogov'],
    true
  ),
  (
    'sync-empenhos-prefeitura-nucleogov',
    'sync-empenhos-prefeitura-nucleogov-daily',
    '0 7 * * *',
    'daily',
    'NucleoGov Prefeitura',
    'Empenhos, liquidacoes e pagamentos com CNPJ e licitacao.',
    36,
    array['sync-licitacoes-prefeitura'],
    true
  ),
  (
    'sync-folha-prefeitura-nucleogov',
    'sync-folha-prefeitura-nucleogov-daily',
    '20 7 * * *',
    'daily',
    'NucleoGov Prefeitura',
    'Folha municipal com matricula, lotacao e remuneracao detalhada.',
    36,
    null,
    true
  ),
  (
    'sync-atos-prefeitura-nucleogov',
    'sync-atos-prefeitura-nucleogov-daily',
    '30 7 * * *',
    'daily',
    'NucleoGov Prefeitura',
    'Decretos, portarias e demais atos administrativos.',
    36,
    null,
    true
  )
on conflict (function_name) do update set
  cron_name = excluded.cron_name,
  cron_expression = excluded.cron_expression,
  frequency_tier = excluded.frequency_tier,
  data_source = excluded.data_source,
  description_pt = excluded.description_pt,
  max_stale_hours = excluded.max_stale_hours,
  depends_on = excluded.depends_on,
  is_active = excluded.is_active;

-- Projecao inicial de arestas para consultas investigativas.
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
  'empenho:' || e.id::text,
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
) e on true

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
