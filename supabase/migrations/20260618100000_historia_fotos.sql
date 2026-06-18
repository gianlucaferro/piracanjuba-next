-- Fotos da história enviadas pelos moradores na página /historia-pba.
-- Ficam pendentes até o operador moderar no painel admin. Bucket privado:
-- só a edge function (service_role) escreve/lê; o admin vê via signed URL.

create table if not exists public.historia_fotos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  original_name text,
  descricao text,
  autor_nome text,
  status text not null default 'pendente', -- pendente | aprovada | rejeitada
  ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists idx_historia_fotos_status on public.historia_fotos (status, created_at desc);

alter table public.historia_fotos enable row level security;

comment on table public.historia_fotos is
  'Fotos da história enviadas pelos moradores na página /historia-pba, moderadas no admin. Sem policy: apenas service_role (edge function historia-fotos) acessa.';

insert into storage.buckets (id, name, public)
values ('historia-fotos', 'historia-fotos', false)
on conflict (id) do nothing;
