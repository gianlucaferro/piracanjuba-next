-- Processos Judiciais de Pessoas Públicas
-- Base civic-tech: agentes políticos têm publicidade reduzida (CF art. 37, Lei 12.527, LGPD art. 7º IX)
-- Filtros obrigatórios: segredo de justiça, polo "vítima", processos de família

-- ============================================================
-- Tabela 1: pessoa_publica
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pessoa_publica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf TEXT NOT NULL UNIQUE,                 -- só dígitos (11 chars)
  nome TEXT NOT NULL,
  nome_publico TEXT,                        -- nome de uso público (apelido político)
  cargo_categoria TEXT NOT NULL CHECK (cargo_categoria IN
    ('vereador','prefeito','vice_prefeito','secretario','presidente_camara','servidor_comissionado')),
  cargo_detalhe TEXT,                       -- "Secretário de Saúde", "Presidente"
  mandato_inicio DATE,
  mandato_fim DATE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  vereador_slug TEXT,                       -- link com /vereadores/[slug]
  foto_url TEXT,
  email_contato TEXT,                       -- pra direito de resposta
  fonte_url TEXT,                           -- onde foi obtido o CPF (TSE, Portal Transp, etc)
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pessoa_publica_slug ON public.pessoa_publica(vereador_slug) WHERE vereador_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pessoa_publica_cargo ON public.pessoa_publica(cargo_categoria) WHERE ativo;

COMMENT ON TABLE public.pessoa_publica IS
  'Agentes políticos e públicos monitorados via cron BigData. CPFs obtidos por fontes públicas (TSE, Portal Transparência).';

-- ============================================================
-- Tabela 2: processo_judicial (snapshot do BigData)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.processo_judicial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_publica_id UUID NOT NULL REFERENCES public.pessoa_publica(id) ON DELETE CASCADE,
  numero_processo TEXT,
  tribunal TEXT,
  comarca TEXT,
  uf TEXT,
  classe TEXT,                              -- "Ação Civil Pública", "Procedimento Comum Cível"
  assunto TEXT,
  tipo_categoria TEXT CHECK (tipo_categoria IN
    ('civel','criminal','trabalhista','eleitoral','tributario','administrativo','familia','outro')),
  polo TEXT CHECK (polo IN ('autor','reu','interessado','terceiro','vitima','testemunha')),
  data_distribuicao DATE,
  data_ultima_movimentacao DATE,
  status TEXT,                              -- 'ativo','arquivado','baixado','suspenso','julgado'
  resultado TEXT,                           -- 'procedente','improcedente','parcial','extinto'
  objeto_resumo TEXT,
  valor_causa NUMERIC(15,2),
  segredo_justica BOOLEAN NOT NULL DEFAULT FALSE,
  visivel_publico BOOLEAN GENERATED ALWAYS AS (
    NOT segredo_justica
    AND polo NOT IN ('vitima','testemunha')
    AND tipo_categoria != 'familia'
  ) STORED,
  source TEXT NOT NULL DEFAULT 'bigdatacorp',
  raw_payload JSONB,                        -- pra debug e auditoria
  primeiro_visto_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pessoa_publica_id, numero_processo)
);

CREATE INDEX IF NOT EXISTS idx_processo_pessoa_visivel
  ON public.processo_judicial(pessoa_publica_id) WHERE visivel_publico;
CREATE INDEX IF NOT EXISTS idx_processo_tipo
  ON public.processo_judicial(tipo_categoria) WHERE visivel_publico;
CREATE INDEX IF NOT EXISTS idx_processo_status
  ON public.processo_judicial(status) WHERE visivel_publico;

COMMENT ON TABLE public.processo_judicial IS
  'Snapshot bimestral de processos via BigData Corp. visivel_publico filtra segredo de justiça, vítima, família.';

-- ============================================================
-- Tabela 3: processo_sync_log (auditoria)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.processo_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_publica_id UUID REFERENCES public.pessoa_publica(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('success','partial','error')),
  processos_encontrados INT DEFAULT 0,
  processos_novos INT DEFAULT 0,
  processos_atualizados INT DEFAULT 0,
  processos_filtrados INT DEFAULT 0,         -- removidos por segredo/vítima/família
  bigdata_request_id TEXT,
  custo_brl NUMERIC(10,4),
  erro TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_log_pessoa ON public.processo_sync_log(pessoa_publica_id, executed_at DESC);

-- ============================================================
-- Tabela 4: processo_contestacao (direito de resposta)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.processo_contestacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_publica_id UUID NOT NULL REFERENCES public.pessoa_publica(id) ON DELETE CASCADE,
  processo_judicial_id UUID REFERENCES public.processo_judicial(id) ON DELETE SET NULL,
  mensagem TEXT NOT NULL,
  email_solicitante TEXT NOT NULL,
  nome_solicitante TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN
    ('pendente','em_analise','aceita','rejeitada')),
  resposta TEXT,
  respondido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contestacao_status ON public.processo_contestacao(status, created_at DESC);

-- ============================================================
-- RLS — público lê só dados visíveis; service_role gerencia tudo
-- ============================================================
ALTER TABLE public.pessoa_publica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processo_judicial ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processo_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processo_contestacao ENABLE ROW LEVEL SECURITY;

-- pessoa_publica: público lê só ativos, sem ver CPF
CREATE POLICY pessoa_publica_select_public ON public.pessoa_publica
  FOR SELECT USING (ativo = TRUE);

-- processo_judicial: público lê só visivel_publico = TRUE
CREATE POLICY processo_select_public ON public.processo_judicial
  FOR SELECT USING (visivel_publico = TRUE);

-- contestacao: usuário insere; só service_role lê tudo (admin)
CREATE POLICY contestacao_insert_anyone ON public.processo_contestacao
  FOR INSERT WITH CHECK (TRUE);

-- sync_log: leitura agregada pública (sem CPF), insert só service_role
CREATE POLICY sync_log_select_public ON public.processo_sync_log
  FOR SELECT USING (TRUE);

-- ============================================================
-- View pública pra frontend (sem CPF exposto)
-- ============================================================
CREATE OR REPLACE VIEW public.processo_publico AS
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
  pp.id AS pessoa_id,
  pp.nome,
  pp.nome_publico,
  pp.cargo_categoria,
  pp.cargo_detalhe,
  pp.vereador_slug,
  pp.foto_url
FROM public.processo_judicial pj
JOIN public.pessoa_publica pp ON pp.id = pj.pessoa_publica_id
WHERE pj.visivel_publico = TRUE AND pp.ativo = TRUE;

GRANT SELECT ON public.processo_publico TO anon, authenticated;

COMMENT ON VIEW public.processo_publico IS
  'View segura pra frontend: omite CPF, mostra só processos visíveis publicamente.';

-- ============================================================
-- Trigger updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_pessoa_publica_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pessoa_publica_updated_at ON public.pessoa_publica;
CREATE TRIGGER trg_pessoa_publica_updated_at
  BEFORE UPDATE ON public.pessoa_publica
  FOR EACH ROW EXECUTE FUNCTION public.set_pessoa_publica_updated_at();
