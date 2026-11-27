# Empresa recusou a landing page

Decisão do operador em 2026-11-26. Quando uma empresa não contratar a landing page feita para ela no Piracanjuba.ai, a página de marca sai do ar e fica só a ficha neutra do guia (Zap PBA) em `/zap-pba/<slug>`, com os dados públicos do negócio.

**Gatilho:** o operador escreve "Empresa X recusou landing page", ou diz que a empresa não pagou a landing. Faça as alterações abaixo sem perguntar de novo. Se a empresa pagar depois, o operador avisa e a landing volta (reverta o rebaixamento dela).

Em 2026-11-26 o operador listou quem pagou a landing e mandou rebaixar todas as outras: "Para todos os outros, faça o que combinamos para quem não pagou a landing page". O DR Park (`/estacionamentoaeroporto`) pagou e ficou. Antes de mesclar, confira que todos os checks do PR passaram, inclusive o `browser`. Neste repositório nenhum check é obrigatório, e `gh pr merge --auto` mescla na hora.

## Por que não manter nem apagar

- **Manter a landing de marca:** depois da recusa, logo, cores e fotos da empresa viram uso de marca e de imagem sem autorização. A página parece a oficial, o que gera risco de reclamação e desgaste numa cidade pequena.
- **Apagar e desindexar:** perde a posição no Google para o nome da empresa e as buscas que a página já recebe.
- **Ficha neutra:** é uma listagem de guia comercial com dados públicos. Preserva o SEO e dá números do Search Console para uma nova abordagem.

## Ciclo

1. **Demonstração:** landing completa, sem o selo "Página patrocinada" nem `rel="sponsored"`, com prazo combinado (ex.: 15 dias).
2. **Recusa ou prazo vencido:** rebaixar para a ficha (abaixo), num PR só.
3. **Depois de 60 a 90 dias:** nova abordagem com as impressões e os cliques da ficha no Search Console.
4. **Pedido de remoção:** seguir a seção "Atualização e retirada" de [previas-zap.md](previas-zap.md): 404, retirada do sitemap e do guia, IndexNow manual da URL retirada. Atender na hora e confirmar por escrito.

**Nunca:** pôr anúncio de concorrente na ficha, redirecionar o tráfego da marca para outra empresa ou deixar a ficha com cara de página oficial.

## Rebaixar para a ficha

1. Apague a página própria (`src/app/<slug>/`), os arquivos em `public/empresas/<slug>/` e os scripts de imagem dela em `scripts/empresas/`.
2. Recoloque a ficha em `src/data/previas-zap.json`, em ordem alfabética, recuperando a versão anterior à página própria pelo Git:
   - **sem `logo` e sem `cor`**;
   - mantenha `foto` com a foto de setor (`/marcas-zap/setores/...`), nunca foto da empresa;
   - só dados públicos do negócio: nome, categoria, setor, telefone comercial, oferta, endereço, mapa, Instagram, site, resumo factual, atividade, `acao` e `mensagem`;
   - nada de celular pessoal nem nome do dono, salvo se o próprio negócio publicar.
3. Apague o logo em `public/marcas-zap/logos/` se nenhuma outra ficha o usar.
4. Acrescente `{ slug, curta }` a `FICHAS_REBAIXADAS` e tire a URL curta de `SLUGS_PAGINAS_EMPRESARIAIS`, ambos em `src/data/empresas-slugs.ts`. `slug` é o da ficha (`/zap-pba/<slug>`) e `curta` é o endereço da antiga landing na raiz, que pode ser diferente (`/manicure` serve `adriana-manicure-e-pedicure`). Assim o middleware leva as outras grafias (`/MasterTechAutoCenter`) à ficha, o `next.config.ts` cria o rewrite da URL curta e a ficha passa a mostrar o **WhatsApp só como número, sem link**, como se vê no item abaixo.
   - **WhatsApp sem clique** (decisão do operador em 2026-11-26: "deixe apenas o número visível, mas sem opção de clicar para ir direto. Essa vai ser uma funcionalidade exclusiva de quem pagou pela landing page"). Para os slugs de `SLUGS_FICHAS_REBAIXADAS`, `src/app/zap-pba/[slug]/page.tsx` faz o seguinte, sem passo manual:
     - tira o botão de WhatsApp do topo e mostra "WhatsApp (DD) XXXXX-XXXX" como texto;
     - mostra o número da seção de contatos sem link;
     - liga `formatDetection: { telephone: false }`, para o iPhone não transformar o número em link.

     Continuam clicáveis "Como chegar", Instagram, site, "Quero personalizar a página" e "Solicitar ajuste ou remoção". O guia `/zap-pba`, a lista, **não muda**: lá o WhatsApp de todas as empresas continua clicável.

     A ficha rebaixada também mostra no topo a faixa do proprietário, que vale para toda ficha do guia (ver [as prévias do Zap PBA](previas-zap.md)). Nada a fazer por empresa.
