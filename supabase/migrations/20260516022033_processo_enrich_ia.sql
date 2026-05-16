-- Migration: enriquecimento IA + Escavador (movimentacoes, sentenca, resumo)
-- Aplica-se a processo_judicial e recria a view processo_publico
-- pra expor os campos novos pro frontend.

ALTER TABLE public.processo_judicial
  ADD COLUMN IF NOT EXISTS status_predito TEXT,                          -- ATIVO | INATIVO | etc (vindo da fonte Escavador)
  ADD COLUMN IF NOT EXISTS quantidade_movimentacoes INTEGER,             -- total de andamentos consultados
  ADD COLUMN IF NOT EXISTS data_ultima_movimentacao_full DATE,           -- redundancia pra ordenacao
  ADD COLUMN IF NOT EXISTS tem_sentenca BOOLEAN DEFAULT FALSE,           -- TRUE se classificacao_predita contem sentenca/julgamento
  ADD COLUMN IF NOT EXISTS sentenca_resumo TEXT,                         -- snippet bruto da sentenca (data + tipo + ementa)
  ADD COLUMN IF NOT EXISTS movimentacao_recente TEXT,                    -- ultima movimentacao formatada "DD/MM/YYYY — Classificacao"
  ADD COLUMN IF NOT EXISTS resumo_ia TEXT,                               -- resumo gerado pelo Gemini (3-4 frases acessiveis)
  ADD COLUMN IF NOT EXISTS resumo_ia_modelo TEXT,                        -- gemini-2.5-flash-lite | gemini-2.5-flash | etc
  ADD COLUMN IF NOT EXISTS resumo_ia_gerado_em TIMESTAMPTZ;              -- quando foi gerado/atualizado

-- Indice parcial pra speed-up da query "processos sem resumo pendentes de enriquecer"
CREATE INDEX IF NOT EXISTS idx_processo_resumo_ia_pendente
  ON public.processo_judicial(id)
  WHERE visivel_publico = TRUE AND resumo_ia IS NULL;

-- Recriar a view publica com os campos novos
DROP VIEW IF EXISTS public.processo_publico;

CREATE VIEW public.processo_publico
WITH (security_invoker = TRUE) AS
SELECT
  pj.id,
  pj.numero_processo,
  pj.tribunal,
  pj.comarca,
  pj.uf,
  pj.classe,
  pj.assunto,
  pj.tipo_categoria,
  pj.polo,
  pj.data_distribuicao,
  pj.data_ultima_movimentacao,
  pj.status,
  pj.resultado,
  pj.objeto_resumo,
  pj.atualizado_em,
  -- Novos campos enriquecidos
  pj.status_predito,
  pj.quantidade_movimentacoes,
  pj.tem_sentenca,
  pj.sentenca_resumo,
  pj.movimentacao_recente,
  pj.resumo_ia,
  pj.resumo_ia_gerado_em,
  -- Pessoa associada
  pp.id AS pessoa_id,
  pp.nome,
  pp.nome_publico,
  pp.cargo_categoria,
  pp.cargo_detalhe,
  pp.vereador_slug,
  pp.foto_url
FROM public.processo_judicial pj
JOIN public.pessoa_publica pp ON pp.id = pj.pessoa_publica_id
WHERE pj.visivel_publico = TRUE
  AND pp.ativo = TRUE;

GRANT SELECT ON public.processo_publico TO anon, authenticated;

COMMENT ON COLUMN public.processo_judicial.resumo_ia IS
  'Resumo do processo gerado por LLM (Gemini Flash) explicando natureza, situacao e sentenca em linguagem cidada. Atualizado pela edge function enrich-processo-ia.';
COMMENT ON COLUMN public.processo_judicial.tem_sentenca IS
  'Detectado automaticamente percorrendo classificacao_predita das movimentacoes em busca de termos "sentenca/julgamento/transito em julgado".';
COMMENT ON COLUMN public.processo_judicial.status_predito IS
  'Status oficial vindo do Escavador (fontes[0].status_predito). Tem prioridade sobre processo_judicial.status na UI.';
