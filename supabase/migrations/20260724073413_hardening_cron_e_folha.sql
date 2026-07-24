-- O helper contem acesso ao segredo dos crons e so pode ser chamado pelo
-- usuario postgres, que tambem e o proprietario dos jobs do pg_cron.
revoke execute on function public.invoke_edge_function_secure(text, jsonb)
  from public, anon, authenticated;
grant execute on function public.invoke_edge_function_secure(text, jsonb)
  to postgres;

-- A folha pode ter mais de um tipo no mesmo mes. Esta chave reproduz em um
-- banco novo o contrato que ja esta ativo em producao.
update public.remuneracao_servidores
set tipo_folha = 'NORMAL'
where tipo_folha is null or btrim(tipo_folha) = '';

alter table public.remuneracao_servidores
  alter column tipo_folha set default 'NORMAL',
  alter column tipo_folha set not null;

alter table public.remuneracao_servidores
  drop constraint if exists remuneracao_servidores_servidor_competencia_key;

alter table public.remuneracao_servidores
  drop constraint if exists remuneracao_servidores_servidor_competencia_tipo_key;

alter table public.remuneracao_servidores
  add constraint remuneracao_servidores_servidor_competencia_tipo_key
  unique (servidor_id, competencia, tipo_folha);
