-- Despesas (empenhos) da Camara: a aba lia camara_despesas, que estava vazia (a camara
-- nao tinha sync proprio de despesas). sync-camara-despesas raspa /despesas/orgao
-- (idorgao=3) e popula a tabela. Cron mensal pra manter atualizado.
select cron.schedule('sync-camara-despesas-monthly', '0 5 16 * *',
  $$SELECT public.invoke_edge_function('sync-camara-despesas');$$);
