# Piracanjuba.ai: escritas públicas

Pacote independente baseado em `b8b3137`, branch `codex/piracanjuba-public-writes`. Projeto Supabase `oinweocqcptwxqsztlcl`. Código preparado no M5; validações no Dell. Estado atualizado em 2026-11-04: endpoint, frontend e corte SQL publicados nessa ordem, após autorização específica. Agendamentos, coletores, pagamentos e dados de negócio preservados. As seções de diagnóstico e preparação abaixo registram os snapshots anteriores.

## Publicação concluída em 2026-11-04

- Preflight fresco sem divergência em seis grupos de metadados: policies, grants, ACLs de tabela/coluna, RLS e bucket. Backup final em production-pre-cut-backup.json.
- admin-farmacia-update v1 ACTIVE, verify_jwt=true e quatro arquivos remotos idênticos aos revisados. Cinco testes de OPTIONS, método e autenticação passaram sem escrita de negócio.
- PR 30 integrada após Quality 41764564081 aprovado, incluindo checks e browser. Merge ba35806c821788713dba728834b92f854ef102e7. Vercel dpl_B2btbrJuA5uGRctBevvV1LYQTwP2 READY, ambos os aliases de produção confirmados antes do SQL.
- /admin e 19 chunks JavaScript HTTP 200. Código servido pelo domínio contém chamada real ao endpoint novo, com admin_token e as três ações permitidas.
- Migration autorizada aplicada em transação às 2026-11-04T03:07:45Z. O MCP registrou a versão 20261104030745, nome 20261104030000_restringe_escritas_publicas. Conciliar esse mapeamento antes de qualquer db push futuro; não reaplicar nem reparar automaticamente.
- anon e authenticated conservam SELECT e perderam todas as escritas e MAINTAIN nas duas tabelas. ACLs privilegiadas, demais policies e leituras públicas do bucket permanecem iguais. Três policies restritivas protegem a escrita no bucket, com limite de 524288 bytes e image/webp.
- Comparação antes/depois confirmou iguais os hashes de 22 linhas de farmácias, 78 registros de jobs e 23 objetos de Storage, além da definição do monitor e dos 85 agendamentos. Nenhuma linha ou foto foi alterada ou removida.
- Após o SQL, duas leituras REST anônimas retornaram HTTP 200. Navegador confirmou login administrativo sem erros e página de farmácias com foto 540x405 carregada, modal abrindo/fechando e nenhum erro de console.
- Production smoke 41764937043 passou antes do corte. Uma única repetição do script existente no Dell, depois do SQL, confirmou 18/18 rotas HTTP 200. Projeto Supabase ACTIVE_HEALTHY.
- Nenhum upload, alteração de telefone, exclusão, IA, email ou coleta foi usado como teste real. Sucesso das escritas administrativas foi validado com backend simulado antes da publicação; não havia sessão administrativa autenticada no navegador desta conferência.

Recibos em production-endpoint-*, production-frontend-verification.json, production-migration-receipt.json, production-final-verification.json, production-public-reads.json e production-ci-smoke.json. O frontend novo deve permanecer junto ao corte SQL. Painéis antigos abertos precisam ser recarregados.

O catálogo live confirmou que `admin-farmacia-update` ainda não existe. É função nova, não há bundle implantado sendo substituído ou rebaixado. `admin-anuncios-update` v6 e `admin-sync-status` v1 foram apenas identificados e permanecem intocados.

## Diagnóstico confirmado

- `farmacia_fotos`: policies INSERT/UPDATE/DELETE com `true`, aplicáveis a PUBLIC; grants de escrita a anon/authenticated.
- `sync_job_registry`: policy chamada `Service role full access` aplicável a PUBLIC, com ALL/true. Nome não refletia a autorização real.
- `farmacia-fotos`: bucket público, upload/update anônimos, sem limites individuais de tamanho ou MIME. 23 objetos observados, todos WebP, maior 73.750 bytes. Nenhuma foto foi baixada ou alterada.
- Inventário completo `aclexplode` também encontrou MAINTAIN (PostgreSQL17) para anon/authenticated. Não há grants a PUBLIC nem por coluna nas duas tabelas.
- Metadados de backup em `live-metadata.json` e `live-acl.json`. Sem dados de sessões, tokens ou informações de clientes.

## Comportamento final

`admin-farmacia-update` recebe apenas POST, com sessão própria do painel no campo `admin_token`. Usa o hash SHA-256, registro singleton, validade de expiração e recusa quando a consulta falha. O JWT do gateway é adicional e não substitui essa autenticação. Token não é devolvido nem gravado em logs.

O corpo real do stream é limitado a 710.000 bytes antes de JSON.parse. Upload exige nome da mesma lista de 20 farmácias do painel, base64 limitado e container WebP estático com dimensões de até 540x2160, no máximo 512 KiB. O servidor escolhe o path determinístico. A validação estrutural não é um decodificador completo; o navegador continua convertendo o arquivo para WebP antes do envio. MIME do bucket também fica restrito a image/webp e 524.288 bytes.

Upload sobrescreve somente o path fixo da farmácia e a URL da foto. Telefone é atualizado sem sobrescrever foto concorrente. Remover foto limpa somente `foto_url`, preservando telefone. Como no fluxo anterior, o objeto já público permanece no Storage; a remoção não torna o antigo URL privado. Reutilizar o mesmo path evita criar objetos a cada edição. Objetos históricos fora desses paths permanecem intocados. Não há promessa de exclusão física de dados neste botão.

O novo upload atualiza `updated_at` e usa query de versão na URL para renovar a imagem no painel. A página pública conserva o cache já existente, inclusive revalidação de até uma hora no servidor. Não muda cadência de coleta nem cache global.

