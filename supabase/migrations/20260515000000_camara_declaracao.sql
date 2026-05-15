-- Declaracoes oficiais da Camara coletadas via portal LAI Centi
-- Casos uteis: "Inexistencia de Regulamentacao" (cotas, fundos, etc)
-- "Inexistencia de Registros" (concursos, processos seletivos)

CREATE TABLE IF NOT EXISTS public.camara_declaracao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN (
    'inexistencia_cotas',
    'inexistencia_concursos',
    'inexistencia_terceirizados',
    'inexistencia_estagiarios',
    'outros'
  )),
  titulo TEXT NOT NULL,
  texto TEXT NOT NULL,
  data_inicio_vigencia DATE,
  data_fim_vigencia DATE,
  data_assinatura TIMESTAMPTZ,
  fonte_url TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'centi/atosadministrativos',
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_camara_declaracao_tipo ON public.camara_declaracao(tipo);

ALTER TABLE public.camara_declaracao ENABLE ROW LEVEL SECURITY;
CREATE POLICY declaracao_select_public ON public.camara_declaracao
  FOR SELECT USING (TRUE);

INSERT INTO public.camara_declaracao (
  tipo, titulo, texto,
  data_inicio_vigencia, data_fim_vigencia, data_assinatura,
  fonte_url, raw_payload
) VALUES (
  'inexistencia_cotas',
  'Inexistencia de cotas e verba indenizatoria parlamentar',
  'A Camara de Piracanjuba declara Inexistencia de Regulamentacao ou valores relativos as cotas para exercicio da atividade parlamentar ou verba indenizatoria no periodo consultado, 01 de Janeiro de 2023 ate 13 de Maio de 2026.',
  '2023-01-01', NULL, '2026-05-13 10:25:22-03',
  'https://acessoainformacao.piracanjuba.go.leg.br/cidadao/transparencia/gastosparlamentares',
  '{"tabela":"declaracoes","id":"15","data":"2023-01-01","origem":"centi/api","capturado_em":"2026-05-15"}'::jsonb
) ON CONFLICT DO NOTHING;
