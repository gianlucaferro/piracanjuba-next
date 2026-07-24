-- Mantem as telas atuais alimentadas enquanto as consultas migram gradualmente
-- para as tabelas canonicas do NucleoGov.
alter table public.despesas
  add column if not exists nucleogov_empenho_id bigint;
create unique index if not exists despesas_nucleogov_empenho_uidx
  on public.despesas (nucleogov_empenho_id)
  where nucleogov_empenho_id is not null;

alter table public.diarias
  add column if not exists nucleogov_chave text;
create unique index if not exists diarias_nucleogov_chave_uidx
  on public.diarias (nucleogov_chave)
  where nucleogov_chave is not null;
