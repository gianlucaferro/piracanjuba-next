-- Indice unico sobre a chave estavel de negocio. NULLS NOT DISTINCT (PG15+) trata
-- vigencia/empresa nulas como iguais, consolidando o contrato logico. Permite o
-- upsert da funcao analyze-contrato-risco por essa trinca em vez do UUID.
CREATE UNIQUE INDEX IF NOT EXISTS contratos_risco_chave_estavel_uidx
ON public.contratos_risco (orgao, contrato_numero, contrato_vigencia_inicio, contrato_empresa)
NULLS NOT DISTINCT;
