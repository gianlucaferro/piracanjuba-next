-- Cutover atomico de quatro crons para autenticacao server-side.
-- Preserva integralmente a funcao segura, exceto pelos quatro nomes adicionados.
-- Nenhuma agenda, estado ativo ou segredo e escrito no arquivo.
do $cutover$
declare
  definition text;
  corrected text;
  rec record;
  id_job bigint;
  digest text;
  expected_secure text;
begin
  select pg_get_functiondef('public.invoke_edge_function_secure(text,jsonb)'::regprocedure)
  into definition;
  if md5(definition) = '04d153e73fbc239de9337a96bb8a8373' then
    corrected := replace(definition,
      $anchor$      'sync-aditivos-prefeitura-nucleogov',$anchor$,
      $addition$      'sync-health-check',
      'sync-saude-indicadores',
      'sync-tcm-go-piracanjuba',
      'sync-presenca-centi',
      'sync-aditivos-prefeitura-nucleogov',$addition$);
    if md5(corrected) <> 'b18877c8898255f7a09c0261b009c088' then
      raise exception 'alteracao da allowlist diverge da revisao';
    end if;
    execute corrected;
  elsif md5(definition) <> 'b18877c8898255f7a09c0261b009c088' then
    raise exception 'wrapper seguro mudou desde o backup; revisar antes do cutover';
  end if;
  for rec in select * from (values
      ('sync-presenca-centi-weekly', 'sync-presenca-centi', '4df2eee01f00feb3b26d590da33564a3'),
      ('sync-tcm-go-piracanjuba-weekly', 'sync-tcm-go-piracanjuba', 'e8f24a7e02f37c9dc222d1673b134f5a'),
      ('sync-saude-indicadores-weekly', 'sync-saude-indicadores', 'ac3f34d067f834d42e2bebb58802179d'),
      ('sync-health-check-daily', 'sync-health-check', 'ea0d89d0a75967eb79b0760e2e0b3382')
  ) v(jobname,function_name,old_md5)
  loop
    expected_secure := format('SELECT public.invoke_edge_function_secure(%L);',rec.function_name);
    select j.jobid,md5(j.command) into id_job,digest
    from cron.job j where j.jobname=rec.jobname;
    if id_job is null or digest not in (rec.old_md5,md5(expected_secure)) then
      raise exception 'cron % mudou desde o backup; nenhuma alteracao parcial permitida',rec.jobname;
    end if;
    perform cron.alter_job(id_job,command := expected_secure);
  end loop;
end;
$cutover$;
