# Assistente com fontes verificáveis

Data: 2026-11-03. Implementação local no Piracanjuba.ai.

- O backend emite um evento SSE `sources` antes dos tokens da resposta. As fontes são montadas a partir dos domínios efetivamente consultados e dos registros retornados. O conteúdo gerado pelo modelo não define links clicáveis.
- O frontend mostra fontes, referência temporal e limites do recorte por resposta. Aceita apenas URLs HTTP/HTTPS sem credenciais. Markdown produzido pelo modelo continua sendo texto, negrito e listas, sem HTML e sem links clicáveis automáticos.
- Folhas são consultadas separadamente para Prefeitura e Câmara, na última competência de cada órgão. Cada linha inclui a competência. O recorte de 30 maiores remunerações informa o total de holerites da competência e não pode ser apresentado como total da folha.
- Contratos incluem início da vigência e links de origem disponíveis. A cobertura explicita que aditivos não foram agregados neste recorte. Obras mantêm o filtro de cadastro oficial e os links existentes.
- Subsídios fixos de 19.875 e 9.875 foram removidos do contexto institucional. O salário da chefia agora depende da remuneração real localizada na folha, com competência explícita. O valor bruto não é apresentado como prova do subsídio fixado em lei.
- Demais fontes ligam à seção correspondente e explicam a amostra. Quando não há referência temporal no recorte, a interface informa essa ausência, sem inventar data.
- Provedores, modelos, temperatura, limites por IP, limite diário, máscara de CPF e histórico em memória foram preservados. O adaptador de RPC foi tipado como Promise para compatibilidade com o Supabase atual, sem mudar o comportamento do guard.

## Validação

- Três testes Node do parser e renderização de metadados aprovados: SSE fragmentado, fim sem quebra de linha, recusa de links inválidos e separação dos links inventados no texto do modelo.
- Cinco testes Deno aprovados: protocolos, credenciais em URL, deduplicação por período, referência por campos explícitos, evento independente e cancelamento do upstream.
- `deno check` aprovado para `chatbot/index.ts` e `admin-sync-status/index.ts`.
- Nenhuma chamada a modelo pago foi realizada nos testes. A validação integral de build, lint, tipos e navegação será consolidada pelo agente principal.

## Backup e publicação

Backup da função em produção obtido pelo conector Supabase e salvo em `work/chatbot-2026-11-03/backup-live-response.json`, fora do Git. Publicar o pacote do chatbot junto dos helpers existentes e de `_shared/chatbot-sources.ts`, mantendo o valor atual de `verify_jwt`. O frontend antigo ignora o novo evento sem quebrar a transmissão; o frontend novo continua aceitando respostas antigas sem fontes.

Rollback: republicar o pacote anterior preservado e reverter `ChatWidget.tsx`/`chat-stream.ts` pelo commit. Nenhuma migration é necessária para esta melhoria. Não houve publicação em produção nesta subtarefa.
