-- Expansao do schema Centi: folha_servidor + licitacao_camara + ato_camara
-- (mocoes, requerimentos, pareceres, pautas unificados via campo tipo)

ALTER TABLE public.camara_declaracao DROP CONSTRAINT IF EXISTS camara_declaracao_tipo_check;
ALTER TABLE public.camara_declaracao ADD CONSTRAINT camara_declaracao_tipo_check CHECK (tipo IN (
  'inexistencia_cotas', 'inexistencia_concursos', 'inexistencia_terceirizados',
  'inexistencia_estagiarios', 'inexistencia_obras', 'inexistencia_sancoes', 'outros'
));

CREATE TABLE IF NOT EXISTS public.folha_servidor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centi_id BIGINT,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  referencia TEXT,
  matricula TEXT,
  nome TEXT NOT NULL,
  nome_normalizado TEXT,
  cargo TEXT,
  lotacao TEXT,
  data_admissao DATE,
  tipo_admissao TEXT,
  tipo_folha TEXT,
  tipo_movimentacao TEXT,
  situacao TEXT,
  carga_horaria TEXT,
  possui_estabilidade TEXT,
  vereador_id UUID REFERENCES public.vereadores(id) ON DELETE SET NULL,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (centi_id, ano, mes)
);

CREATE INDEX IF NOT EXISTS idx_folha_ref ON public.folha_servidor(ano DESC, mes DESC);
CREATE INDEX IF NOT EXISTS idx_folha_nome ON public.folha_servidor(nome_normalizado);
ALTER TABLE public.folha_servidor ENABLE ROW LEVEL SECURITY;
CREATE POLICY folha_select_public ON public.folha_servidor FOR SELECT USING (TRUE);

CREATE TABLE IF NOT EXISTS public.licitacao_camara (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centi_label TEXT UNIQUE,
  numero TEXT, ano INTEGER,
  modalidade TEXT, modalidade_id INTEGER,
  situacao TEXT, situacao_id INTEGER,
  orgao_id INTEGER, orgao_nome TEXT,
  data_publicacao DATE,
  data_abertura TIMESTAMPTZ,
  data_encerramento TIMESTAMPTZ,
  valor_estimado NUMERIC(15,2),
  valor_homologado NUMERIC(15,2),
  descricao TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_licit_ano ON public.licitacao_camara(ano DESC, data_publicacao DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_licit_situacao ON public.licitacao_camara(situacao);
ALTER TABLE public.licitacao_camara ENABLE ROW LEVEL SECURITY;
CREATE POLICY licit_select_public ON public.licitacao_camara FOR SELECT USING (TRUE);

CREATE TABLE IF NOT EXISTS public.ato_camara (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centi_chave TEXT UNIQUE,
  numero TEXT NOT NULL, ano INTEGER,
  tipo TEXT NOT NULL CHECK (tipo IN ('MOCAO','REQUERIMENTO','PARECER','PAUTA_SESSAO','OUTRO')),
  tipo_centi TEXT,
  data_publicacao DATE,
  ementa TEXT,
  autor TEXT,
  vereador_id UUID REFERENCES public.vereadores(id) ON DELETE SET NULL,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ato_tipo ON public.ato_camara(tipo, ano DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_ato_vereador ON public.ato_camara(vereador_id) WHERE vereador_id IS NOT NULL;
ALTER TABLE public.ato_camara ENABLE ROW LEVEL SECURITY;
CREATE POLICY ato_select_public ON public.ato_camara FOR SELECT USING (TRUE);

CREATE OR REPLACE FUNCTION public.set_centi_updated()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_folha_updated ON public.folha_servidor;
CREATE TRIGGER trg_folha_updated BEFORE UPDATE ON public.folha_servidor FOR EACH ROW EXECUTE FUNCTION public.set_centi_updated();
DROP TRIGGER IF EXISTS trg_licit_updated ON public.licitacao_camara;
CREATE TRIGGER trg_licit_updated BEFORE UPDATE ON public.licitacao_camara FOR EACH ROW EXECUTE FUNCTION public.set_centi_updated();
DROP TRIGGER IF EXISTS trg_ato_updated ON public.ato_camara;
CREATE TRIGGER trg_ato_updated BEFORE UPDATE ON public.ato_camara FOR EACH ROW EXECUTE FUNCTION public.set_centi_updated();

CREATE OR REPLACE FUNCTION public.set_folha_normalizada()
RETURNS TRIGGER AS $$
BEGIN
  NEW.nome_normalizado := LOWER(REGEXP_REPLACE(unaccent(NEW.nome), '\s+', ' ', 'g'));
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_folha_normalizada ON public.folha_servidor;
CREATE TRIGGER trg_folha_normalizada BEFORE INSERT OR UPDATE ON public.folha_servidor
  FOR EACH ROW EXECUTE FUNCTION public.set_folha_normalizada();
