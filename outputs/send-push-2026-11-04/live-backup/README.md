# Recuperacao do send-push publicado

Data: 2026-11-04. Projeto Supabase: `oinweocqcptwxqsztlcl`. Funcao `send-push`, versao 23, ACTIVE, `verify_jwt=false`, conforme catalogo consultado pelo agente principal.

## Resultado

A fonte TypeScript original esta em `sources/send-push/index.ts`. Foi recuperada do campo `sourcesContent` do source map contido no ESZIP, sem normalizar espacamento, caracteres ou finais de linha. Tem 4.960 bytes e SHA256 `5a560ca271b90f18e89695ac57ca66b142279eb64e52b364a837e232e4458c90`.

A comparacao com `supabase/functions/send-push/index.ts` produziu diff vazio e hashes iguais antes das correcoes do agente principal. Nao ha dependencias locais `_shared` nesse bundle. Os imports externos sao Supabase JS, resolvido no bundle para 2.105.1, e web-push 3.6.7. Todos os modulos textuais recuperados e mapas ficam em `modules/`, com nomes, tamanhos e hashes no manifesto.

Isso confirma que a ausencia de autenticacao antes das operacoes privilegiadas observada no arquivo local tambem existe na fonte publicada. A classificacao de risco deve considerar conjuntamente o catalogo com `verify_jwt=false`. Nenhum endpoint de negocio foi chamado para demonstrar esse comportamento.

## Integridade e origem

- `send-push.eszip`: copia completa do corpo fornecido pelo agente principal, 376.261 bytes, magic `ESZIP2.3`, SHA256 `569c79466aa6526f9cff41b09ea31c25f7d80d9f8aa821b4f9fc015c686380af`.
- Origem do corpo: Supabase Management API autenticada, recuperada previamente pelo agente principal. A extracao nao acessou credenciais nem repetiu essa chamada.
- Parser oficial: `npm:@deno/eszip@0.106.0`. A integridade publicada do pacote esta registrada em `manifest.json`.
- Referencia da API: https://github.com/denoland/eszip/blob/8ab14dc4d0cd9abaa98e13e8efd62b769782bc0e/js/mod.ts
- Exemplo oficial de parse/load/getModuleSource: https://github.com/denoland/eszip/blob/8ab14dc4d0cd9abaa98e13e8efd62b769782bc0e/js/eszip_test.ts
- `manifest.json`: 60 entradas textuais, incluindo marcador de versao do Supabase, um source map e um original TypeScript.
- `comparison.json`: resultado da comparacao e limites do parecer.

O parser JavaScript tenta interpretar todas as entradas como UTF-8. A entrada especial `---EDGE-RUNTIME-METADATA---` e binaria e produziu erro de UTF-8 na tentativa inicial. Ela foi excluida somente da conversao textual, permanecendo integralmente no backup ESZIP. Nao houve perda da fonte original nem das dependencias. Os bytes do ESZIP nao foram alterados.

## Reproducao e limites

O script `scripts/recovery/extract-send-push-eszip.ts` deriva a raiz de seu proprio arquivo, valida o hash do bundle, usa apenas parse/load/leitura de fontes, extrai os originais do source map e grava os hashes. Ele nunca importa, avalia ou executa modulos contidos no bundle. O WebAssembly executado e o parser oficial.

Executado no M5 em tarefa curta, com Deno sem configuracao do projeto, sem lock, sem permissao de rede para o codigo, sem subprocessos e com leitura/escrita restritas ao bundle, cache de pacotes e pasta deste backup. O carregador de pacotes do Deno baixou as dependencias npm oficiais. Foram liberadas somente as variaveis tecnicas `_ISEXE_TEST_PLATFORM_`, `NODE_V8_COVERAGE`, `UNDICI_NO_FG` e `JEST_WORKER_ID`, exigidas pelas dependencias do parser, sem leitura de variaveis de credenciais.

A varredura nao encontrou chave privada, token privilegiado literal ou JWT de service role. Isso nao constitui garantia exaustiva de ausencia de segredos. O arquivo preserva a chave publica VAPID e a configuracao de contato existentes; valores privados continuam referenciados por nomes de variaveis de ambiente. A fonte original e mantida sem alteracoes como evidencia.

Nenhuma fonte da aplicacao, Git, Obsidian ou producao foi alterada por esta subtarefa. Nao houve envio de notificacao, leitura de inscritos ou chamadas aos provedores de push. A correcao e publicacao pertencem ao agente principal.

