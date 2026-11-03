# Monitoramento e compatibilidade com upgrade

Data: 2026-11-03. Projeto: Piracanjuba.ai, Supabase `oinweocqcptwxqsztlcl`.

## Diagnóstico confirmado

- A única view encontrada com dependência direta das tabelas `cron.job` e `cron.job_run_details` é `public.v_sync_dashboard`. A definição atual coincide com o hash `467c87c80012683948bfa42d310ad14e` da correção de 2026-09-07.
- A view é consumida pela função `sync-health-check` e pela função SQL `retry_failed_syncs`. O bloqueio de upgrade ocorre porque o processo gerenciado recria a extensão `pg_cron`.
- A view estava com privilégios amplos para `anon` e `authenticated` e sem `security_invoker`. O assessor de segurança confirmou esse aviso. A correção restringe os dados operacionais a `service_role` e `postgres`.
- O painel administrativo consultava `sync_log` com cliente público. A tabela tem RLS sem política pública, portanto uma lista vazia não comprovava ausência de logs.
- A Prefeitura tem 1.800 vínculos cadastrados e 19.273 holerites históricos. A antiga coleta de IDs no navegador poderia limitar o conjunto aos primeiros 1.000. A Câmara tem 38 vínculos e 296 holerites históricos. Contagens obtidas por agregação SQL somente leitura.
- Em 2026-11-03, a última competência observada é 2026-09 na Prefeitura e 2026-10 na Câmara. O cron da Prefeitura não contém uma competência fixa: chama o coletor sem parâmetros, e o código tenta o mês corrente e até três anteriores. A agenda não foi alterada.
- O último log Prefeitura registra 1.599 linhas da fonte e conclusão da coleta de 2026-09; logs anteriores de novembro incluem 1.700. Não inferir exclusão de pessoas, erro do coletor ou ausência de publicação mais recente somente por essa variação. O log atual não detalha as competências tentadas e vazias.
- A Câmara registra explicitamente `requested_competencia=2026-11`, `fallback_used=true`, `source_complete=true`, com 36 registros para 2026-10. O painel identifica o retorno de competência anterior, sem concluir que a competência solicitada não foi publicada: source_complete descreve a competência alternativa, não todas as tentativas.

## Implementação

1. `sync_cron_snapshot()` usa PL/pgSQL e SQL dinâmico fixo, sem entrada de SQL do usuário. Retorna apenas ID, nome, ativação e último disparo, sem comandos ou credenciais. O caminho de busca é vazio e a execução é restrita a `service_role` e `postgres`. Durante ausência temporária da extensão retorna vazio, o que marca agenda ausente e impede novos retries.
2. A view preserva colunas, regras de saúde e elegibilidade de retries. Passa a usar `security_invoker=true` e o helper no lugar de dependências diretas de objetos da extensão.
3. `admin-sync-status` valida o token administrativo existente por hash e expiração. Respostas são `no-store`; os detalhes dos logs são reduzidos a contagens, competências e indicadores de completude. Logs e erros arbitrários não são repassados. JWT da plataforma continua ativado.
4. O frontend usa essa função para os logs privados. As consultas públicas de dados permanecem separadas; uma falha não oculta as demais bases.
5. A folha usa relacionamento filtrado no PostgREST e contagem exata. Não transporta IDs por lista `IN`. Exibe a contagem da última competência e os totais históricos separadamente para Prefeitura e Câmara.
6. A avaliação distingue competência mensal, ano de referência, cadastros sob demanda, execução do coletor e importação parcial. O prazo de execução vem de `sync_job_registry.max_stale_hours`. Os intervalos de revisão de conteúdo são critérios administrativos, não prazos legais.
7. Farmácias são avaliadas pela cobertura da escala documental em São Paulo, incluindo fim de validade e lacunas. Datas de fotos não são usadas como sinal de atualização do plantão.

## Arquivos e validação

- Migration: `supabase/migrations/20261103221500_desacopla_monitor_pg_cron.sql`.
- Rollback: `supabase/rollbacks/20261103221500_desacopla_monitor_pg_cron.sql`.
- Backup exato da view, ACLs e consumidor SQL: `work/monitoramento-2026-11-03/backup-v-sync-dashboard.json`, ignorado no Git. Não contém valores de credenciais.
- Testes Node: `tests/sync-integrity.test.ts`, oito casos aprovados.
- Testes Deno: `_shared/admin-sync-status.test.ts`, quatro casos aprovados.
- Teste PostgreSQL 17: `tests/sql/monitor-pgcron.test.sql`, aprovado em PostgreSQL 17.11 descartável no Worker Dell. Comprovou equivalência dos resultados, permissões, remoção e recriação das tabelas cron sem CASCADE, e rollback exato. O mesmo runner também aprovou o teste de publicação atômica dos grupos econômicos. Nenhum dado de produção foi copiado.
- Tipos, lint, build e navegação: validação global pelo agente principal.

## Publicação e rollback

Nenhuma alteração em produção foi realizada nesta subtarefa. Aplicação da migration, upgrade e reinício exigem a autorização específica definida pelo operador. Publicar `admin-sync-status` com JWT ativado antes do frontend; a função funciona também com a view anterior. Aplicar a migration somente após conferir o hash, o backup e o teste descartável.

Verificações após migration: zero dependências da view em tabelas `cron`; SELECT da view e do helper somente por papéis autorizados; mesmo número de coletores e mesmas colunas; `sync-health-check` com `dry_run=true` sem efeitos; endpoint recusa sessão ausente; painel autenticado apresenta coleta e completude.

O rollback SQL restaura a view e os grants originais, incluindo as permissões amplas preexistentes e a dependência que bloqueia upgrade. Requer que `pg_cron` esteja instalado. O frontend pode ser revertido pelo commit/deploy anterior, e o endpoint novo pode permanecer inacessível sem token válido ou ser removido. Não executar upgrade como parte automática da aplicação desta migration: primeiro confirmar elegibilidade, backup e janela de indisponibilidade.

## Referências

- [Upgrade gerenciado da Supabase](https://supabase.com/docs/guides/platform/upgrading).
- [Dependências de funções definidas por corpo textual no PostgreSQL 17](https://www.postgresql.org/docs/17/ddl-depend.html).
- [Assessor de views SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view).

Os demais avisos de segurança e desempenho encontrados são anteriores e não foram alterados nesta subtarefa. Nenhuma credencial foi rotacionada e nenhum alerta foi enviado.
