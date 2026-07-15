-- Postos de combustível de Piracanjuba, dados oficiais da ANP
-- (API de Revendedores: https://revendedoresapi.anp.gov.br/v1/combustivel).
-- Sem "nota" (a nota é interna do app "ANP com Você"): guardamos os dados
-- cadastrais + sinais regulatórios oficiais (interdição Sigaf, PMQC).
create table if not exists public.postos_combustivel (
  codigo_simp        text primary key,
  autorizacao        text,
  razao_social       text not null,
  cnpj               text,
  endereco           text,
  complemento        text,
  bairro             text,
  cep                text,
  uf                 text,
  municipio          text,
  distribuidora      text,
  produtos           jsonb not null default '[]'::jsonb,
  latitude           double precision,
  longitude          double precision,
  situacao_constatada text,
  status_sigaf       text,
  inadimplencia_pmqc jsonb not null default '[]'::jsonb,
  data_publicacao    text,
  data_vinculacao    text,
  fonte_url          text,
  atualizado_em      timestamptz not null default now()
);

alter table public.postos_combustivel enable row level security;

drop policy if exists "postos combustivel sao publicos" on public.postos_combustivel;
create policy "postos combustivel sao publicos"
  on public.postos_combustivel for select
  to public using (true);

create index if not exists idx_postos_combustivel_municipio
  on public.postos_combustivel (municipio, uf);
