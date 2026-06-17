-- Resumo de IA pre-gerado para atos da camara (ex: Indicacoes). Permite mostrar o
-- resumo direto no card, sem o cidadao precisar clicar para gerar on-demand.
alter table public.camara_atos
  add column if not exists resumo_ia text,
  add column if not exists resumo_ia_gerado_em timestamptz,
  add column if not exists resumo_ia_modelo text;
