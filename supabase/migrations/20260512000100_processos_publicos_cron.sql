-- Cron bimestral pra sync-processos-publicos
-- Roda dia 1 dos meses ímpares (jan, mar, mai, jul, set, nov) às 04:00 BRT (07:00 UTC)
-- = 6 execuções/ano × ~11 vereadores × R$ 0,07 = R$ 4,62/ano (MVP)
-- Quando expandir pra prefeito+vice+secretários (25 pessoas): ~R$ 10,50/ano
--
-- frequency_tier='quarterly' usado por compatibilidade com o CHECK constraint atual
-- (tier 'bimonthly' não existe nesse enum).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-processos-publicos-bimestral') THEN
    PERFORM cron.unschedule('sync-processos-publicos-bimestral');
  END IF;
END $$;

SELECT cron.schedule(
  'sync-processos-publicos-bimestral',
  '0 7 1 1,3,5,7,9,11 *',
  $$SELECT public.invoke_edge_function('sync-processos-publicos');$$
);

INSERT INTO public.sync_job_registry (
  function_name,
  cron_name,
  cron_expression,
  frequency_tier,
  data_source,
  description_pt,
  max_stale_hours
)
VALUES (
  'sync-processos-publicos',
  'sync-processos-publicos-bimestral',
  '0 7 1 1,3,5,7,9,11 *',
  'quarterly',
  'BigData Corp (People processes)',
  'Processos judiciais de vereadores/prefeito/secretarios via BigData Corp; roda dia 1 dos meses impares as 04:00 BRT (bimestral). Filtra segredo de justica, vitima, familia.',
  1500
)
ON CONFLICT (function_name) DO UPDATE
SET
  cron_name = EXCLUDED.cron_name,
  cron_expression = EXCLUDED.cron_expression,
  frequency_tier = EXCLUDED.frequency_tier,
  data_source = EXCLUDED.data_source,
  description_pt = EXCLUDED.description_pt,
  max_stale_hours = EXCLUDED.max_stale_hours;
