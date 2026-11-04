# Piracanjuba: catálogo somente leitura de push

Data: 2026-11-04. Projeto: `oinweocqcptwxqsztlcl`.

## Resultado

O banco mantém uma entrada de inscrição pública sem limite de volume ou tamanho de campos. Há cinco consumidores internos de `send-push` a preservar. Quatro enviam a chave pública anônima como Bearer; o quinto usa um cliente service role. O corpo implantado de `send-push` está sendo recuperado separadamente pelo agente principal. A análise abaixo não transforma o código local em prova do comportamento remoto.

Nenhum push, RPC de negócio, coleta ou alteração no banco foi executado. Consultas retornaram apenas metadados, hashes, classificações e agregados. Não foram retornados endpoints de assinantes, chaves, comandos de cron ou definições SQL literais.

## Catálogo implantado e compatibilidade

| Função | Versão | verify_jwt | Papel |
| --- | --- | --- | --- |
| send-push | 23 | false | Destino das notificações |
| unsubscribe-push | 23 | false | Exclusão por conhecimento do endpoint, apenas no código local consultado |
| sync-prefeitura-diaria | 31 | true | POST send-push, Bearer SUPABASE_ANON_KEY |
| sync-prefeitura-mensal | 29 | false | POST send-push, Bearer SUPABASE_ANON_KEY |
| import-folha-manual | 26 | true | POST send-push, Bearer SUPABASE_ANON_KEY |
| import-folha-xlsx | 26 | true | POST send-push, Bearer SUPABASE_ANON_KEY |
| sync-health-check | 26 | false | functions.invoke por cliente SUPABASE_SERVICE_ROLE_KEY |

As quatro versões e hashes de bundle dos consumidores antigos continuam iguais ao backup revisado em `outputs/correcoes-consumo-2026-11-03/live-backup/manifest.json`. Seus entrypoints eram idênticos à fonte local. Nos três consumidores mensal/manual/xlsx, a dependência remota `servidor-origin.ts` difere da atual local. Uma publicação pontual deve preservar a dependência remota já conferida ou reconciliar explicitamente o diff.

Os quatro produtores usam tópico `geral`, URL `/prefeitura` e dedup_key de contrato por dia ou folha por competência. Não conferem o status HTTP do fetch; rejeitar suas credenciais antigas poderia perder notificações silenciosamente. Devem ser adaptados junto com a autenticação de send-push.

O quinto consumidor foi recuperado novamente via MCP. Os três arquivos do bundle são exatos contra o checkout atual. Bundle SHA256: `4075c0be7e7cdbf641cfc0313a36d7fee0913d3f068647e1d1981fe925e60343`. A política de saúde envia title, body e URL `/admin`, sem tópico nem dedup_key, quando encontra sincronizações críticas. Preservar esse broadcast para a identidade interna. Não exigir tópico ou dedup_key incondicionalmente sem adaptar esse consumidor.

Nenhuma outra referência direta a send-push foi encontrada nas fontes atuais além desses cinco consumidores. Nenhuma chamada cliente de inscrição/exclusão foi encontrada em `src`. `public/sw.js` ainda exibe pushes e abre a URL do payload.

## Banco, crons e controles

`public.push_subscriptions` tem RLS habilitado. A única policy permissiva é INSERT público com WITH CHECK(true). Não há triggers, CHECKs de URL/protocolo, comprimento, formato de chaves ou tópico. Os campos endpoint, keys_p256dh, keys_auth e topic são TEXT; os únicos constraints são PK(id) e UNIQUE(endpoint).

Os roles anon/authenticated têm grants amplos de tabela, mas não possuem policy permissiva de SELECT, UPDATE ou DELETE. Portanto, não há evidência de leitura pública de assinantes via REST. O grant TRUNCATE é excessivo e não é protegido por RLS, porém o CRUD normal do PostgREST não oferece TRUNCATE. Não foi localizada uma RPC que o exponha para esta tabela.

A gravação pública permite inflar armazenamento e, se a função de envio consumir essas entradas sem validar destino/volume, aumentar o trabalho e o tráfego de cada disparo. Essa combinação exige contenção também na inscrição, mesmo depois de proteger o handler.

