-- Flag de "ja tentei buscar o objeto deste contrato na pagina de detalhe do Centi".
-- Evita reprocessar em loop os contratos cuja pagina nao traz objeto preenchido.
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS objeto_sync_em timestamptz;
