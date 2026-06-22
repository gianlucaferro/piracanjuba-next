-- Backfill diário do objeto (ementa) dos contratos da prefeitura.
-- O sync diário traz contratos novos sem o objeto (a lista do Centi não tem essa coluna);
-- este cron busca a página de detalhe e popula o objeto, pra a ementa já aparecer fixa no card
-- (sem precisar clicar no resumo por IA). Roda após os syncs noturnos (21:xx).
-- Processa só contratos com objeto_sync_em nulo (recentes primeiro).
select cron.schedule('backfill-contrato-objeto-daily', '0 22 * * *',
  $$SELECT public.invoke_edge_function('backfill-contrato-objeto');$$);
