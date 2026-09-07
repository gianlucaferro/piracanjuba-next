-- Dependencia: 20260907070200_autentica_crons_monitoramento.sql.
-- Adiciona somente sync-leis-municipais ao dispatcher seguro e troca apenas
-- o comando do seu cron existente, preservando agenda e estado ativo.
do $cutover$
declare
  definition text;
  corrected text;
  id_job bigint;
  digest text;
  expected_secure text := 'SELECT public.invoke_edge_function_secure(''sync-leis-municipais'');';
begin
  select pg_get_functiondef('public.invoke_edge_function_secure(text,jsonb)'::regprocedure)
  into definition;
  if md5(definition) = 'b18877c8898255f7a09c0261b009c088' then
    corrected := replace(definition,
      $anchor$      'sync-presenca-centi',$anchor$,
      $addition$      'sync-leis-municipais',
      'sync-presenca-centi',$addition$);
    if md5(corrected) <> '5ae5e30de13f3b2dff3071a66164df54' then
      raise exception 'allowlist de leis diverge da revisao';
    end if;
    execute corrected;
  elsif md5(definition) <> '5ae5e30de13f3b2dff3071a66164df54' then
    raise exception 'wrapper seguro mudou depois da base 70200; revisar antes do cutover';
  end if;
  if (select count(*) from cron.job where jobname = 'sync-leis-municipais-weekly') <> 1 then
    raise exception 'cron de leis ausente ou ambiguo';
  end if;
  select j.jobid, md5(j.command) into id_job, digest
  from cron.job j where j.jobname = 'sync-leis-municipais-weekly';
  if id_job is null or digest not in ('af5bb344489eb8e06017f4f8620712d5', md5(expected_secure)) then
    raise exception 'comando do cron de leis mudou desde o backup';
  end if;
  perform cron.alter_job(id_job, command := expected_secure);
end;
$cutover$;
