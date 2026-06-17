-- Correcao de base do Radar de Risco: troca a identidade da analise de UUID volatil
-- para a trinca de negocio (numero + vigencia_inicio + empresa), que sobrevive a
-- correcoes de valor na fonte (causa das 558 orfas).

-- 1. Colunas da chave estavel
ALTER TABLE public.contratos_risco
  ADD COLUMN IF NOT EXISTS contrato_numero text,
  ADD COLUMN IF NOT EXISTS contrato_vigencia_inicio date,
  ADD COLUMN IF NOT EXISTS contrato_empresa text;

-- 2. Backfill da trinca nas analises validas de prefeitura (contrato_id ainda existe)
UPDATE public.contratos_risco r
SET contrato_numero = c.numero,
    contrato_vigencia_inicio = c.vigencia_inicio,
    contrato_empresa = c.empresa
FROM public.contratos c
WHERE r.contrato_id = c.id AND r.orgao = 'prefeitura';

-- 3. Deletar analises orfas: contrato_id nao existe em nenhuma tabela de contrato.
--    Sao irrecuperaveis (so guardam o UUID morto, sem numero pra re-parear).
DELETE FROM public.contratos_risco r
WHERE NOT EXISTS (SELECT 1 FROM public.contratos c WHERE c.id = r.contrato_id)
  AND NOT EXISTS (SELECT 1 FROM public.contrato_camara c WHERE c.id = r.contrato_id);
