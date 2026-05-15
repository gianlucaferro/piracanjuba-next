-- Atividades Legislativas consolidadas (PL Legislativo + PL Executivo + Decretos + Resolucoes + Emendas)
-- Fonte: portal LAI Centi via /api (Caminho J validado)

CREATE TABLE IF NOT EXISTS public.atividade_legislativa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centi_linha_id BIGINT UNIQUE,
  modulo_id INTEGER NOT NULL,
  modulo_nome TEXT,
  ato_tipo TEXT NOT NULL,
  numero TEXT NOT NULL,
  numero_int INTEGER,
  ano INTEGER,
  ato_completo TEXT,
  data_publicacao DATE,
  parlamentar_raw TEXT,
  autores TEXT[],
  autoria_executivo BOOLEAN DEFAULT FALSE,
  descricao_html TEXT,
  descricao_texto TEXT,
  relator TEXT,
  tramitacao_html TEXT,
  situacao TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_atividade_modulo ON public.atividade_legislativa(modulo_id);
CREATE INDEX IF NOT EXISTS idx_atividade_ano ON public.atividade_legislativa(ano DESC NULLS LAST, data_publicacao DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_atividade_situacao ON public.atividade_legislativa(situacao);
CREATE INDEX IF NOT EXISTS idx_atividade_autores_gin ON public.atividade_legislativa USING GIN (autores);

ALTER TABLE public.atividade_legislativa ENABLE ROW LEVEL SECURITY;
CREATE POLICY atividade_select_public ON public.atividade_legislativa FOR SELECT USING (TRUE);

CREATE OR REPLACE FUNCTION public.set_atividade_updated()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_atividade_updated ON public.atividade_legislativa;
CREATE TRIGGER trg_atividade_updated BEFORE UPDATE ON public.atividade_legislativa
  FOR EACH ROW EXECUTE FUNCTION public.set_atividade_updated();
