-- Enriquece public.licitacoes para receber o sync do portal NucleoGov da Prefeitura
-- (acessoainformacao.piracanjuba.go.gov.br), que substituiu o Centi em 2026-07.
--
-- Aditivo e não-destrutivo: as linhas do sync antigo (morto desde 2026-02-28)
-- continuam, marcadas com fonte='legado' e chave NULL.
--
-- `chave` é o id interno do portal e serve de chave de upsert idempotente.
-- O índice único é NÃO-parcial de propósito: índice parcial impede a inferência
-- do ON CONFLICT (chave) via PostgREST, e em índice único múltiplos NULL são
-- permitidos, então as linhas legadas convivem sem conflito.
alter table public.licitacoes
  add column if not exists chave integer,
  add column if not exists ano integer,
  add column if not exists modalidade_id integer,
  add column if not exists situacao_id integer,
  add column if not exists orgao_id integer,
  add column if not exists orgao_nome text,
  add column if not exists data_abertura timestamptz,
  add column if not exists data_encerramento timestamptz,
  add column if not exists valor_estimado numeric,
  add column if not exists valor_sigiloso boolean not null default false,
  add column if not exists raw_payload jsonb,
  add column if not exists fonte text not null default 'legado',
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists licitacoes_chave_uidx on public.licitacoes(chave);
create index if not exists licitacoes_fonte_idx on public.licitacoes(fonte);
create index if not exists licitacoes_ano_idx on public.licitacoes(ano desc);
