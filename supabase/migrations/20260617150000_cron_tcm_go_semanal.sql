-- O sync-tcm-go-piracanjuba (que raspa o portal TCM-GO via Apify, filtrando por Piracanjuba,
-- padrao async com webhook) estava SEM cron, entao os apontamentos ficavam congelados.
-- Agenda semanal (domingo 05h UTC): o crawl Apify e pesado (~10 min, 2GB) e decisoes do
-- TCM sobre um municipio sao infrequentes, entao diario gastaria compute do FREE tier a toa.
select cron.schedule('sync-tcm-go-piracanjuba-weekly', '0 5 * * 0',
  $$SELECT public.invoke_edge_function('sync-tcm-go-piracanjuba');$$);
