-- Fecha vazamento LGPD: tira cpf (pessoa_publica) e raw_payload (processo_judicial)
-- do alcance da API publica (anon/authenticated). RLS filtra linha, nao coluna;
-- por isso usamos GRANT por coluna. Os dados permanecem no banco: service_role e
-- os syncs continuam lendo cpf/raw_payload normalmente. Verificado que o frontend
-- nao seleciona essas colunas (queries usam colunas explicitas).

-- pessoa_publica: concede tudo MENOS cpf
REVOKE SELECT ON public.pessoa_publica FROM anon, authenticated;
GRANT SELECT (
  id, nome, nome_publico, cargo_categoria, cargo_detalhe,
  mandato_inicio, mandato_fim, ativo, vereador_slug, foto_url,
  email_contato, fonte_url, observacoes, created_at, updated_at
) ON public.pessoa_publica TO anon, authenticated;

-- processo_judicial: concede tudo MENOS raw_payload
REVOKE SELECT ON public.processo_judicial FROM anon, authenticated;
GRANT SELECT (
  id, pessoa_publica_id, numero_processo, tribunal, comarca, uf, classe,
  assunto, tipo_categoria, polo, data_distribuicao, data_ultima_movimentacao,
  status, resultado, objeto_resumo, valor_causa, segredo_justica, source,
  primeiro_visto_em, atualizado_em, papel_advogado, oab_numero, status_predito,
  quantidade_movimentacoes, data_ultima_movimentacao_full, tem_sentenca,
  sentenca_resumo, movimentacao_recente, resumo_ia, resumo_ia_modelo,
  resumo_ia_gerado_em, visivel_publico
) ON public.processo_judicial TO anon, authenticated;
