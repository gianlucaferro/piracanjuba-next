# IndexNow automático

O workflow `Production smoke` (`.github/workflows/post-deploy.yml`) avisa o IndexNow sobre as URLs do piracanjuba.ai que mudaram em cada implantação de produção. O envio roda no job `indexnow`, separado do job `smoke`, e só começa se o smoke passou (`needs: smoke`). Uma falha do IndexNow deixa o job `indexnow` vermelho, com o X no commit e na lista do Actions, e não muda o resultado do smoke.

No disparo automático não há aviso por e-mail: quem dispara a execução é o `vercel[bot]` (conferido na execução de 2026-11-17), e a notificação do Actions vai para quem disparou. Quem quiser aviso ativo precisa de um passo explícito (abrir issue, mandar mensagem) quando o job falhar.

- `indexnow-lib.mjs`: lógica pura (rotas, sitemap, filtros, payload, conferência da chave e regra de novas tentativas), testada em `tests/indexnow.test.mjs`.
- `submit.mjs`: busca implantações no GitHub, compara commits, lê o sitemap e faz o POST em `https://api.indexnow.org/indexnow`.

A chave `46a581837ee2463ea50d40b6895646bc` fica no código porque é pública por design: o protocolo exige o arquivo `public/46a581837ee2463ea50d40b6895646bc.txt`. Antes de enviar, o script busca o `keyLocation` do payload sem seguir redirecionamento e exige HTTP 200 com a chave no corpo. Se a URL redirecionar (3xx), responder outro código ou não trouxer a chave, o envio é cancelado com a mensagem do motivo: sem a chave no `keyLocation` o IndexNow responde 403, e a documentação dele (indexnow.org/documentation, lida em 2026-11-17) não diz que segue redirecionamento.

## O que é enviado

Sem estado guardado entre execuções:

1. A implantação anterior é a última implantação `Production` bem-sucedida criada antes da atual, pela API de deployments do GitHub (permissão `deployments: read`). A lista é lida página a página (100 por página, da mais nova para a mais antiga) só até achar a anterior, o que permite repetir o envio de uma implantação antiga com muitas implantações mais novas depois dela.
2. `git diff --name-only` entre os dois commits. Cada arquivo de `src/app/<rota>/` leva as URLs do sitemap atendidas pela page daquela pasta; uma page dinâmica alterada (`camara/[aba]`, `compra-e-venda/[id]`) leva todas as URLs que ela atende. Os arquivos de `DATA_FILE_ROUTES` levam as páginas deles: dados de `src/data` (horários de ônibus, plantão de farmácias, na mídia, nota PNTP, página de empresa, telefones públicos de `/contatos`, `/seguranca` e `/beneficios-sociais`) e helpers de `src/app` usados por uma page filha dinâmica (`vereadores/tratamento.ts` e `vereadores/remuneracao.ts` levam `/vereadores/<slug>`). O mapa de links do guia (`src/data/zap-pba-paginas.json`) aciona `/zap-pba`. Alterações em `public/empresas/<slug>/`, inclusive em subpastas, acionam `/<slug>` quando existe uma página estática em `src/app/<slug>/`. Pastas de mídia com nome diferente da rota exigem mapeamento explícito.
3. URLs do sitemap de produção com `lastmod` depois do instante 2 horas antes da criação da implantação anterior e até a criação da atual. Um mesmo `lastmod` repetido em 10 URLs ou mais é tratado como hora do build (achado IDX-06) e ignorado. A folga de 2 horas existe porque o sitemap fica em cache por até 1 hora (`revalidate = 3600` em `src/app/sitemap.ts`): o sitemap lido no envio da implantação anterior podia estar até 1 hora atrás do banco, e uma mudança só do banco nesse intervalo (sem arquivo no diff) cairia antes do limite inferior da janela seguinte e não sairia em envio nenhum. As 2 horas cobrem o cache com sobra; o custo é reenviar as poucas URLs com `lastmod` real nesse intervalo, que o envio anterior pode já ter mandado. O teste confere que a folga (`LASTMOD_OVERLAP_MS`) não fica menor que o `revalidate` do sitemap.
4. Só saem URLs presentes no sitemap atual, sem repetição, até 10.000 por envio.

