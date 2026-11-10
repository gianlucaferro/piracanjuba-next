# Resumo da folha da Câmara, 2026-11-10

## Escopo e autorização

Operador solicitou corrigir o resumo da Câmara, separar folha mensal e rescisões, identificar publicação parcial, testar e publicar se aprovado. Apenas código da aplicação e testes. Nenhuma migration, escrita em produção ou alteração de coletor/cron.

## Correção

- Consulta da última competência com registros e da última MENSAL, ambas restritas à Câmara. Leitura paginada com verificação de contagem e propagação de erros.
- Totais separados em mensal, rescisões e outros. Valores ausentes não viram zero; contagem de pessoas distintas em cada grupo.
- Aviso parcial quando a última competência não contém MENSAL. A presença de mensal não comprova fechamento, portanto nunca se afirma publicação completa.
- Resumo em `/camara`, `/camara/servidores` e `/transparencia/folha-camara`. Cadastro funcional identificado separadamente. A página `/vereadores` usa outra listagem e não consome esta estimativa.
- Parcela anual estimada usa apenas mensal × 12 ÷ 11, com competência explícita. Subsídios já integram a folha e não são somados novamente. Não é despesa anual realizada.

## Evidência de produção antes da mudança

Consulta SQL somente leitura em 2026-11-10: 2026-10 contém 36 registros MENSAL, R$ 239.900,63 brutos; 2026-11 contém uma RESCISÃO, R$ 2.407,68, sem MENSAL. Outubro inclui os 11 vereadores. APIs oficiais conferidas no diagnóstico anterior da mesma data.

Backup de código: `origin/main` em `c25dc22a2e737e60d080853f74d793be01c0a2cd`. Produção anterior Ready: `dpl_AYwoXtgyGR9yuc6PrEELEXmd71ar`. Metadados em `production-before.json` nesta pasta.

## Validação

- Worker Dell: tipos e lint sem erros, 264 testes Node e 184 Deno aprovados, compilação Next aprovada.
- Revisão independente do diff sem finding bloqueante.
- Regressões de navegador incluem desktop/mobile, mensal anterior, somente rescisão, ambas no mesmo mês, erros com nova tentativa, ausência de dados, isolamento da Prefeitura, mais de mil registros e projeção sem dupla contagem.
- Resultado do navegador, CI, preview e produção será registrado na nota canônica da sessão após a publicação.

Artefatos locais: `artifacts/camara-resumo-2026-11-10/` e `artifacts/camara-resumo-e2e-2026-11-10/` e `artifacts/camara-resumo-e2e-final-2026-11-10/`. Os arquivos `.exit` são os gates reais dos scripts de validação, pois o wrapper permite recolher logs mesmo em falha.

## Rollback preparado

Se houver regressão, restaurar o deployment anterior com CLI autenticada:

```sh
vercel rollback dpl_AYwoXtgyGR9yuc6PrEELEXmd71ar --yes --scope gianlucaferros-projects
```

Depois, reverter o commit de integração por commit novo em branch e PR, sem reescrever histórico. Nenhuma reversão de banco é necessária. Conferir estado Ready, domínio e resumo após qualquer rollback.

## Limites

O banco não guarda confirmação de fechamento da folha. O aviso identifica ausência da mensal na última competência com registros, não infere fechamento pela quantidade de pessoas. Novos registros podem complementar os totais. O ajuste não antecipa publicação oficial nem altera a janela de coleta retroativa ou os resumos de IA individuais.
