-- Recorta o Radar de Risco pra contratos a partir de 2025-01-01 (mandato atual;
-- os anteriores ja foram majoritariamente encerrados e sao de outra gestao). O alvo
-- cai de ~1.789 pra ~426 contratos, fechando o backlog em ~1-2 noites.
-- Recria o wrapper com desde=2025 e renomeia o cron de -2021 pra -2025.
CREATE OR REPLACE FUNCTION public.invoke_analyze_risco_catchup()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbndlb2NxY3B0d3hxc3p0bGNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MDA2NTUsImV4cCI6MjA5MzM3NjY1NX0.TFstJJgPZDauChUdhuBAcL8KX5FtGONaVNao7FU5lMQ';
  request_id BIGINT;
BEGIN
  SELECT net.http_post(
    url := 'https://oinweocqcptwxqsztlcl.supabase.co/functions/v1/analyze-contrato-risco',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || anon_key),
    body := jsonb_build_object('desde', '2025-01-01', 'batch_size', 12),
    timeout_milliseconds := 120000
  ) INTO request_id;
  RETURN request_id;
END;
$func$;

-- Renomeia o cron (mantem a janela de madrugada 06-10 UTC = 03-07 BRT).
SELECT cron.unschedule('analyze-risco-catchup-2021');
SELECT cron.schedule('analyze-risco-catchup-2025', '*/10 6-10 * * *',
  $cron$SELECT public.invoke_analyze_risco_catchup();$cron$);
