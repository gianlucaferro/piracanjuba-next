-- Altera somente os dois crons comprovadamente manuais, sem alterar agendas ou comandos.
-- As funcoes e os dados permanecem disponiveis; o registry conserva o historico.
do $manual$
declare
  expected record;
  observed_job cron.job%rowtype;
  observed_registry public.sync_job_registry%rowtype;
begin
  for expected in select * from (values
      ('sync-presenca-atas', 109, 'sync-presenca-atas-weekly', '50 3 * * 2', '02f565ffd224d1ccd96a2d3105deb4d0', 'weekly', 'Câmara WP API', 192, 'Atas de sessões', 'Operação manual de atas autenticadas; cron automático desativado em 2026-09-07 (exige texto ou lista de presença).'),
      ('sync-seguranca', 144, 'sync-seguranca-quarterly', '45 6 1 1,4,7,10 *', 'f3824d5fdc44acf3c90dec6eeda08efe', 'quarterly', 'SSP-GO / SINESP', 2232, 'Estatísticas de segurança', 'Consulta manual dos indicadores já gravados; cron automático desativado em 2026-09-07 (sem coleta de novos períodos).')
  ) as targets(function_name, jobid, jobname, schedule, command_md5, frequency_tier, data_source, max_stale_hours, old_description, manual_description) loop
    if (select count(*) from cron.job where jobname = expected.jobname) <> 1 then
      raise exception 'Cron manual ausente ou ambiguo';
    end if;
    select * into observed_job from cron.job where jobname = expected.jobname;
    if not found or observed_job.jobid is distinct from expected.jobid or observed_job.schedule is distinct from expected.schedule
       or md5(observed_job.command) is distinct from expected.command_md5 then
      raise exception 'Cron manual mudou desde o backup; revisar antes de prosseguir';
    end if;
    select * into observed_registry from public.sync_job_registry where function_name = expected.function_name;
    if not found or observed_registry.cron_name is distinct from expected.jobname
       or observed_registry.cron_expression is distinct from expected.schedule
       or observed_registry.frequency_tier is distinct from expected.frequency_tier
       or observed_registry.data_source is distinct from expected.data_source
       or observed_registry.max_stale_hours is distinct from expected.max_stale_hours
       or not ((observed_registry.is_active is true and observed_registry.description_pt is not distinct from expected.old_description)
         or (observed_registry.is_active is false and observed_registry.description_pt is not distinct from expected.manual_description)) then
      raise exception 'Cadastro manual mudou desde o backup; revisar antes de prosseguir';
    end if;
  end loop;

  for expected in select * from (values
      ('sync-presenca-atas', 109, 'sync-presenca-atas-weekly', '50 3 * * 2', '02f565ffd224d1ccd96a2d3105deb4d0', 'weekly', 'Câmara WP API', 192, 'Atas de sessões', 'Operação manual de atas autenticadas; cron automático desativado em 2026-09-07 (exige texto ou lista de presença).'),
      ('sync-seguranca', 144, 'sync-seguranca-quarterly', '45 6 1 1,4,7,10 *', 'f3824d5fdc44acf3c90dec6eeda08efe', 'quarterly', 'SSP-GO / SINESP', 2232, 'Estatísticas de segurança', 'Consulta manual dos indicadores já gravados; cron automático desativado em 2026-09-07 (sem coleta de novos períodos).')
  ) as targets(function_name, jobid, jobname, schedule, command_md5, frequency_tier, data_source, max_stale_hours, old_description, manual_description) loop
    perform cron.alter_job(expected.jobid, active := false);
    update public.sync_job_registry
      set is_active = false, description_pt = expected.manual_description
      where function_name = expected.function_name;
  end loop;
end;
$manual$;
