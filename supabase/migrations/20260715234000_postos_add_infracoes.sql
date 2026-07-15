-- Detalhe por trás da nota da ANP: contagem de infrações de qualidade (PMQC),
-- de quantidade (bomba/vazão) e de amostras de combustível fora do padrão,
-- extraídas do mesmo modelo do relatório do app "ANP com Você" (índices [29],
-- [30] e [33] da linha). Explicam por que um posto não tem nota 5.
alter table public.postos_combustivel
  add column if not exists infracoes_qualidade smallint,
  add column if not exists infracoes_quantidade smallint,
  add column if not exists amostras_nao_conforme smallint;
