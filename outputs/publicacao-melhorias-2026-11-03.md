# Melhorias: validação e publicação

Data: 2026-11-03. Base de produção: `483e897c81f008d93e2e667d950ee826b5d63b32`. Branch: `codex/melhorias-2026-11-03`.

## Escopo e resultado local

Implementadas as sete frentes descritas em `plano-melhorias-2026-11-03.md`: ônibus por data, monitoramento, testes automatizados, grupos econômicos comparáveis, Hoje em Piracanjuba, assistente com fontes e interesses pessoais.

Os interesses ficam no navegador. Os avisos aparecem ao retornar ao site, com frequência e cancelamento; não há envio por e-mail ou push. A cobertura de contratos e atos é uma amostra recente explicitada na interface. A grade de ônibus é datada: 14 opções conferidas para 2026-11-04, preservando 19 históricas de 2026-09-10. Não existe promessa de recorrência nem coleta automática de passagens.

Durante os testes foram corrigidas duas falhas adicionais: exportação de servidores truncada e sem separação de órgão, e medições climáticas ausentes convertidas em zero. As exportações agora percorrem todas as páginas; medições ausentes são identificadas sem inventar temperatura.

## Evidências

| Verificação | Resultado |
| --- | --- |
| TypeScript | Aprovado, zero erros |
| ESLint | Aprovado, zero erros e avisos |
| Compilação Next | Aprovada no Dell |
| Node | 171 aprovados |
| Deno | 175 aprovados |
| Playwright | 20 aprovados, desktop e celular |
| SQL descartável PostgreSQL 17.11 | Equivalência, permissões e rollback do monitor; atomicidade, completude e idempotência dos grupos aprovados |

Relatórios em `artifacts/melhorias-2026-11-03-final`, `artifacts/e2e-2026-11-03-r3` e `artifacts/e2e-chat-2026-11-03`. A primeira execução Node final detectou um harness antigo sem coletor de fontes. O harness foi corrigido e os 144 testes passaram em `node-after-harness.log`. O resultado inicial foi preservado para rastreabilidade.

Após revisão, a rodada final está em `artifacts/melhorias-review-2026-11-03` e `artifacts/e2e-review-2026-11-03`, ambos com gate zero. Os dois ensaios SQL passaram novamente, incluindo substituição de grupos e asserção efetiva de leitura pelo service_role, em `artifacts/sql-review-2026-11-03.log`.

Testes de navegador usam dados públicos simulados, inclusive 1.002 servidores da Prefeitura e 32 da Câmara para provar paginação e isolamento no CSV. Nenhum modelo pago, mensagem externa ou notificação real foi acionado.

Auditoria npm: 21 entradas, duas baixas e 19 moderadas, sem altas ou críticas. As cadeias de ferramentas de desenvolvimento são anteriores ao Playwright; a correção automática propõe downgrades incompatíveis e não foi aplicada.

## Autorização e ordem

O operador autorizou explicitamente as três migrations, o cron diário e a primeira atualização dos grupos em 2026-11-03. A publicação já está autorizada na sessão. A troca de versão do Postgres não está incluída nesta autorização.

1. Conferir hashes das definições atuais e backups privados.
2. Publicar `admin-sync-status`, compatível com a view anterior.
3. Aplicar a migration que elimina dependências diretas do monitor em `pg_cron` e verificar equivalência e ACLs.
4. Aplicar `20261103230000_grupos_snapshot_atomico.sql`, publicar `sync-grupos-economicos` e validar recusa de chamada não autenticada. Aplicar `20261103230100_grupos_cron_seguro.sql`, que habilita a allowlist, o registry e o cron diário. Executar a primeira atualização pelo dispatcher autenticado e conferir o resultado e o agendamento. A allowlist precisa estar ativa antes desse canário; se ele falhar, desativar o novo cron até corrigir a causa.
5. Publicar chatbot mantendo JWT, provedores e modelos, com rollback preservado.
6. Gerar preview, verificar build e jornadas reais sem efeitos, integrar o PR e verificar produção.

## Backup e rollback

