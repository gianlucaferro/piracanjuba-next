-- Frescor de conteudo: os syncs de conteudo da Camara/Prefeitura (portal Centi, scrapes
-- baratos e idempotentes) passam a rodar DIARIAMENTE, escalonados entre 03h-07h UTC.
-- Mantidos na frequencia original (NAO mexidos aqui):
--   - salarios/servidores: sync-prefeitura-mensal (dia 1 e 5), sync-folha-camara, sync-remuneracao-vereadores
--   - indicadores externos (IBGE/DataSUS/Tesouro/SICONFI/INEP): a fonte so atualiza mensal/trimestral/anual
--   - presenca por PDF (sync-presenca-sessoes/atas): IA + sessoes semanais, diario seria desperdicio
do $$
declare
  alvo record;
begin
  for alvo in
    select * from (values
      ('sync-despesas-monthly', '0 3 * * *'),
      ('sync-vereadores-weekly', '5 3 * * *'),
      ('sync-projetos-weekly', '10 3 * * *'),
      ('sync-diarias-monthly', '12 3 * * *'),
      ('sync-atuacao-weekly', '20 3 * * *'),
      ('sync-obras-monthly', '25 3 * * *'),
      ('sync-presenca-centi-weekly', '0 4 * * *'),
      ('sync-camara-atos-weekly', '10 4 * * *'),
      ('sync-camara-financeiro-weekly', '20 4 * * *'),
      ('sync-decretos-weekly', '30 4 * * *'),
      ('sync-portarias-weekly', '40 4 * * *'),
      ('sync-leis-municipais-weekly', '50 4 * * *'),
      ('sync-camara-despesas-monthly', '0 5 * * *'),
      ('sync-frota-veiculos-weekly', '20 5 * * *'),
      ('sync-lei-organica-weekly', '40 5 * * *'),
      ('sync-indicacoes-camara-semanal', '0 6 * * *'),
      ('sync-atividades-legislativas-semanal', '15 6 * * *'),
      ('sync-atos-camara-semanal', '30 6 * * *'),
      ('sync-diarias-camara-mensal', '0 7 * * *')
    ) as t(nome, sched)
  loop
    perform cron.alter_job(j.jobid, schedule => alvo.sched)
    from cron.job j
    where j.jobname = alvo.nome;
  end loop;
end $$;

-- Gera diariamente os resumos de IA das indicacoes novas (estavam sem cron).
select cron.schedule('backfill-atos-resumos-daily', '0 8 * * *',
  $$SELECT public.invoke_edge_function('backfill-atos-resumos');$$);
