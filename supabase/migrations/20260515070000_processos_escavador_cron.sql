-- Substituir cron antigo BigData (bimestral) pelo novo Escavador (trimestral)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-processos-publicos-bimestral') THEN
    PERFORM cron.unschedule('sync-processos-publicos-bimestral');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-processos-escavador-trimestral') THEN
    PERFORM cron.unschedule('sync-processos-escavador-trimestral');
  END IF;
END $$;

SELECT cron.schedule(
  'sync-processos-escavador-trimestral',
  '0 7 1 1,4,7,10 *',
  $$SELECT public.invoke_edge_function('sync-processos-escavador');$$
);

INSERT INTO public.sync_job_registry (
  function_name, cron_name, cron_expression, frequency_tier,
  data_source, description_pt, max_stale_hours
) VALUES (
  'sync-processos-escavador', 'sync-processos-escavador-trimestral',
  '0 7 1 1,4,7,10 *', 'quarterly',
  'Escavador API v2 (envolvido/processos)',
  'Processos judiciais dos 11 vereadores via Escavador. Trimestral (jan/abr/jul/out dia 1 04:00 BRT). Filtra segredo de justica + vitima + familia.',
  2208
)
ON CONFLICT (function_name) DO UPDATE SET
  cron_name = EXCLUDED.cron_name,
  cron_expression = EXCLUDED.cron_expression,
  data_source = EXCLUDED.data_source,
  description_pt = EXCLUDED.description_pt,
  max_stale_hours = EXCLUDED.max_stale_hours;

UPDATE public.sync_job_registry SET is_active = FALSE
  WHERE function_name = 'sync-processos-publicos';
