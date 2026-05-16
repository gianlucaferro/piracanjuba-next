-- Migration: backfill papel_advogado pra processos onde a pessoa publica
-- aparece SOMENTE como advogado (tipos_envolvido_pesquisado = ["Advogado"]).
--
-- Bug detectado em prod: o detector original da edge sync-processos-escavador
-- marcava papel_advogado=FALSE em alguns casos onde a Escavador retornava
-- claramente "tipos_envolvido_pesquisado": [{"polo":"ADVOGADO","tipo":"Advogado"}].
-- O caminho secundario do detector (que olha envolvidos[]) sobrescrevia o sinal
-- oficial quando encontrava o CPF da pessoa num envolvido com tipo vazio.
--
-- Esse backfill corrige os ~20 casos existentes. A correcao definitiva no
-- detector ja foi deployada na edge sync-processos-escavador
-- (priorizando tipos_envolvido_pesquisado sobre envolvidos[]).
--
-- Como visivel_publico e GENERATED column dependente de papel_advogado, a view
-- processo_publico passa automaticamente a esconder esses processos.

WITH alvos AS (
  SELECT pj.id
  FROM processo_judicial pj
  WHERE pj.papel_advogado = FALSE
    AND (
      SELECT jsonb_agg(DISTINCT t->>'tipo_normalizado')
      FROM jsonb_array_elements(COALESCE(pj.raw_payload->'fontes', '[]'::jsonb)) AS f,
           jsonb_array_elements(COALESCE(f->'tipos_envolvido_pesquisado', '[]'::jsonb)) AS t
    ) = '["Advogado"]'::jsonb
)
UPDATE processo_judicial
SET papel_advogado = TRUE,
    atualizado_em = NOW()
WHERE id IN (SELECT id FROM alvos);