Sem implantação anterior identificável (a lista de implantações acabou sem nenhuma bem-sucedida antes da atual), nada é enviado e o log registra o motivo. O site inteiro nunca é reenviado. Se a busca bater no limite de segurança (20 páginas, 2.000 implantações) sem achar a anterior, o job falha com o motivo em vez de terminar verde sem enviar nada; nesse caso, o caminho é o envio manual com a lista de URLs.

Antes do cálculo, o sitemap precisa ter ao menos uma URL `/vereadores/<slug>`. O `src/app/sitemap.ts` publica só as rotas fixas, com HTTP 200, quando a consulta ao banco falha, e esse sitemap parcial fica em cache por até 1 hora. Nesse caso o job falha sem enviar nada, para que "Re-run failed jobs" recalcule a mesma janela depois que o sitemap voltar completo.

## Falhas e novas tentativas

- HTTP 5xx e erro de rede (inclusive tempo esgotado) na API do GitHub, no sitemap, no arquivo da chave e no POST do IndexNow têm até duas novas tentativas, com espera de 5 s e 15 s. 429 nunca é repetido (o IndexNow trata excesso como spam), nem os demais 4xx.
- Nas leituras (API do GitHub, sitemap e arquivo da chave), cada tentativa inclui a leitura do corpo (`readWithRetry`): o `fetch` resolve quando chegam os cabeçalhos, e o corpo pode cair (`TypeError: terminated`) ou estourar o prazo depois. O prazo de cada tentativa cobre o pedido e a leitura. No POST do IndexNow a leitura do corpo fica fora da nova tentativa, porque repetir o POST depois de um 200 reenviaria URLs já aceitas.
- Esgotadas as tentativas, o job `indexnow` termina vermelho. Para repetir o envio daquela implantação, use "Re-run failed jobs" (ou "Re-run all jobs") na execução original do Actions, em até 30 dias: o re-run reaproveita o evento original, então recalcula a mesma janela entre a implantação anterior e aquela.

## Escolhas deliberadas

- **Mudança global não dispara envio.** `src/app/layout.tsx`, `globals.css`, `sitemap.ts`, `robots.ts`, `src/components`, `src/lib`, `src/hooks` e os `*Api.ts` de `src/data` valem para muitas páginas ao mesmo tempo; reenviar tudo a cada ajuste de layout seria ruído para os buscadores. Só contam as rotas tocadas diretamente.
- **Janela por hora de criação da implantação no GitHub.** A Vercel cria o registro no GitHub depois do build, então dados alterados durante o build entram nesta janela, e dados alterados depois entram na próxima. O limite inferior recua 2 horas pelo cache do sitemap (item 3 de "O que é enviado"); a sobreposição entre janelas vizinhas é intencional.
- **`lastmod` honesto depende do sitemap.** Enquanto os vereadores tiverem `updated_at` regravado pela sincronização diária, o primeiro deploy de cada dia envia as páginas deles e, se ele vier menos de 2 horas depois da sincronização, o deploy seguinte também (folga do item 3).
- **Data só com dia** (como `conferidoEm` das empresas) vira 15:00 UTC; pode cair fora da janela. Por isso `empresas.ts` e `empresas-slugs.ts` também levam as páginas de empresa pelo diff.

## Envio manual

Actions, `Production smoke`, `Run workflow`:

- `urls`: lista separada por espaço, vírgula ou linha. Só `https://piracanjuba.ai/...` (sem `www`, `http`, usuário, senha ou porta); uma inválida cancela o envio inteiro. No manual a URL não precisa estar no sitemap, para permitir avisar uma página removida.
- `urls` vazio: refaz o cálculo automático da última implantação de produção. Só repete um envio que falhou enquanto não houver implantação mais nova; depois disso, use o re-run da execução original (seção anterior). As rotas vêm do commit daquela implantação.
- `simular`: só lista no log o que seria enviado.

## Respostas do IndexNow

200 e 202 contam como sucesso. 400 (formato), 403 (chave recusada), 422 (URL fora do host) e 429 (excesso) viram erro no log, com o corpo da resposta, e deixam o job vermelho. 5xx é repetido como descrito em "Falhas e novas tentativas". Códigos conferidos em indexnow.org/documentation em 2026-11-17.
