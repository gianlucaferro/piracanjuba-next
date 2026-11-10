# Revisao retroativa dos coletores de folha

Data: 2026-11-10. Projeto Supabase: `oinweocqcptwxqsztlcl`.

## Escopo autorizado

Revisar automaticamente o mes atual e os tres anteriores nos coletores da Prefeitura e da Camara, importar publicacoes tardias e retificacoes por upsert, testar e publicar. Competencia manual explicita continua restrita a um mes. Sem alteracoes de schema, agendamentos, segredos ou outros coletores.

## Baseline e backup

- Fonte local conferida contra o pacote ativo: Camara v30 e Prefeitura v7, sem divergencias. Commit de referencia: `a08145a0fa9671c27a257aa9ee21b93e9a5c4b74`.
- Metadados e digest das funcoes: `production-before.json`. Pacotes integrais preservados no diretorio privado `work/coletores-retroativos-2026-11-10/`, excluido do Git e do worker.
- Snapshot anterior, acesso restrito, em `work/coletores-retroativos-2026-11-10/snapshot-before/`: 1844 cadastros, 4419 remuneracoes de 2026-08 a 2026-11, 4323 linhas canonicas da Prefeitura e 10 estados de sincronizacao. `manifest.json` registra contagens e SHA-256.
- Backups obtidos por leitura REST autenticada, credencial somente em memoria via `op://Dev/Supabase Piracanjuba.Ai/service_role_key`. Nenhum valor de credencial foi escrito.
- Crons diarios ativos: Camara `0 6 * * *` UTC, Prefeitura `20 7 * * *` UTC. Ambos chamam a funcao segura sem restringir competencia, com timeout HTTP de 290000 ms. Nao exigem mudanca de SQL.

## Garantias e limites

- O sucesso da coleta significa integridade dos dados retornados, nao encerramento da publicacao oficial.
- Mes vazio nao apaga registros. A reimportacao preserva as chaves de vinculo, competencia e tipo de folha. Uma folha antiga nao substitui cadastro associado a remuneracao mais recente.
- Falhas de fonte e persistencia devem identificar a competencia e impedir sucesso integral. Lotes de escrita existentes nao sao uma transacao unica; a repeticao idempotente recupera uma interrupcao.
- Revisao automatica limitada a quatro competencias. Periodos mais antigos continuam disponiveis por chamada explicita autenticada.

## Validacao antes da publicacao

- Dell: 303 testes Node e 195 Deno aprovados na primeira rodada, tipos e lint da aplicacao, compilacao Next, tipos dos dois entrypoints Deno e lint dos seis arquivos Deno aprovados. Teste adicional de movimentos canonicos da Prefeitura acrescentado depois, validacao direcionada e CI final registradas adiante.
- Navegador no Dell: 52 testes Playwright aprovados, incluindo resumos da Prefeitura e da Camara em desktop e mobile.
- Revisao independente: sem bloqueios remanescentes. Divergencia entre dry_run da URL e JSON foi corrigida e coberta por teste.
- Simulacao com os handlers locais e fontes oficiais: Camara, 109 registros (1, 36, 36, 36 de 2026-11 a 2026-08), 4,6 segundos no Dell. Prefeitura, 4310 registros (0, 956, 1700, 1654), 29,7 segundos na consulta completa pelo M5.
- A fonte da Prefeitura apresentou respostas com erro em tentativas anteriores. A validacao as rejeitou, sem confundir com ausencia de publicacao; nova consulta completa passou. Nenhuma validacao de integridade foi removida para contornar a falha externa.
- Simulacao local usa credenciais ficticias e permissao de rede restrita aos dois portais oficiais, sem acesso de rede ao Supabase.
- Pendentes: CI, conferir pacote ativo apos publicar, simular sem gravacoes e executar importacao controlada. Comparar snapshot e conferir logs.

## Rollback

Republicar os pacotes integrais anteriores preservados em `work/coletores-retroativos-2026-11-10/*-before.json`, usando o entrypoint relativo `functions/<nome>/index.ts` e `verify_jwt: false`, como nas versoes anteriores. A autenticacao propria das funcoes permanece ativa. Conferir os arquivos publicados e a versao retornada.

Alternativamente, recuperar os arquivos de cada pacote no commit de referencia acima, pois a igualdade com a producao foi verificada antes da alteracao. Rollback de codigo nao remove folhas oficiais importadas legitimamente. Em caso de divergencia nos dados, comparar o snapshot privado antes/depois e preparar restauracao restrita aos registros afetados; nao executar delecao ampla nem SQL de escrita sem autorizacao especifica.
