-- Lista Suja do Trabalho Escravo (Cadastro de Empregadores - MTE). Fonte é PDF de
-- portaria semestral (sem API), então a atualização é manual (parse do PDF). Serve
-- de sentinela: cruza por CNPJ com fornecedores e por CPF (6 dígitos do meio) com sócios.
-- Aplicada no banco remoto em 2026-07-16 via MCP; arquivo espelha o schema no repo.
create table if not exists public.empregador_trabalho_escravo (
  id uuid primary key default gen_random_uuid(),
  id_lista int,
  ano_acao int,
  uf text,
  nome text not null,
  doc text,
  doc_digitos text,
  doc_tipo text,
  estabelecimento text,
  fonte text not null default 'Cadastro de Empregadores (Lista Suja) - MTE',
  atualizado_em timestamptz not null default now(),
  unique (doc_digitos, id_lista)
);
create index if not exists idx_tesc_doc on public.empregador_trabalho_escravo(doc_digitos);
alter table public.empregador_trabalho_escravo enable row level security;
drop policy if exists "Lista suja é pública" on public.empregador_trabalho_escravo;
create policy "Lista suja é pública" on public.empregador_trabalho_escravo for select to public using (true);