O painel passa a invocar o endpoint para upload, alteração de telefone e remoção. Mantém SELECT público. Erros e sucesso ficam visíveis no próprio componente com role alert/status: o código anterior usava sonner sem Toaster montado, e a jornada de navegador confirmou a ausência de feedback visual.

## Consumidores e permissões

- `src/components/admin/FarmaciaFotosAdmin.tsx`: único escritor direto encontrado no código da tabela e bucket de farmácias. Todas as escritas foram substituídas pelo endpoint.
- `src/hooks/useFarmaciaFotos.ts` e `src/lib/data/listings.ts`: leitores públicos, mantidos. Servem plantão, metadados e contatos.
- `sync_job_registry`: nenhuma chamada direta em frontend ou Edge Functions encontrada, além de tipos. Consumidores SQL são migrations e `v_sync_dashboard`; o monitor autenticado lê por service_role. Não há alteração na definição da view nem na sua interface.
- Migration remove INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN de PUBLIC, anon e authenticated nas duas tabelas. Preserva SELECT, service_role e RLS.
- Storage mantém leitura pública e acesso a outros buckets. Remove as duas policies permissivas de escrita de farmácias e adiciona três restritivas específicas para anon/authenticated, inclusive proteção contra troca de bucket por UPDATE.
- Guard interrompe a transação se surgirem grants públicos ou por coluna não cobertos pelo backup e rollback.

## Publicação após revisão e autorização do SQL

1. Integrar a PR29 da qual este pacote depende e este pacote sem substituir commits de terceiros.
2. Executar a query de backup `supabase/activation/20261104030000_public_writes_backup.sql`, comparar policies/ACL/bucket com os dois recibos. Não capturar conteúdo de `admin_sessions`.
3. Publicar apenas a nova Edge Function `admin-farmacia-update`, incluindo `_shared/admin-session-auth.ts`, `farmacia-admin.ts`, `farmacia-admin-store.ts`, mantendo verify_jwt=true. Nenhum segredo novo é necessário.
4. Canário não mutante: POST `{}` com anon deve retornar 401; sessão válida com ação/nome inválido deve retornar 400. Não realizar upload, alterar telefone ou remover foto reais só para testar.
5. Publicar frontend e conferir carregamento do painel, lista pública, botões e ausência de erros. Um painel antigo aberto deve ser recarregado para usar o endpoint.
6. Após autorização específica do operador, aplicar **somente** `supabase/migrations/20261104030000_restringe_escritas_publicas.sql`. A versão 030000 é única, distinta de 010000 na PR29. Não usar db push indiscriminado.
7. Executar `supabase/activation/20261104030000_public_writes_verify.sql`: anon/auth somente SELECT, service_role preservado, bucket público com limites, três policies restritivas e policy de leitura. Conferir o monitor autenticado e plantão sem disparar syncs.

## Backup e rollback

Nenhuma linha ou objeto existente é apagado pela migration. Os metadados anteriores estão nos recibos e devem ser recapturados antes do corte. A transação usa lock_timeout=5s e statement_timeout=30s; qualquer erro aborta o corte inteiro.

Priorizar correção do endpoint ou manter a versão nova do frontend junto das restrições SQL. Voltar apenas o frontend antigo depois do corte interromperia suas escritas diretas. Uma eventual indisponibilidade do admin não deve motivar reabertura automática de escrita pública.

Rollback completo disponível em `supabase/rollbacks/20261104030000_restringe_escritas_publicas.sql`, restaura grants/policies e limites exatamente como no snapshot, incluindo MAINTAIN. Reabre as vulnerabilidades e exige decisão específica. Também exige rollback coordenado do frontend; a nova função pode permanecer, pois exige sessão. SELECT público e jobs nunca dependem da função nova.

## Validação

Resultados consolidados em `validation.json`. Logs detalhados locais em `artifacts/public-writes` e `artifacts/farmacia-admin` (ignorados pelo Git).

- Node: regressões do projeto.
- Deno: sessão real com hash, expiração, erro fechado, validação dos dados, payload grande, formato/tamanho/dimensões, path arbitrário, falhas de Storage e preservação dos campos.
- PostgreSQL17 descartável e sem rede: anon/auth não escrevem nem mantêm tabelas; SELECT permanece; service_role e monitor funcionam; Storage protege farmácias mesmo com policy genérica; outro bucket funciona; reaplicação e rollback comparados.
- Chromium desktop e celular, backend inteiramente local mockado: PNG1080px é convertido para WebP e aceito pelo validador, upload usa sessão admin, telefone muda sem perder foto e remover foto mantém telefone. Nenhuma chamada paga ou de produção.
- TypeScript, lint e compilação Next no Dell.

Reprodução: `desktop-run --worker dell --pull artifacts -- bash scripts/validation/public-writes.sh`, depois `desktop-run --worker dell --pull artifacts -- bash scripts/validation/e2e.sh farmacia-admin tests/e2e/farmacia-admin.spec.ts`. O modo `frontend-sql` repete somente as etapas correspondentes e exige recibos anteriores aprovados para os demais gates. Uma falha local de multiplexação SSH foi contornada por ControlPath=none somente no processo de teste, preservando locks, excludes e a conexão compartilhada de outros agentes.

Limitações: não foi feito teste real de upload em produção. Deploy e SQL foram concluídos conforme o registro de execução acima. O recibo de ACL é uma fotografia temporal, não garantia sobre alterações concorrentes posteriores. Nenhuma quota de gasto em dólares foi criada por esta mudança; ela fecha os caminhos de escrita anônima identificados.
