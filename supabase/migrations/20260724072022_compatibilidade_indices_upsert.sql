-- PostgREST precisa inferir o indice apenas pelas colunas do onConflict.
-- PostgreSQL permite multiplos NULLs, entao o indice completo preserva o legado.
drop index if exists public.despesas_nucleogov_empenho_uidx;
create unique index despesas_nucleogov_empenho_uidx
  on public.despesas (nucleogov_empenho_id);

drop index if exists public.diarias_nucleogov_chave_uidx;
create unique index diarias_nucleogov_chave_uidx
  on public.diarias (nucleogov_chave);
