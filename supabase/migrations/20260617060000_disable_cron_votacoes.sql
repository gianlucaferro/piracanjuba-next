-- Votacoes agora vem do Centi via sync-camara-atos (tipo 44 -> tabela camara_atos).
-- O sync-votacoes apontava pro portal SAPL morto (HTTP 403) e a tabela votacoes nao
-- tem aba na UI. Desativa o cron pra parar de bater na fonte morta. Reversivel:
-- active := true se um dia a tabela votacoes voltar a ser usada.
select cron.alter_job((select jobid from cron.job where jobname = 'sync-votacoes-weekly'), active := false);
