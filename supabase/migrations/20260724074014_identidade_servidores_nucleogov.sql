-- Nomes nao identificam pessoas. O portal fornece um ID estavel por vinculo,
-- inclusive quando dois servidores possuem exatamente o mesmo nome.
alter table public.servidores
  add column if not exists nucleogov_portal_id bigint,
  add column if not exists origem_chave text;

drop index if exists public.servidores_nome_orgao_unique;
alter table public.servidores
  drop constraint if exists servidores_nome_orgao_unique;
alter table public.servidores
  drop constraint if exists servidores_nome_unique;

create index if not exists servidores_nome_orgao_idx
  on public.servidores (nome, orgao_tipo);

with origem as (
  select nome_normalizado, min(portal_id) as portal_id
  from public.prefeitura_folha_nucleogov
  group by nome_normalizado
  having count(distinct portal_id) = 1
),
candidatos as (
  select
    s.id,
    origem.portal_id,
    row_number() over (partition by origem.portal_id order by s.id) as posicao
  from public.servidores s
  join origem
    on lower(trim(regexp_replace(unaccent(s.nome), '\s+', ' ', 'g'))) =
        lower(origem.nome_normalizado)
  where s.orgao_tipo = 'prefeitura'
    and s.nucleogov_portal_id is null
)
update public.servidores s
set nucleogov_portal_id = candidatos.portal_id
from candidatos
where s.id = candidatos.id
  and candidatos.posicao = 1;

alter table public.servidores
  drop constraint if exists servidores_nucleogov_portal_orgao_key;
alter table public.servidores
  add constraint servidores_nucleogov_portal_orgao_key
  unique (nucleogov_portal_id, orgao_tipo);

update public.servidores
set origem_chave = case
  when nucleogov_portal_id is not null
    then 'prefeitura:nucleogov:' || nucleogov_portal_id::text
  when orgao_tipo = 'camara'
    then 'camara:nome:' || nome
  else coalesce(orgao_tipo, 'desconhecido') || ':legado:' || id::text
end
where origem_chave is null;

alter table public.servidores
  alter column origem_chave set not null;
alter table public.servidores
  drop constraint if exists servidores_origem_chave_key;
alter table public.servidores
  add constraint servidores_origem_chave_key unique (origem_chave);
