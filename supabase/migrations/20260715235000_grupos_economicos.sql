-- Grupos econômicos: empresas com contrato (prefeitura/câmara) que compartilham
-- sócios (componentes conexos do grafo sócio<->empresa, derivado de
-- fornecedores_cnpj.socios / QSA da Receita). Cabeçalho + membros. Leitura pública.
create table if not exists public.grupo_economico (
  id uuid primary key default gen_random_uuid(),
  rotulo text not null,
  setor text,
  tipo text not null default 'socio_comum',
  n_empresas int not null,
  valor_total numeric not null default 0,
  socios_conectores jsonb not null default '[]'::jsonb,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.grupo_economico_membro (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.grupo_economico(id) on delete cascade,
  cnpj text not null,
  razao_social text,
  poderes text[] not null default '{}',
  n_contratos int not null default 0,
  valor numeric not null default 0,
  unique (grupo_id, cnpj)
);

create index if not exists idx_grupo_membro_cnpj on public.grupo_economico_membro(cnpj);
create index if not exists idx_grupo_membro_grupo on public.grupo_economico_membro(grupo_id);

alter table public.grupo_economico enable row level security;
alter table public.grupo_economico_membro enable row level security;

create policy "Grupos economicos sao publicos" on public.grupo_economico for select to public using (true);
create policy "Membros de grupo sao publicos" on public.grupo_economico_membro for select to public using (true);
