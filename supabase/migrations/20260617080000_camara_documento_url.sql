-- Captura a URL do PDF do documento (contrato/edital) da camara, vindo da API Centi
-- (campo FileKey/FileName em item.docs / item.Documentos -> /download/{FileKey}/{FileName}).
-- Permite que os resumos de IA leiam o teor real do PDF (antes era so metadados/objeto).
alter table public.camara_contratos add column if not exists documento_url text;
alter table public.camara_licitacoes add column if not exists documento_url text;
