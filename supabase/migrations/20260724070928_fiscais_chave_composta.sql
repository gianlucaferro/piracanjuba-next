-- Um contrato pode ter mais de um fiscal. A chave do portal identifica o
-- contrato, entao a unicidade correta inclui tambem o nome normalizado do fiscal.
alter table public.prefeitura_fiscais_contratos
  add column if not exists chave text;

update public.prefeitura_fiscais_contratos
set chave = portal_key::text || ':' ||
  upper(regexp_replace(coalesce(fiscal_nome, ''), '\s+', ' ', 'g'))
where chave is null;

alter table public.prefeitura_fiscais_contratos
  drop constraint if exists prefeitura_fiscais_contratos_pkey;

alter table public.prefeitura_fiscais_contratos
  alter column chave set not null;

alter table public.prefeitura_fiscais_contratos
  add constraint prefeitura_fiscais_contratos_pkey primary key (chave);

create index if not exists prefeitura_fiscais_portal_key_idx
  on public.prefeitura_fiscais_contratos (portal_key);
