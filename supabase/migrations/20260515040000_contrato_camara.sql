CREATE TABLE IF NOT EXISTS public.contrato_camara (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centi_id BIGINT UNIQUE,
  label TEXT NOT NULL,
  numero TEXT,
  numero_int INTEGER,
  ano INTEGER,
  orgao_id INTEGER,
  orgao_nome TEXT,
  licitacao_id BIGINT,
  valor NUMERIC(15,2),
  data_publicacao DATE,
  data_firmatura DATE,
  inicio_vigencia DATE,
  fim_vigencia DATE,
  fornecedor_nome TEXT,
  fornecedor_cnpj TEXT,
  fornecedor_cnpj_limpo TEXT,
  fiscal_contrato TEXT,
  situacao TEXT,
  objeto TEXT,
  assunto TEXT,
  tipo TEXT,
  tipo_ajuste TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contrato_ano ON public.contrato_camara(ano DESC NULLS LAST, data_publicacao DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_contrato_fornecedor ON public.contrato_camara(fornecedor_cnpj_limpo);
CREATE INDEX IF NOT EXISTS idx_contrato_situacao ON public.contrato_camara(situacao);

ALTER TABLE public.contrato_camara ENABLE ROW LEVEL SECURITY;
CREATE POLICY contrato_select_public ON public.contrato_camara FOR SELECT USING (TRUE);

CREATE OR REPLACE FUNCTION public.set_contrato_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fornecedor_cnpj_limpo := COALESCE(regexp_replace(NEW.fornecedor_cnpj, '[^0-9]', '', 'g'), NULL);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_contrato_updated ON public.contrato_camara;
CREATE TRIGGER trg_contrato_updated BEFORE INSERT OR UPDATE ON public.contrato_camara
  FOR EACH ROW EXECUTE FUNCTION public.set_contrato_updated();
