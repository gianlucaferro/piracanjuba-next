-- Throttle do Radar pra nao competir com os resumos IA on-demand pela cota free do
-- Gemini. Sai do "a cada 5min o dia todo" pra uma janela de madrugada BRT
-- (06-10 UTC = 03-07 BRT, baixo trafego). Libera a cota diurna pros resumos que o
-- cidadao gera na hora. Cobre o backlog de contratos 2021+ em ~5 noites (30 runs x 12).
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'analyze-risco-catchup-2021'),
  schedule => '*/10 6-10 * * *'
);
