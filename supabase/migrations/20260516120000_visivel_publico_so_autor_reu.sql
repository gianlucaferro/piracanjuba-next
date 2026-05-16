-- Migration: restringir processos visiveis a polo IN ('autor', 'reu').
--
-- Decisao editorial: so exibir processos onde o agente publico figura
-- como AUTOR ou REU. Casos com polo 'interessado' (jurisdicao voluntaria,
-- prestacao de contas eleitorais como interessado, termos circunstanciados
-- como envolvido nao-parte) ou 'terceiro' nao aparecem mais.
--
-- Reduz risco juridico: pessoa como "interessado" pode ser apenas mencionado
-- num processo onde nao tem culpa nem participacao direta. Manter visivel
-- aumenta chance de difamacao por exposicao indevida.
--
-- Impacto: ~99 visiveis -> ~84 visiveis (15 polo='interessado' filtrados).

DROP POLICY IF EXISTS processo_select_public ON public.processo_judicial;
DROP VIEW IF EXISTS public.processo_publico;

ALTER TABLE public.processo_judicial
  DROP COLUMN visivel_publico CASCADE;

ALTER TABLE public.processo_judicial
  ADD COLUMN visivel_publico BOOLEAN GENERATED ALWAYS AS (
    (NOT segredo_justica)
    AND polo IN ('autor', 'reu')
    AND tipo_categoria <> 'familia'
    AND papel_advogado = FALSE
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_processo_resumo_ia_pendente
  ON public.processo_judicial(id)
  WHERE visivel_publico = TRUE AND resumo_ia IS NULL;

-- Recriar policy de leitura publica
CREATE POLICY processo_select_public ON public.processo_judicial
  FOR SELECT TO anon, authenticated
  USING (visivel_publico = TRUE);

-- Recriar view publica
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
  pj.status_predito,
  pj.quantidade_movimentacoes,
  pj.tem_sentenca,
  pj.sentenca_resumo,
  pj.movimentacao_recente,
  pj.resumo_ia,
  pj.resumo_ia_gerado_em,
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

COMMENT ON COLUMN public.processo_judicial.visivel_publico IS
  'TRUE se: nao em segredo de justica, pessoa figura como AUTOR ou REU (nao interessado/terceiro/vitima/testemunha), nao e acao de familia, e pessoa NAO atua apenas como advogado de terceiros.';