Não foram encontrados corpos de funções SQL ou comandos de cron contendo send-push, unsubscribe-push, push_subscriptions ou os nomes dos quatro consumidores antigos. Isso não prova ausência de invocadores externos ou chamadas construídas dinamicamente.

Há um caminho indireto ativo confirmado:

1. Job 151 `sync-health-check-daily`, `0 10 * * *`, usuário postgres.
2. `public.invoke_edge_function_secure(function_name text, body_json jsonb)`.
3. Header x-cron-secret obtido do mecanismo cron_secret.
4. `sync-health-check` autentica a solicitação e cria cliente service role.
5. O helper chama send-push para alerta.

O wrapper é privado: EXECUTE anon=false, authenticated=false, service_role=true. Hash da definição: `410ebab859eae0e3d1e6f70752779fe6`. O cron não precisa ser alterado para o novo send-push aceitar identidade service role.

## Uso agregado observado

- Uma inscrição, tópico `geral`, protocolo HTTPS e hostname `fcm.googleapis.com`.
- Inscrição criada em 2026-03-26, zero novas nos últimos 30 dias.
- Comprimentos máximos: endpoint 188, chave p256dh 87, chave auth 22, tópico 5.
- 23 registros push_* de sucesso; primeiro 2026-03-27, último 2026-05-01.
- Zero logs push_* nos últimos 7 e 30 dias.

Esses números não demonstram que todos os envios são registrados. O handler local registra sucesso apenas quando dedup_key existe e sent>0, portanto alertas sem dedup_key, falhas e envios sem assinantes podem ficar fora desse agregado. Uso baixo não equivale a proteção contra abuso.

## Ambiente, somente nomes

- Send-push local referencia SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e VAPID_PRIVATE_KEY.
- Os quatro produtores referenciam SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e SUPABASE_ANON_KEY. O mensal também referencia CRON_SECRET e CENTI_INGEST_SECRET.
- Sync-health-check remoto referencia SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e CRON_SECRET.
- O código local tem constantes VAPID_PUBLIC_KEY e VAPID_SUBJECT. Seus valores não foram incluídos neste relatório.
- O catálogo MCP não lista nomes de secrets. A presença atual dessas variáveis no ambiente de send-push não foi atestada por este agente. Dry runs anteriores de outros handlers corroboram o segredo interno, mas não substituem inventário de nomes do runtime.

## Proposta mínima

1. Proteger send-push por autenticação interna constante, antes de parse/consulta/VAPID, aceitando o serviço já usado por sync-health-check.
2. Atualizar os quatro produtores da chave pública para credencial interna, preservando seus payloads e o tratamento independente da coleta.
3. Limitar corpo e campos; permitir somente URLs internas seguras; validar inscrições antes de abrir conexões externas e aplicar timeout, limite de lote e limite de execução. A allowlist de provedores deve considerar Web Push legítimo de Chrome, Firefox e Safari, sem aceitar hosts arbitrários.
4. Tornar deduplicação e quota globais persistentes e atômicas. A leitura seguida de envio e posterior log do código local permite corrida; um contador local de isolate não resolve repetição distribuída.
5. Em migration separada e especificamente autorizada, proteger INSERT legado com validação de campos, quotas globais e teto de cardinalidade, preservando a assinatura antiga. Revogar grants desnecessários. Um futuro endpoint de inscrição pode adicionar quota por HMAC e validação de origem.
6. Revisar unsubscribe-push depois de recuperar seu bundle: conhecimento do endpoint pode funcionar como capacidade de cancelamento, mas não há autenticação adicional nem limite de corpo no código local. Não classificar isso automaticamente como quebra de autenticação sem considerar esse contrato.

## Limitações

O get_edge_function de unsubscribe-push devolveu erro interno. Nenhuma conclusão sobre seu corpo implantado foi afirmada. A fonte de send-push é responsabilidade da recuperação paralela do agente principal. Não houve tentativa de exploração, envio de push, teste com endpoint externo ou leitura do conteúdo de logs/assinaturas.

Evidência estruturada: `catalog-readonly.json`. O campo bruto de heurística has_url_validation para o UNIQUE(endpoint) significa apenas que a definição menciona endpoint. Não representa validação de URL; a tabela não tem CHECK.

