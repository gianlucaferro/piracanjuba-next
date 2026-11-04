# Piracanjuba.ai: proteção dos endpoints pagos e administrativos

Data local: 2026-11-03. Projeto: oinweocqcptwxqsztlcl. Base publicada: ea90a3f.
Estado: código e SQL preparados e testados, publicação ainda não executada.

## Mudanças

- aiGuard permite nova geração apenas quando a reserva responde allowed=true. Erro, exceção, resposta ausente ou malformada resultam em 503. Rate limit e budget válidos continuam 429. Cache permanece antes da reserva nos resumos.
- ai-search continua público e mantém streaming; valida bytes e pergunta, reserva antes de consultar contexto, limita saída a 4.096 tokens e tempo a 60 segundos.
- chatbot reserva antes de gravar pergunta ou montar contexto, limita bytes e saída; provedores continuam os mesmos. Os dois wrappers compartilhados de chat passam a ter timeout de 60 segundos.
- backfill-servidor-resumos e analyze-contrato-risco exigem segredo de cron ou chave de serviço. Rejeição ocorre antes de banco ou IA. dry_run autorizado permite conferir autenticação sem iniciar negócio.
- Backfill chama summarize-servidor com chave interna. Lotes e espera são limitados, com padrões existentes preservados. Falha temporária da quota retorna 503 com contagens parciais.
- summarize-servidor continua público para servidor_id. Overrides de modelo/provedor exigem chamada interna. Resumo em cache não usa IA nem quota; geração tem limite de saída e timeout.
- ai_guard preserva 15/minuto, 80/hora e 4.000/dia, mas torna a reserva diária atômica.
- Dois wrappers SQL passam a enviar cron_secret obtido no servidor. Payloads, timeouts e nove agendamentos permanecem. Contenção prévia de ACL das três RPCs fica versionada.

Não foram trocados modelos padrão, preços, provedores, dados ou cadência. send-push permanece pendente: sua fonte remota não pôde ser recuperada, logo não há backup verificável para uma publicação segura. Policies públicas e formulários são a próxima frente, separada deste pacote.

## Backup e comparação com produção

outputs/correcoes-consumo-2026-11-03/live-backup/manifest.json registra 25 bundles e 70 arquivos com versão e hashes. Os 18 handlers consumidores de aiGuard e seus helpers coincidem com a base publicada. ai-search, backfill e análise também coincidem.

Apenas os 21 endpoints envolvidos serão publicados: os 18 consumidores originais do helper, ai-search, backfill-servidor-resumos e analyze-contrato-risco. Não publicar os quatro chamadores de push incluídos no backup, pois têm dependências remotas divergentes fora deste escopo. Cada verify_jwt deve permanecer igual ao manifesto.

O SQL antigo de ai_guard está em live-backup/ai_guard.live.sql. Definições de wrappers sanitizadas servem como evidência, não como script de restauração.

## Validação

- 193 testes Node aprovados, incluindo handlers reais com transportes simulados.
- 176 testes Deno aprovados.
- TypeScript do projeto, lint e Deno check dos cinco handlers alterados aprovados.
- PostgreSQL 17 descartável: ACLs, payloads dos wrappers, limites por minuto/hora/dia, último slot com oito sessões concorrentes, rollback da quota e reaplicação preservando consumo.
- Revisão independente de compatibilidade, autenticação, concorrência e rollback concluída. Corrigidos dois pontos apontados: status de indisponibilidade dos jobs e timeout compartilhado de chat.
- Nenhuma IA, coleta, email, cobrança ou escrita em produção executada nos testes.

Evidências do Dell: artifacts/paid-security. Os comandos de execução estão em scripts/validation/paid-security.sh e paid-types.sh.

## Aplicação preparada

1. Obter autorização específica para supabase/migrations/20261104010000_protect_paid_admin_endpoints.sql e testes administrativos dry_run via HTTP do banco, sem operações de negócio.
2. Reconfirmar hashes/ACLs dos três corpos substituídos e a presença do cron_secret, sem ler o valor. Confirmar nove crons iguais.
3. Aplicar migration em transação, lock_timeout 5s e statement_timeout 30s. A migration não executa os wrappers nem altera os crons.
4. Publicar bundles selecionados, preservando verify_jwt. Conferir versão e arquivos por hash.
5. Confirmar 401 dos dois endpoints administrativos sem autenticação e 200 em dry_run com os mesmos headers privados dos wrappers. Este teste usa net.http_post, exclusivamente com dry_run=true, sem retornar segredo nem iniciar coleta.
6. Confirmar validações públicas sem IA, ACLs, saúde do projeto e rotas públicas. Sucesso de IA é coberto com mocks; não gastar créditos para smoke.
7. Registrar SQL, versões implantadas, hashes e limites de evidência no Obsidian.

## Rollback

Se a migration falhar, a transação reverte. Se um handler regredir, restaurar somente seu bundle anterior a partir do backup, com verify_jwt original.

Restaurar o chatbot anterior também restaura a ordem antiga: grava pergunta e monta contexto antes de aiGuard, ignora erros na contagem por IP e permite geração se a RPC de quota falhar. O mesmo helper antigo pode reabrir essa permissão em outros bundles restaurados. Portanto, esse rollback reduz a proteção de consumo mesmo mantendo o SQL novo. Preferir corrigir o handler preservando a reserva; se a restauração for indispensável, conferir limites dos provedores e observar consumo antes de prosseguir.

Os wrappers privados são compatíveis com os handlers antigos, ambos verify_jwt=false. Preservá-los no rollback de aplicação evita reintroduzir credencial pública na configuração e mantém ACLs fechadas. Se a quota SQL exigir rollback, restaurar ai_guard.live.sql e manter seu EXECUTE apenas para postgres/service_role, sem apagar contadores. Essa restauração reduz a proteção concorrente e exige decisão específica.

Não desfazer os três REVOKEs já autorizados e aplicados. Não executar jobs como teste. Não substituir arquivos remotos que tenham mudado depois do preflight.

## Limites

O teto de chamadas não é teto em dólares; os provedores externos têm cobrança própria. 503 durante falha da infraestrutura de quota é intencional para evitar geração sem reserva. Limites de saída e timeout podem interromper resposta excepcionalmente longa; as respostas usuais de resumo e chat foram preservadas em testes simulados.
