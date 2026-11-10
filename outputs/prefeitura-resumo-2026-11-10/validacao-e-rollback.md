# Resumo da folha da Prefeitura, 2026-11-10

## Escopo e autorização

Operador pediu separar mensal, rescisões e 13º salário no resumo da Prefeitura, indicar publicação parcial, testar e publicar se aprovado. A mudança usa leituras públicas e código da aplicação. Nenhuma migration, escrita em produção ou alteração de coletor, cron ou resumo de IA individual.

## Comportamento

- A mensal mais recente é selecionada independentemente da última competência com pagamentos extraordinários.
- Rescisões e 13º, incluindo adiantamentos e RPPS, ficam em grupos separados. Tipos desconhecidos são apresentados como outros pagamentos.
- Valores vêm de `remuneracao_servidores`, filtrada pela Prefeitura em todas as consultas. Contagens representam vínculos distintos por grupo, não uma soma de pessoas entre grupos.
- A tabela `prefeitura_folha_nucleogov` fornece apenas identificadores e nomes de órgãos para comparar a última mensal com a mensal anterior. A projeção não retorna o conteúdo completo de `raw_payload` nem nomes, CPF ou matrículas para essa comparação.
- Publicação parcial é sinalizada quando a competência mais recente não tem mensal ou há órgãos que tinham mensal na referência anterior e estão ausentes na atual. O aviso explicita a comparação. A ausência de registros não prova falta de pagamento.
- Mês corrente sem registros recebe aviso próprio. Falhas, mensal inexistente e valores nulos não são apresentados como salário zero. Não se afirma fechamento da publicação quando os órgãos coincidem.
- Novo resumo em `/prefeitura` (Visão Geral) e `/prefeitura/servidores`. `/prefeitura/visao-geral` não é rota válida. A Câmara permanece separada, com link para sua página.

## Evidência anterior à alteração

SQL somente leitura em 2026-11-10 confirmou 2026-10: 872 MENSAL, R$ 4.643.637,63; 80 adiantamentos de 13º, R$ 494.320,18; quatro rescisões, R$ 11.312,20. Nenhum registro em 2026-11.

Metadados da fonte: em 2026-09 havia MENSAL nos órgãos 22, 23, 44, 55, 67, 68, 70 e 71. Em 2026-10 há nos órgãos 44, 67, 68, 70 e 71. Ausentes na comparação: Poder Executivo, Fundeb e Fundo Municipal de Saúde.

A tabela de origem inclui identidade por movimento e pode ter mais linhas que a tabela consolidada de remunerações. Portanto seus valores não são somados no resumo. `prefeitura_sync_state.complete` indica coleta integral da resposta da API, não publicação encerrada.

## Validação

Regressões aprovadas no Worker Dell: três tipos separados, vínculos distintos, variantes do 13º, valor nulo, mês atual sem registros, mensal anterior preservada, órgãos ausentes ou sem identificação, retorno dos órgãos, paginação superior a mil linhas financeiras e de cobertura, isolamento da Câmara, erro e nova tentativa. Navegadores desktop/mobile e checks do projeto obrigatórios antes de integrar.

Worker Dell: tipos e lint sem erros, compilação Next aprovada, 274 testes Node, 184 Deno e 52 Playwright aprovados (510 testes). Revisão independente do código concluída sem finding bloqueante. Resultado final de CI, prévia e produção será registrado na nota canônica da sessão no Obsidian.

Artefatos: `artifacts/prefeitura-resumo-2026-11-10/` e `artifacts/prefeitura-resumo-e2e-2026-11-10/`. Os arquivos `.exit` são os gates reais dos scripts de validação.

## Backup e rollback

Base anterior: `41526d34726a00bfb540ac81e13595b8734c3103`. Produção Ready: `dpl_8sNwvvmFX24kLnC5WWrq4VP8KhSF`. Metadados em `production-before.json` nesta pasta. Essa base já contém a correção da Câmara.

Se houver regressão:

```sh
vercel rollback dpl_8sNwvvmFX24kLnC5WWrq4VP8KhSF --yes --scope gianlucaferros-projects
```

Conferir domínio e estado Ready; reverter a integração por novo commit e PR se necessário. Não reescrever histórico. Nenhuma reversão de banco é necessária.
