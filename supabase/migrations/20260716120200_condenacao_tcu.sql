-- Condenações do TCU: inidôneos (empresas barradas de licitar, Lei 8.443/92 art.46)
-- e inabilitados (pessoas barradas de cargo em comissão). Fonte: API ORDS pública do TCU.
-- Sentinela: cruza por CNPJ com fornecedores e por CPF (6 dígitos do meio) com sócios.
-- Aplicada no banco remoto em 2026-07-16 via MCP; arquivo espelha o schema no repo.
create table if not exists public.condenacao_tcu (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('inidoneo','inabilitado')),
  nome text not null,
  doc text,
  doc_digitos text not null,
  doc_tipo text not null check (doc_tipo in ('CNPJ','CPF')),
  uf text,
  municipio text,
  processo text,
  deliberacao text,
  data_transito date,
  data_final date,
  fonte text not null default 'TCU - condenações (inidôneos/inabilitados)',
  atualizado_em timestamptz not null default now(),
  unique (doc_digitos, processo, tipo)
);
create index if not exists idx_tcu_doc on public.condenacao_tcu(doc_digitos);
alter table public.condenacao_tcu enable row level security;
drop policy if exists "Condenações TCU são públicas" on public.condenacao_tcu;
create policy "Condenações TCU são públicas" on public.condenacao_tcu for select to public using (true);
