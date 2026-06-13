-- Reagenda os syncs de contratos e licitacoes (prefeitura + camara) para 1x/dia, todos os dias.
-- Horario: 18h de Goias (UTC-3) = 21:00 UTC, escalonado de 5 em 5 min pra nao sobrecarregar os portais de origem.
-- Helpers preservados: prefeitura/aditivos = invoke_edge_function; camara = invoke_edge_function_secure.
-- sync-prefeitura-mensal (varredura ampla de fechamento) permanece intocado.

-- 1. Remove os agendamentos antigos (3x/semana e mensais) de forma idempotente
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname IN (
  'sync-prefeitura-diaria-mon','sync-prefeitura-diaria-wed','sync-prefeitura-diaria-fri',
  'sync-contratos-aditivos-mon','sync-contratos-aditivos-wed','sync-contratos-aditivos-fri',
  'sync-contratos-camara-mensal','sync-licitacoes-camara-mensal'
);

-- 2. Cria os novos agendamentos diarios, escalonados (21:00-21:15 UTC = 18:00-18:15 Goias)
SELECT cron.schedule('sync-prefeitura-diaria-daily',  '0 21 * * *',  $$SELECT public.invoke_edge_function('sync-prefeitura-diaria');$$);
SELECT cron.schedule('sync-contratos-aditivos-daily', '5 21 * * *',  $$SELECT public.invoke_edge_function('sync-contratos-aditivos');$$);
SELECT cron.schedule('sync-contratos-camara-daily',   '10 21 * * *', $$SELECT public.invoke_edge_function_secure('sync-contratos-camara');$$);
SELECT cron.schedule('sync-licitacoes-camara-daily',  '15 21 * * *', $$SELECT public.invoke_edge_function_secure('sync-licitacoes-camara');$$);
