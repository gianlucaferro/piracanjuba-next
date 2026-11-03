# Grupos econômicos: atualização e comparação

## Diagnóstico confirmado em 2026-11-03

Consulta somente leitura ao Supabase `oinweocqcptwxqsztlcl`: três grupos, oito empresas, valor agregado de R$ 5.243.195,77. Todos foram consolidados em `2026-07-16T02:07:05Z`, correspondente a `2026-07-15` em Goiás. Não há função de recomputação de grupos na base atual.

Há 6.598 contratos da Prefeitura, dos quais 4.062 têm CNPJ com 14 dígitos; 3.629 fornecedores no cache, 2.896 com QSA não vazio. Os contratos já tinham atualização de `2026-11-03`, e o QSA mais recente foi consultado em `2026-10-30`. Essas contagens são o estado observado, não uma declaração de cobertura integral das fontes.

## Implementação

- A página passa a mostrar a data de consolidação de cada grupo.
- Consulta financeira sob demanda, paginada por CNPJ, separando Prefeitura e Câmara, contratos originais e aditivos. Comparação anual, participação de cada empresa no próprio grupo e links das fontes/documentos.
- Termos da Câmara usam exclusivamente `contrato_camara.tipo=Aditivo`; não se somam novamente os termos dessa origem em `contratos_aditivos`. Aditivos da Prefeitura exigem host oficial reconhecido.
- Os valores representam registros contratuais, não pagamentos. Datas ausentes e valores não informados ficam explícitos. Ano corrente é parcial.
- A nova Edge Function `sync-grupos-economicos` usa somente dados já coletados, sem IA, serviços pagos nem consultas externas adicionais. Lê as bases paginadas e recusa truncamento.
- Relações exigem nome normalizado e documento público idêntico, incluindo a mesma máscara de CPF. Nomes isolados, documentos ausentes e máscaras divergentes não geram vínculos. Homônimos com os mesmos dígitos publicados ainda são uma limitação, explicitada na página. CPF integral é mascarado e rejeitado no payload da RPC pública restrita.
- Publicação atômica com identidade baseada no conjunto ordenado de CNPJs; preserva IDs e setor dos grupos existentes. Hash do conteúdo evita alterar `atualizado_em` em verificações sem mudança. `grupo_economico_atualizacao.verificado_em` guarda a checagem separadamente.
- Snapshot vazio não apaga grupos existentes automaticamente. A RPC confere contagem e última alteração de cada origem sob lock compartilhado curto, recusando dados desatualizados durante a coleta.
- Cron preparado para `0 22 * * *` UTC, depois das coletas diárias de contratos. Usa `invoke_edge_function_secure`, sem segredo literal, com patch da allowlist protegido pelo hash verificado da função atual.

## Aplicação e rollback

Nenhuma migration, deploy, refresh ou cron foi executado por este subagente.

Antes de aplicar: salvar as linhas completas de `grupo_economico` e `grupo_economico_membro`, respectivas ACLs, definição de `invoke_edge_function_secure` e estado do registry/cron em backup restrito no M5. A aplicação exige a autorização específica de banco coordenada pelo agente principal.

Backup das duas tabelas e ACLs capturado e armazenado em `work/grupos-backup-2026-11-03/snapshot.json`, diretório 0700 e arquivos 0600. SHA256 `21f865126f1f2ab3028164c3fbfcc9877ec7e61705b6069648b8d061a942e744`. Restore transacional concreto em `work/grupos-backup-2026-11-03/restore-snapshot.sql`, SHA256 `9c3874183fdb804758f281400f67efd7a059029ab9fa22ee9e98ea1bb2cd0554`. São três cabeçalhos e oito membros; única FK dependente é a dos próprios membros. Os arquivos privados não entram no Git nem no worker. Rollback específico de cron/allowlist em `outputs/grupos-rollback-cron-2026-11-03.sql`.

Ordem: testar `tests/grupos-snapshot-postgres.sql` em Postgres descartável; aplicar `20261103230000_grupos_snapshot_atomico`; publicar Edge Function com `verify_jwt=false` (autenticação própria estrita por segredo de cron ou chave service_role antes dos efeitos); validar recusa de chamadas não autenticadas; aplicar `20261103230100_grupos_cron_seguro`, habilitando allowlist e agenda; fazer o canário autorizado pelo dispatcher e validar logs, ACLs, cobertura e a página pública. Se o canário falhar, desativar o novo cron até corrigir. Não alterar modelos de IA. A aplicação efetiva está registrada em `publicacao-melhorias-2026-11-03.md`.

Rollback: desativar/remover somente `sync-grupos-economicos-daily`, restaurar o dispatcher a partir do backup após conferir ausência de mudanças alheias, retirar a linha de registry desse coletor e voltar o frontend. Se o snapshot tiver mudado e precisar de reversão, restaurar os dois backups de grupos na mesma transação, preservando as chaves originais. O frontend anterior funciona com as colunas adicionais, portanto não há necessidade imediata de destruir schema. Remover a função e tabela adicionais somente depois de confirmar que nenhum consumidor depende delas. As revogações de escrita pública dos grupos podem permanecer: leitura pública é preservada e não havia política legítima de escrita para esses papéis.

## Validação preparada

- Node: `tests/grupos-metricas.test.ts`, valores negativos de supressão, separação de órgãos, deduplicação, cobertura ausente, percentuais no recorte e URLs seguras.
- Deno: `_shared/grupos-economicos.test.ts`, componentes transitivos, homônimos sem documento, CPF mascarado, ausência de contratos e determinismo.
- Postgres descartável: `tests/grupos-snapshot-postgres.sql`, identidade estável, idempotência, stale snapshot, esvaziamento, proteção de CPF, rollback atômico e privilégios da RPC.

Os testes globais e publicação são coordenados pelo agente principal. Este relatório não declara execução antes do resultado dessas etapas.
