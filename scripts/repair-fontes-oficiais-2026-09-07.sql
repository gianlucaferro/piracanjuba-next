-- Reparar somente URLs de navegacao retiradas, apos autorizacao de producao.
-- Uma unica instrucao atomica. Nao altera links documentais nem campos de negocio.
WITH fix_prefeitura_contratos AS (
  UPDATE public.prefeitura_contratos
  SET fonte_url = 'https://acessoainformacao.piracanjuba.go.gov.br/cidadao/informacao/contratos_cnt'
  WHERE fonte_url = 'https://acessoainformacao.piracanjuba.go.gov.br/cidadao/transparencia/contratos_cnt'
  RETURNING 1
),
fix_contratos AS (
  UPDATE public.contratos
  SET fonte_url = 'https://acessoainformacao.piracanjuba.go.gov.br/cidadao/informacao/contratos_cnt'
  WHERE fonte_url = 'https://acessoainformacao.piracanjuba.go.gov.br/cidadao/transparencia/contratos_cnt'
  RETURNING 1
),
fix_prefeitura_aditivos AS (
  UPDATE public.prefeitura_aditivos
  SET fonte_url = 'https://acessoainformacao.piracanjuba.go.gov.br/cidadao/informacao/aditivos_cnt'
  WHERE fonte_url = 'https://acessoainformacao.piracanjuba.go.gov.br/cidadao/transparencia/aditivos_cnt'
  RETURNING 1
),
fix_contratos_aditivos AS (
  UPDATE public.contratos_aditivos
  SET fonte_url = 'https://acessoainformacao.piracanjuba.go.gov.br/cidadao/informacao/aditivos_cnt'
  WHERE fonte_url = 'https://acessoainformacao.piracanjuba.go.gov.br/cidadao/transparencia/aditivos_cnt'
  RETURNING 1
),
fix_prefeitura_fiscais_contratos AS (
  UPDATE public.prefeitura_fiscais_contratos
  SET fonte_url = 'https://acessoainformacao.piracanjuba.go.gov.br/cidadao/informacao/fiscais_contratos_sg'
  WHERE fonte_url = 'https://acessoainformacao.piracanjuba.go.gov.br/cidadao/transparencia/fiscais_contratos_sg'
  RETURNING 1
),
fix_prefeitura_pagamentos_ordem AS (
  UPDATE public.prefeitura_pagamentos_ordem
  SET fonte_url = 'https://acessoainformacao.piracanjuba.go.gov.br/cidadao/informacao/ordem_cronologica_pagamentos_cnt'
  WHERE fonte_url = 'https://acessoainformacao.piracanjuba.go.gov.br/cidadao/transparencia/ordem_cronologica_pagamentos_cnt'
  RETURNING 1
),
fix_prefeitura_atos_nucleogov AS (
  UPDATE public.prefeitura_atos_nucleogov
  SET fonte_url = CASE
    WHEN tipo ILIKE 'DECRETO%' THEN 'https://acessoainformacao.piracanjuba.go.gov.br/cidadao/legislacao/decretos_cnt'
    WHEN tipo ILIKE 'PORTARIA%' THEN 'https://acessoainformacao.piracanjuba.go.gov.br/cidadao/legislacao/portarias_cnt'
    WHEN tipo ILIKE 'LEI%' THEN 'https://acessoainformacao.piracanjuba.go.gov.br/cidadao/legislacao/leis_cnt'
    ELSE 'https://acessoainformacao.piracanjuba.go.gov.br/'
  END
  WHERE fonte_url = 'https://acessoainformacao.piracanjuba.go.gov.br/cidadao/transparencia/atos_cnt'
  RETURNING 1
)
SELECT 'prefeitura_contratos' AS tabela, count(*) AS atualizadas FROM fix_prefeitura_contratos
UNION ALL
SELECT 'contratos' AS tabela, count(*) AS atualizadas FROM fix_contratos
UNION ALL
SELECT 'prefeitura_aditivos' AS tabela, count(*) AS atualizadas FROM fix_prefeitura_aditivos
UNION ALL
SELECT 'contratos_aditivos' AS tabela, count(*) AS atualizadas FROM fix_contratos_aditivos
UNION ALL
SELECT 'prefeitura_fiscais_contratos' AS tabela, count(*) AS atualizadas FROM fix_prefeitura_fiscais_contratos
UNION ALL
SELECT 'prefeitura_pagamentos_ordem' AS tabela, count(*) AS atualizadas FROM fix_prefeitura_pagamentos_ordem
UNION ALL
SELECT 'prefeitura_atos_nucleogov' AS tabela, count(*) AS atualizadas FROM fix_prefeitura_atos_nucleogov;
