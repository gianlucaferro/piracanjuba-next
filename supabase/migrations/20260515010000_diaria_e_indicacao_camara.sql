-- Dados extraidos via Caminho J (centi-fetch direto no /api do Centi)
-- Atualizado mensalmente via cron sync-diarias-camara e sync-indicacoes-camara

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE IF NOT EXISTS public.diaria_camara (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centi_id BIGINT UNIQUE,
  centi_id_empenho BIGINT,
  favorecido TEXT NOT NULL,
  favorecido_normalizado TEXT,
  cargo TEXT,
  destino TEXT,
  cidade TEXT,
  valor NUMERIC(10,2),
  data_inicio DATE,
  data_fim DATE,
  quantidade INTEGER,
  descricao TEXT,
  vereador_id UUID REFERENCES public.vereadores(id) ON DELETE SET NULL,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diaria_favorecido_norm ON public.diaria_camara(favorecido_normalizado);
CREATE INDEX IF NOT EXISTS idx_diaria_data_inicio ON public.diaria_camara(data_inicio DESC);
CREATE INDEX IF NOT EXISTS idx_diaria_vereador ON public.diaria_camara(vereador_id) WHERE vereador_id IS NOT NULL;

ALTER TABLE public.diaria_camara ENABLE ROW LEVEL SECURITY;
CREATE POLICY diaria_select_public ON public.diaria_camara FOR SELECT USING (TRUE);

CREATE OR REPLACE FUNCTION public.set_diaria_normalizada()
RETURNS TRIGGER AS $$
BEGIN
  NEW.favorecido_normalizado := LOWER(REGEXP_REPLACE(unaccent(NEW.favorecido), '\s+', ' ', 'g'));
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_diaria_normalizada ON public.diaria_camara;
CREATE TRIGGER trg_diaria_normalizada BEFORE INSERT OR UPDATE ON public.diaria_camara
  FOR EACH ROW EXECUTE FUNCTION public.set_diaria_normalizada();

CREATE TABLE IF NOT EXISTS public.indicacao_camara (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centi_chave TEXT UNIQUE,
  numero TEXT NOT NULL,
  numero_ano INTEGER,
  ano INTEGER,
  tipo TEXT NOT NULL,
  data_publicacao DATE,
  ementa TEXT,
  autor TEXT,
  destinatario TEXT,
  vereador_id UUID REFERENCES public.vereadores(id) ON DELETE SET NULL,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_indicacao_ano ON public.indicacao_camara(ano DESC, data_publicacao DESC);
CREATE INDEX IF NOT EXISTS idx_indicacao_tipo ON public.indicacao_camara(tipo);
CREATE INDEX IF NOT EXISTS idx_indicacao_vereador ON public.indicacao_camara(vereador_id) WHERE vereador_id IS NOT NULL;

ALTER TABLE public.indicacao_camara ENABLE ROW LEVEL SECURITY;
CREATE POLICY indicacao_select_public ON public.indicacao_camara FOR SELECT USING (TRUE);

CREATE OR REPLACE FUNCTION public.set_indicacao_updated()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_indicacao_updated ON public.indicacao_camara;
CREATE TRIGGER trg_indicacao_updated BEFORE UPDATE ON public.indicacao_camara
  FOR EACH ROW EXECUTE FUNCTION public.set_indicacao_updated();
