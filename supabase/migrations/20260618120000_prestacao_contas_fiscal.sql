-- Indicadores fiscais de prestação de contas (RGF despesa com pessoal vs limite LRF +
-- RREO balanço orçamentário) da Prefeitura e Câmara de Piracanjuba, via SICONFI/Tesouro.
-- Populada pela edge function sync-prestacao-contas.
create table if not exists public.prestacao_contas_fiscal (
  id uuid primary key default gen_random_uuid(),
  poder text not null check (poder in ('executivo','legislativo')),
  ano int not null,
  -- RGF (Relatório de Gestão Fiscal) - despesa com pessoal vs limite LRF
  periodo_rgf int,
  rcl numeric,
  dtp numeric,
  dtp_pct numeric,
  limite_max numeric,
  limite_max_pct numeric,
  limite_prudencial numeric,
  limite_prudencial_pct numeric,
  limite_alerta numeric,
  limite_alerta_pct numeric,
  fonte_rgf_url text,
  -- RREO (Relatório Resumido da Execução Orçamentária) - balanço orçamentário (ente/executivo)
  periodo_rreo int,
  receita_prevista numeric,
  receita_realizada numeric,
  despesa_dotacao numeric,
  despesa_empenhada numeric,
  despesa_liquidada numeric,
  despesa_paga numeric,
  fonte_rreo_url text,
  updated_at timestamptz not null default now(),
  unique (poder, ano)
);

alter table public.prestacao_contas_fiscal enable row level security;

drop policy if exists "leitura publica prestacao_contas_fiscal" on public.prestacao_contas_fiscal;
create policy "leitura publica prestacao_contas_fiscal"
  on public.prestacao_contas_fiscal for select
  using (true);

comment on table public.prestacao_contas_fiscal is 'Indicadores fiscais de prestação de contas (RGF + RREO) da Prefeitura e Câmara de Piracanjuba, via SICONFI/Tesouro Nacional. Populada por sync-prestacao-contas.';
