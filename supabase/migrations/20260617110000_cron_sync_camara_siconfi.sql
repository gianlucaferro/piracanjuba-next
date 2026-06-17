-- Cron mensal do orcamento da Camara via SICONFI (RREO Anexo 02, funcao Legislativa).
-- O SICONFI publica por bimestre; rodar 1x/mes mantem o ano corrente atualizado.
select cron.schedule('sync-camara-siconfi-monthly', '0 6 18 * *',
  $$SELECT public.invoke_edge_function('sync-camara-siconfi');$$);
