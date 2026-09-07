-- Migração aditiva. Não altera nem remove as obras históricas inferidas.
ALTER TABLE public.obras
  ADD COLUMN IF NOT EXISTS origem_chave text,
  ADD COLUMN IF NOT EXISTS raw_payload jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS obras_origem_chave_key
  ON public.obras (origem_chave);

COMMENT ON COLUMN public.obras.origem_chave IS
  'Identidade oficial prefeitura:nucleogov:obra:<orgao>:<Id>. NULL preserva registros históricos.';
COMMENT ON COLUMN public.obras.raw_payload IS
  'Órgão consultado e registro integral da fonte de obras, incluindo situação declarada e percentual financeiro.';
