# IndexNow automático

O workflow `Production smoke` (`.github/workflows/post-deploy.yml`) avisa o IndexNow sobre as URLs do piracanjuba.ai que mudaram em cada implantação de produção. O passo roda depois do smoke e só se o smoke passou. Falha no IndexNow aparece no log como erro, mas não derruba o job: o smoke continua sendo o sinal principal.

- `indexnow-lib.mjs`: lógica pura (rotas, sitemap, filtros, payload), testada em `tests/indexnow.test.mjs`.
- `submit.mjs`: busca implantações no GitHub, compara commits, lê o sitemap e faz o POST em `https://api.indexnow.org/indexnow`.

A chave `46a581837ee2463ea50d40b6895646bc` fica no código porque é pública por design: o protocolo exige o arquivo `public/46a581837ee2463ea50d40b6895646bc.txt`. Antes de enviar, o script confere se o arquivo publicado contém a chave; se não contiver, cancela, porque um 403 pode queimar a chave para o domínio.

## O que é enviado

Sem estado guardado entre execuções:

1. A implantação anterior é a última implantação `Production` bem-sucedida criada antes da atual, pela API de deployments do GitHub (permissão `deployments: read`).
2. `git diff --name-only` entre os dois commits. Cada arquivo de `src/app/<rota>/` leva as URLs do sitemap atendidas pela page daquela pasta; uma page dinâmica alterada (`camara/[aba]`, `compra-e-venda/[id]`) leva todas as URLs que ela atende. Os arquivos de dados de `DATA_FILE_ROUTES` (horários de ônibus, plantão de farmácias, na mídia, nota PNTP, página de empresa) levam a página deles.
3. URLs do sitemap de produção com `lastmod` depois da criação da implantação anterior e até a criação da atual. Um mesmo `lastmod` repetido em 10 URLs ou mais é tratado como hora do build (achado IDX-06) e ignorado.
4. Só saem URLs presentes no sitemap atual, sem repetição, até 10.000 por envio.

Sem implantação anterior identificável, nada é enviado e o log registra o motivo. O site inteiro nunca é reenviado.

## Escolhas deliberadas

- **Mudança global não dispara envio.** `src/app/layout.tsx`, `globals.css`, `sitemap.ts`, `robots.ts`, `src/components`, `src/lib`, `src/hooks` e os `*Api.ts` de `src/data` valem para muitas páginas ao mesmo tempo; reenviar tudo a cada ajuste de layout seria ruído para os buscadores. Só contam as rotas tocadas diretamente.
- **Janela por hora de criação da implantação no GitHub.** A Vercel cria o registro no GitHub depois do build, então dados alterados durante o build entram nesta janela, e dados alterados depois entram na próxima.
- **`lastmod` honesto depende do sitemap.** Enquanto os vereadores tiverem `updated_at` regravado pela sincronização diária, o primeiro deploy de cada dia envia as páginas deles.
- **Data só com dia** (como `conferidoEm` das empresas) vira 15:00 UTC; pode cair fora da janela. Por isso `empresas.ts` e `empresas-slugs.ts` também levam as páginas de empresa pelo diff.

## Envio manual

Actions, `Production smoke`, `Run workflow`:

- `urls`: lista separada por espaço, vírgula ou linha. Só `https://piracanjuba.ai/...` (sem `www`, `http`, usuário, senha ou porta); uma inválida cancela o envio inteiro. No manual a URL não precisa estar no sitemap, para permitir avisar uma página removida.
- `urls` vazio: refaz o cálculo automático da última implantação de produção (serve para repetir um envio que falhou). As rotas vêm do commit daquela implantação.
- `simular`: só lista no log o que seria enviado.

## Respostas do IndexNow

200 e 202 contam como sucesso. 400 (formato), 403 (chave recusada), 422 (URL fora do host) e 429 (excesso) viram erro no log, com o corpo da resposta. Códigos conferidos em indexnow.org/documentation em 2026-11-17.
