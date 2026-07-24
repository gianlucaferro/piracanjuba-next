-- Todos os writers ativos usam uma chave de origem explicita. Isso permite
-- homonimos na Prefeitura sem quebrar a sincronizacao da Camara.
alter table public.servidores
  add column if not exists origem_chave text;

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
