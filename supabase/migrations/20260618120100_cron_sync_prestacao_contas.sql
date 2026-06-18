-- Cron mensal dos indicadores fiscais de prestação de contas (RGF + RREO via SICONFI).
-- O SICONFI publica por quadrimestre (RGF) e bimestre (RREO); rodar 1x/mês mantém atualizado.
select cron.schedule('sync-prestacao-contas-monthly', '0 7 19 * *',
  $$SELECT public.invoke_edge_function('sync-prestacao-contas');$$);
