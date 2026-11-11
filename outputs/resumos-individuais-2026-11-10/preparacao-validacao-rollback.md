# Resumos individuais de servidores

Data: 2026-11-10. Projeto Supabase: `oinweocqcptwxqsztlcl`.

## Problema e comportamento preparado

O resumo anterior consultava somente tres lancamentos e enviava o primeiro a IA, sem sua natureza. Uma rescisao ou adiantamento podia substituir a mensal, e o cache antigo continuava disponivel. Os modais tambem omitiam o tipo e podiam receber uma resposta atrasada de outro servidor.

A implementacao consulta o historico completo por UUID, com paginacao deterministica e verificacoes de integridade. Cada categoria mostra sua ultima competencia propria: mensal, rescisao, 13º com adiantamentos/RPPS e outros. Valores nulos permanecem nao informados. Tipos legados NORMAL ficam em Outros, pois sua natureza mensal nao esta comprovada pelo dado legado. Nao se somam meses e nao se infere falta de pagamento.

Calculo e texto sao determinados pelos registros oficiais. Nao ha chamada de IA, quota, leitura do cache antigo ou escrita. O endpoint privado de backfill permanece compativel e autenticado, retornando sem efeitos porque nao ha mais geracao previa a executar. Sem migration, alteracao de cron, schema ou credenciais.

Modal compartilhado nas listas da Prefeitura e Camara, com reconsulta a cada abertura, identidade conferida na resposta, falha explicita com nova tentativa e fonte oficial. Erros nao viram salario zero e respostas de outro UUID nao substituem o servidor selecionado.

## Validacao anterior a publicacao

- Worker Dell: 317 testes Node, 205 Deno e 68 Playwright desktop/mobile, total 590, aprovados. Tipos, lint, compilacao Next e checks Deno das duas Edge Functions aprovados.
- Revisao independente do backend e integracao da UI sem bloqueios. Testes cobrem rescisao posterior a mensal, varios tipos por competencia, >250 linhas, variacoes do 13º, nulo/zero, falhas de leitura, duplicacao/paginacao instavel, cache antigo, retificacao e corrida entre servidores.
- Handler local contra dados reais, somente leitura: seis casos aprovados, comparados por calculo independente via REST. Incluem Camara com mensal de 2026-10 e rescisao de 2026-11, Prefeitura com mensal/13º de 2026-10, historico com cinco tipos, rescisao, vinculo sem folha e registros legados NORMAL.
- Execucao local usa credencial em memoria via `op://Dev/Supabase Piracanjuba.Ai/service_role_key`, com rede restrita ao projeto Supabase. Nao e permitida chamada a provedores de IA nesse preflight.
- Referencia antes da publicacao: 20526 remuneracoes, 1844 servidores e 3966 linhas do cache de servidor. Contagens e digest em `production-before.json`. Testes nao alteraram salarios.

## Backup e ordem de publicacao

Base Git `032046ba1523d9b16c0d75a6321482f175325221`. Fonte local conferida integralmente com as versoes ativas: summarize-servidor v30 e backfill-servidor-resumos v6. Pacotes integrais preservados em `work/resumos-individuais-2026-11-10/*-before.json`, fora do Git e do espelho Dell. Metadados em `production-before.json`.

Publicar primeiro as duas Edge Functions e conferir todos os arquivos ativos. A resposta nova preserva resumo/remuneracoes para o cliente anterior. Conferir os seis casos reais no endpoint publicado, sem gerar IA, e validar o backfill sem efeitos. Depois publicar o frontend, que exige o contrato dados_oficiais, e conferir os modais e rotas publicas.

Os resultados finais de publicacao sao registrados na nota canonica `/Users/gianlucaferro/dev/obsidian/GianlucaObsidian/Sessões/2026-11-10 Codex - Piracanjuba.ai - resumos individuais de servidores.md` e nos artefatos privados em work.

## Rollback

Reverter primeiro o frontend para `dpl_GvkHFN7Wr13Bh5WmkqcmZ5C8Z4vy` via Vercel e conferir os aliases. Em seguida, se necessario, republicar os pacotes anteriores das duas Edge Functions, mesmos entrypoints e verify_jwt false, preservando autenticacao propria do backfill. Restaurar a Edge antiga antes do frontend novo causaria incompatibilidade de contrato e deve ser evitado.

Corrigir o Git por novo commit/PR de reversao, sem reescrever historico. Nao e necessaria restauracao de banco: esta entrega nao escreve salarios ou cache e nao aplica SQL de escrita. Os dados pessoais usados nos seis casos ficam somente nos artefatos privados, nao neste relatorio nem no Git.