5. URL curta e atalhos:
   - a URL curta (`/<curta>`) **serve a ficha por rewrite**, gerado em `rewrites` do `next.config.ts` a partir de `FICHAS_REBAIXADAS`, com 200 e canonical em `/zap-pba/<slug>`. Apague o 308 antigo `/zap-pba/<slug>` para `/<curta>` em `redirects` e em `REDIRECIONAMENTOS_PERMANENTES`. Não use 308: o 308 antigo `/zap-pba/<slug>` para `/<slug>`, do tempo da landing, pode estar guardado no navegador, e o novo formaria um laço (apontado pelo CodeRabbit no PR #102);
   - os atalhos (ex.: `/mastertech`) passam a fazer 308 para `/zap-pba/<slug>`, em `redirects` do `next.config.ts` e em `REDIRECIONAMENTOS_PERMANENTES` de `src/lib/sitemap-rotas.ts`;
   - tire a URL curta de `REDIRECIONAMENTOS_PERMANENTES` e de `ROTAS_ESTATICAS`.
6. Aponte `src/data/zap-pba-paginas.json` de volta para `/zap-pba/<slug>`.
7. Tire a entrada da página própria de `src/data/llms.ts`.
8. Cartão de compartilhamento:
   - tire o rewrite de `/marcas-zap/compartilhar/<slug>.jpg` em `next.config.ts`;
   - recoloque em `public/marcas-zap/compartilhar/<slug>.jpg` o cartão genérico, **sem logo**: painel na cor da categoria, nome, atividade e a foto do setor, no padrão das fichas sem logo. Gere com `node scripts/zap-pba/cartao-ficha.mjs <slug>` na GianlucaGamer (`desktop-run`), depois da ficha no catálogo; traga o JPEG do espelho para o M5. O cartão anterior à página própria pode ter logo e cor da marca; só reuse o que não tiver.
9. Ficha sem telefone público (ex.: Grupo Agro França, só Instagram) é aceita com `"telefones": []`, desde que tenha Instagram ou site: a ficha some com o bloco de WhatsApp.
10. Ajuste os testes que citam o slug. O teste "empresa que recusou a landing volta à ficha neutra" de `tests/sitemap-rotas.test.ts` confere o estado de toda ficha rebaixada.
11. Depois do deploy, confira:
    - a URL curta com 200 e canonical na ficha;
    - os atalhos e as outras grafias com 308 para a ficha;
    - a ficha com 200 e sem logo;
    - o cartão sem logo;
    - o sitemap;
    - o job `indexnow` do Production smoke. Mande à mão as URLs que ele não cobrir: a ficha e a URL curta.

## Histórico

| Data | Empresa | Ficha |
|---|---|---|
| 2026-11-26 | Master Tech Auto Center (recusou) | `/zap-pba/master-tech-auto-center` |
| 2026-11-26 | Claro (não pagou) | `/zap-pba/claro`, URL curta `/claro` |
| 2026-11-26 | Grupo Agro França (não pagou; ficha nova, só Instagram) | `/zap-pba/agro-franca`, URL curta `/agro-franca` |
| 2026-11-26 | Adriana Manicure e Pedicure (não pagou) | `/zap-pba/adriana-manicure-e-pedicure`, URL curta `/manicure` |
| 2026-11-26 | Kamilla Morranna (não pagou) | `/zap-pba/kamilla-morranna`, URL curta `/kamillamorranna` |
| 2026-11-26 | B10 Auto Center (não pagou; ficha nova) | `/zap-pba/b10-auto-center`, URL curta `/b10-auto-center` |
