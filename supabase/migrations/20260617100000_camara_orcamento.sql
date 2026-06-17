-- Orcamento da Camara Municipal (funcao Legislativa) via SICONFI/Tesouro Nacional.
-- A camara nao tem receita propria publicada (Centi retorna zeros; ela vive de duodecimo
-- repassado pela Prefeitura). O duodecimo financia o orcamento da camara, que e declarado
-- ao SICONFI no RREO Anexo 02. Guardamos orcado (dotacao) e executado (liquidada) por ano.
create table if not exists public.camara_orcamento (
  ano integer primary key,
  dotacao numeric,
  liquidada numeric,
  periodo_referencia integer,
  fonte text default 'SICONFI / Tesouro Nacional',
  fonte_url text,
  updated_at timestamptz default now()
);

alter table public.camara_orcamento enable row level security;

drop policy if exists "camara_orcamento_select_public" on public.camara_orcamento;
create policy "camara_orcamento_select_public"
  on public.camara_orcamento for select
  to anon, authenticated
  using (true);
