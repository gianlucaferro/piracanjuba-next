-- Adiciona filtro de papel_advogado em processo_judicial
-- Motivacao: vereadores que sao advogados (Wennder Trindade tem 195/225 processos
-- so como advogado de terceiros — nao deve aparecer no painel publico).
--
-- Detecta via raw_payload do Escavador:
--   fontes[].tipos_envolvido_pesquisado[].polo === 'ADVOGADO'
-- Quando TODAS as fontes marcam ADVOGADO, papel_advogado = TRUE.

-- Recriar coluna gerada visivel_publico com filtro novo (e dropar dependencias)
DROP POLICY IF EXISTS processo_select_public ON public.processo_judicial;
DROP VIEW IF EXISTS public.processo_publico CASCADE;
ALTER TABLE public.processo_judicial DROP COLUMN IF EXISTS visivel_publico CASCADE;

ALTER TABLE public.processo_judicial
  ADD COLUMN IF NOT EXISTS papel_advogado BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS oab_numero TEXT;

ALTER TABLE public.processo_judicial ADD COLUMN visivel_publico BOOLEAN GENERATED ALWAYS AS (
  NOT segredo_justica
  AND polo NOT IN ('vitima','testemunha')
  AND tipo_categoria != 'familia'
  AND papel_advogado = FALSE
) STORED;

CREATE INDEX IF NOT EXISTS idx_processo_pessoa_visivel
  ON public.processo_judicial(pessoa_publica_id) WHERE visivel_publico;
CREATE INDEX IF NOT EXISTS idx_processo_papel
  ON public.processo_judicial(papel_advogado);

CREATE POLICY processo_select_public ON public.processo_judicial
  FOR SELECT USING (visivel_publico = TRUE);

CREATE VIEW public.processo_publico AS
SELECT
  pj.id, pj.numero_processo, pj.tribunal, pj.comarca, pj.uf,
  pj.classe, pj.assunto, pj.tipo_categoria, pj.polo,
  pj.data_distribuicao, pj.data_ultima_movimentacao,
  pj.status, pj.resultado, pj.objeto_resumo, pj.atualizado_em,
  pp.id AS pessoa_id, pp.nome, pp.nome_publico,
  pp.cargo_categoria, pp.cargo_detalhe, pp.vereador_slug, pp.foto_url
FROM public.processo_judicial pj
JOIN public.pessoa_publica pp ON pp.id = pj.pessoa_publica_id
WHERE pj.visivel_publico = TRUE AND pp.ativo = TRUE;

GRANT SELECT ON public.processo_publico TO anon, authenticated;

-- Backfill: marca papel_advogado=TRUE quando todas fontes apontam ADVOGADO
UPDATE public.processo_judicial pj
SET papel_advogado = TRUE
WHERE source = 'escavador'
  AND jsonb_array_length(raw_payload->'fontes') > 0
  AND (
    SELECT bool_and(
      EXISTS (
        SELECT 1 FROM jsonb_array_elements(f->'tipos_envolvido_pesquisado') t
        WHERE t->>'polo' = 'ADVOGADO' OR t->>'tipo_normalizado' = 'Advogado'
      )
    )
    FROM jsonb_array_elements(raw_payload->'fontes') f
  ) = TRUE;

-- Backfill oab_numero (a partir do raw_payload, quando o advogado tem OAB cadastrada)
UPDATE public.processo_judicial pj
SET oab_numero = oab.oab
FROM (
  SELECT pj.id,
    (
      SELECT (oab->>'uf') || ' ' || (oab->>'numero')
      FROM jsonb_array_elements(raw_payload->'fontes') f,
           jsonb_array_elements(f->'envolvidos') e,
           jsonb_array_elements(e->'oabs') oab
      WHERE e->>'cpf' = pp.cpf
        OR regexp_replace(e->>'cpf', '\D', '', 'g') = pp.cpf
      LIMIT 1
    ) as oab
  FROM public.processo_judicial pj
  JOIN public.pessoa_publica pp ON pp.id = pj.pessoa_publica_id
  WHERE pj.papel_advogado = TRUE
) oab
WHERE pj.id = oab.id AND oab.oab IS NOT NULL;
