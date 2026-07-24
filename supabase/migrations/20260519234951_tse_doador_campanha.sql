-- Fonte versionada das doacoes eleitorais usadas pelos cruzamentos.

create table if not exists public.tse_doador_campanha (
  id bigserial primary key,
  ano_eleicao integer not null,
  cpf_candidato text,
  nome_candidato text not null,
  ds_cargo text not null,
  sg_partido text,
  cpf_cnpj_doador text not null,
  nome_doador text not null,
  tipo_doador text,
  vr_receita numeric not null,
  ds_recurso text,
  dt_receita date,
  pessoa_publica_id uuid
    references public.pessoa_publica(id) on delete set null,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  unique (
    ano_eleicao,
    cpf_candidato,
    cpf_cnpj_doador,
    vr_receita,
    dt_receita
  )
);

create index if not exists idx_tse_doador_ano
  on public.tse_doador_campanha (ano_eleicao);
create index if not exists idx_tse_doador_candidato
  on public.tse_doador_campanha (cpf_candidato);
create index if not exists idx_tse_doador_pessoa
  on public.tse_doador_campanha (pessoa_publica_id);

alter table public.tse_doador_campanha enable row level security;

drop policy if exists tse_doador_select_public
  on public.tse_doador_campanha;
create policy tse_doador_select_public
  on public.tse_doador_campanha
  for select to anon, authenticated
  using (true);

grant select on public.tse_doador_campanha to anon, authenticated;
grant all on public.tse_doador_campanha to service_role;
grant usage, select on sequence public.tse_doador_campanha_id_seq
  to service_role;
