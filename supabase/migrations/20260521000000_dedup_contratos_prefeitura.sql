-- Deduplica a tabela contratos (Prefeitura) e adiciona constraint de unicidade.
--
-- BUG DE FUNDO: a edge function sync-prefeitura-diaria fazia INSERT puro com
-- um dedup manual frágil (`existingKeys` filtrado por vigencia_inicio dentro
-- do ano do loop). Quando vigencia_inicio era null ou de ano diferente do
-- loop, o registro nunca era reconhecido como existente e era re-inserido.
-- Rodando 3x/semana via cron por ~5 meses, acumulou ate 59 copias por
-- contrato — 9.863 linhas pra 4.787 contratos reais.
--
-- Correcao em 2 partes:
--  1. (esta migration) deduplica mantendo o registro mais completo de cada
--     grupo + cria UNIQUE constraint.
--  2. (codigo) sync-prefeitura-diaria passa a usar UPSERT com onConflict
--     nessa constraint — idempotente.

-- ── 1. Deduplica ──────────────────────────────────────────────
-- Mantem 1 registro por (numero, vigencia_inicio, empresa, valor),
-- priorizando o mais rico: tem objeto > tem CNPJ enriquecido >
-- tem secretaria > tem vigencia_fim > updated_at mais recente.
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY numero, vigencia_inicio, empresa, valor
      ORDER BY
        (objeto IS NOT NULL) DESC,
        (empresa_cnpj IS NOT NULL) DESC,
        (secretaria_id IS NOT NULL) DESC,
        (vigencia_fim IS NOT NULL) DESC,
        updated_at DESC NULLS LAST,
        id
    ) AS rn
  FROM public.contratos
)
DELETE FROM public.contratos
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- ── 2. Constraint de unicidade ────────────────────────────────
-- NULLS NOT DISTINCT (Postgres 15+) trata NULL como valor igual —
-- necessario porque vigencia_inicio e valor podem ser null.
ALTER TABLE public.contratos
  ADD CONSTRAINT contratos_uniq_negocio
  UNIQUE NULLS NOT DISTINCT (numero, vigencia_inicio, empresa, valor);

COMMENT ON CONSTRAINT contratos_uniq_negocio ON public.contratos IS
  'Impede re-insercao de contratos duplicados pelo sync-prefeitura-diaria. Use UPSERT com onConflict nesta chave.';