- Frontend: Vercel Production anterior `dpl_3pRznSxcTYQKtY7WogXGc8RtFJD1`, commit `483e897`. Metadados em `work/vercel-production-before.json`. Rollback por promoção desse deployment ou revert do merge, sem reescrever histórico.
- Monitor: backup `work/monitoramento-2026-11-03/backup-v-sync-dashboard.json`; script `supabase/rollbacks/20261103221500_desacopla_monitor_pg_cron.sql`. A reversão recupera também a dependência e os grants amplos antigos; preferir corrigir adiante quando possível.
- Grupos: backup e restauração transacional em `work/grupos-backup-2026-11-03/`; cron/allowlist em `outputs/grupos-rollback-cron-2026-11-03.sql`. Desativar o cron antes de restaurar o snapshot. Schema aditivo pode permanecer para evitar destruição desnecessária.
- Chatbot: pacote anterior em `work/chatbot-2026-11-03/backup-live-response.json`. Republicar o pacote preservando JWT. Clientes antigos e novos aceitam ambas as variantes SSE.
- `admin-sync-status` é um endpoint novo e somente leitura. Pode permanecer protegido durante rollback do frontend; não expõe logs sem sessão administrativa válida.

Os backups permanecem privados no M5, fora do Git e do espelho Dell. O estado efetivo da publicação será registrado após as verificações.

## Banco e funções publicados

As três migrations foram aplicadas com sucesso. A verificação anterior à atualização gerenciada confirmou zero dependências diretas da view em `cron.job` e `cron.job_run_details`, `security_invoker=true`, leitura exclusiva para service_role/postgres e os 65 coletores anteriores preservados. A inclusão do novo coletor elevou o monitor para 66 entradas.

`admin-sync-status` v1, `sync-grupos-economicos` v1 e `chatbot` v10 foram publicados. Os conteúdos ativos foram comparados integralmente ao manifesto privado `work/deploy-melhorias-2026-11-03.json`. JWT do chatbot permaneceu false; o monitor usa JWT e sessão administrativa; o coletor de grupos mantém autenticação própria estrita. Chamadas não autenticadas aos dois novos endpoints retornaram HTTP 401.

A primeira atualização de grupos, request 61173, terminou com success em 2026-11-03T22:30:22Z: 61 grupos, 135 empresas, R$ 54.855.584,76 em valores iniciais dos contratos. Foram lidos 6.598 contratos da Prefeitura, 170 registros contratuais da Câmara e 3.629 fornecedores. Cron diário `0 22 * * *` UTC ativado, equivalente a 19h em Piracanjuba. RPC recusada ao papel anon e permitida ao service_role.

A prévia Vercel `dpl_FUTuJ1NZYRM2NjWHuRDQ5HTAxxjK` concluiu o build. Navegação autenticada no Chrome confirmou home, favoritos e comparação real do primeiro grupo, incluindo valores anuais, aditivos e documentos. O acesso pelo conector Vercel permaneceu limitado, mas CLI e sessão Chrome funcionaram. O card da próxima viagem recebeu um ajuste para abrir diretamente a data, o destino e a empresa anunciados, aprovado nos dois projetos Playwright.

Durante a conferência posterior, a API Supabase passou a informar `UPGRADING`. O agente não iniciou essa atualização e não interferiu nela. Em seguida o projeto retornou a `ACTIVE_HEALTHY`, versão `17.11.0.011`. SQL confirmou PostgreSQL 17.11, 85 jobs (81 ativos), 66 coletores, 61 grupos e 135 membros preservados. O novo coletor consta como healthy/scheduled; nenhuma view externa depende diretamente das tabelas cron e as permissões continuam corretas. Evidência privada: `work/verification-after-upgrade-2026-11-03.json`.

A prévia do ajuste da home (`232dc21`) falhou durante a indisponibilidade do banco no upgrade, ao gerar `/investigacoes`. Compilação, TypeScript e CI passaram; o próximo build será executado com o banco saudável. A produção frontend anterior foi preservada.

## Ajustes da revisão

Importações de ônibus fazem merge por ID e exigem opção explícita para remover históricos. Validação exige consulta de viagem com data, origem e destino; a identidade da partida independe da chegada. CSV compartilhado escapa campos e neutraliza fórmulas. Exportação pagina por cursor e compara duas leituras completas com revisões e IDs únicos, repetindo até três vezes se detectar mudança. Essa detecção REST não equivale a uma transação única do banco. Falhas aparecem ao usuário, sem produzir arquivo parcial.

Todos os itens do feed ficam acessíveis, e contratos usam ID do banco. Lacunas da escala não prolongam plantões. Chuva usa sete datas do calendário local, mantém avisos suportados pelo acumulado parcial e identifica faltas. Nomes alternativos dos grupos são determinísticos e erros Supabase preservam sua mensagem. O resumo administrativo usa o mesmo critério das linhas; os testes SQL, limpeza de volumes descartáveis e smoke de redirecionamentos receberam as correções correspondentes.
