# Implementação das melhorias

Pedido de 2026-11-03: implementar as sete sugestões e investigar o bloqueio de upgrade do Postgres da captura.

Base: `origin/main`, branch `codex/melhorias-2026-11-03`. Produção Supabase `oinweocqcptwxqsztlcl`.

## Entregas

1. Ônibus com consultas por data, manutenção validada, validade e busca útil quando não houver grade conferida.
2. Monitor autenticado, regras por fonte, completude da folha e remoção da dependência bloqueante da view sobre pg_cron.
3. Jornadas automatizadas de navegador e verificação HTTP após deploy.
4. Grupos econômicos com data-base, recomputação atômica e comparação dos contratos incluindo aditivos.
5. Bloco Hoje em Piracanjuba com informação local e acessos diretos.
6. Assistente com fontes clicáveis e período/cobertura no contexto.
7. Favoritos e alertas opcionais por interesse, com cancelamento e frequência explícitos.

## Validação e publicação

Executar lint, tipos, Node, Deno, SQL em ambiente descartável, build e jornadas desktop/celular. Revisar diff e segurança dos acessos. Guardar backups privados em work/ e documentar rollback por componente. O deploy frontend está autorizado na sessão. Migrations e eventual upgrade/restart do banco exigem autorização específica conforme AGENTS do operador, após preparar e validar os scripts concretos.

Não converter horários históricos em recorrência, contratar APIs, enviar mensagens a empresas ou disparar notificações a assinantes existentes durante testes.
