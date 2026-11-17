import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  DATA_FILE_ROUTES,
  INDEXNOW_KEY,
  KEY_LOCATION,
  MAX_URLS,
  REQUIRED_DYNAMIC_PREFIXES,
  RETRY_DELAYS_MS,
  buildPayload,
  buildRouteTable,
  candidatePreviousDeployments,
  changedRouteDirs,
  describeIndexNowStatus,
  hasSuccessStatus,
  isIndexNowSuccess,
  isNetworkError,
  isRetryableStatus,
  keyFileProblem,
  missingDynamicRoutes,
  parseManualUrls,
  parseRouteDir,
  parseSitemap,
  resolveRoute,
  routeDirForChangedFile,
  selectUrls,
  urlsChangedByLastmod,
  urlsForRouteDirs,
  withRetry,
} from "../scripts/indexnow/indexnow-lib.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SITE = "https://piracanjuba.ai";

const PAGES = [
  "src/app/page.tsx",
  "src/app/layout.tsx",
  "src/app/globals.css",
  "src/app/sitemap.ts",
  "src/app/[empresa]/page.tsx",
  "src/app/agro/page.tsx",
  "src/app/agro/AgroClient.tsx",
  "src/app/camara/page.tsx",
  "src/app/camara/[aba]/page.tsx",
  "src/app/compra-e-venda/page.tsx",
  "src/app/compra-e-venda/[id]/page.tsx",
  "src/app/horarios-onibus/page.tsx",
  "src/app/plantao-farmacias/page.tsx",
  "src/app/api/acompanhar/route.ts",
];
const ROUTES = buildRouteTable(PAGES);

function entry(path, lastmod = "2026-11-17T13:34:26.934Z") {
  return { loc: `${SITE}${path}`, lastmod };
}

const SITEMAP = [
  entry("/"),
  entry("/agro"),
  entry("/camara"),
  entry("/camara/contratos"),
  entry("/camara/diarias"),
  entry("/compra-e-venda"),
  entry("/compra-e-venda/aba8734c-52ea-4b6b-b62d-9dc0e088a291", "2026-11-16T10:00:00.000Z"),
  entry("/horarios-onibus", "2026-11-10"),
  entry("/plantao-farmacias"),
  entry("/vitorinoperfumes", "2026-11-16T15:00:00.000Z"),
];

function pageFilesOnDisk() {
  return readdirSync(join(ROOT, "src/app"), { recursive: true })
    .map((file) => `src/app/${String(file).split("\\").join("/")}`);
}

test("tabela de rotas só considera pastas com page", () => {
  assert.deepEqual(ROUTES.map((route) => route.dir).sort(), ["", "[empresa]", "agro", "camara", "camara/[aba]", "compra-e-venda", "compra-e-venda/[id]", "horarios-onibus", "plantao-farmacias"]);
});

test("grupo some da URL; pasta privada, slot e interceptação não viram rota", () => {
  assert.deepEqual(parseRouteDir("(site)/agro").segments, [{ kind: "static", name: "agro" }]);
  assert.equal(parseRouteDir("_componentes/agro"), null);
  assert.equal(parseRouteDir("camara/@modal"), null);
  assert.equal(parseRouteDir("(.)foto"), null);
  assert.deepEqual(parseRouteDir("docs/[[...slug]]").segments.map((segment) => segment.kind), ["static", "optional-catchall"]);
});

test("rota fixa vence a dinâmica, como no Next", () => {
  assert.equal(resolveRoute("/", ROUTES), "");
  assert.equal(resolveRoute("/agro", ROUTES), "agro");
  assert.equal(resolveRoute("/vitorinoperfumes", ROUTES), "[empresa]");
  assert.equal(resolveRoute("/camara", ROUTES), "camara");
  assert.equal(resolveRoute("/camara/contratos", ROUTES), "camara/[aba]");
  assert.equal(resolveRoute("/compra-e-venda/abc", ROUTES), "compra-e-venda/[id]");
  assert.equal(resolveRoute("/camara/contratos/extra", ROUTES), null);
});

test("catch-all perde para dinâmica e o opcional atende a pasta-mãe", () => {
  const routes = buildRouteTable(["src/app/docs/[...slug]/page.tsx", "src/app/docs/[id]/page.tsx", "src/app/ajuda/[[...slug]]/page.tsx"]);
  assert.equal(resolveRoute("/docs/a", routes), "docs/[id]");
  assert.equal(resolveRoute("/docs/a/b", routes), "docs/[...slug]");
  assert.equal(resolveRoute("/docs", routes), null);
  assert.equal(resolveRoute("/ajuda", routes), "ajuda/[[...slug]]");
});

test("arquivo alterado vale só para a rota da própria pasta", () => {
  const dirs = new Set(ROUTES.map((route) => route.dir));
  assert.equal(routeDirForChangedFile("src/app/page.tsx", dirs), "");
  assert.equal(routeDirForChangedFile("src/app/agro/AgroClient.tsx", dirs), "agro");
  assert.equal(routeDirForChangedFile("src/app/agro/partes/Grafico.tsx", dirs), "agro");
  assert.equal(routeDirForChangedFile("src/app/camara/[aba]/page.tsx", dirs), "camara/[aba]");
  // Mudanças globais não disparam envio do site inteiro.
  assert.equal(routeDirForChangedFile("src/app/layout.tsx", dirs), null);
  assert.equal(routeDirForChangedFile("src/app/globals.css", dirs), null);
  assert.equal(routeDirForChangedFile("src/app/sitemap.ts", dirs), null);
  assert.equal(routeDirForChangedFile("src/components/layout/SiteLayout.tsx", dirs), null);
  assert.equal(routeDirForChangedFile("src/app/api/acompanhar/route.ts", dirs), null);
  assert.equal(routeDirForChangedFile("package-lock.json", dirs), null);
});

test("arquivo de dados conhecido leva a página dele; *Api.ts não", () => {
  const dirs = changedRouteDirs(["src/data/horariosOnibus-registros.json", "src/data/plantaoFarmacias.ts", "src/data/agroApi.ts", "src/lib/seo.ts"], ROUTES);
  assert.deepEqual([...dirs].sort(), ["horarios-onibus", "plantao-farmacias"]);
});

test("telefones.ts leva as três páginas que mostram os telefones", () => {
  const routes = buildRouteTable([
    "src/app/contatos/page.tsx",
    "src/app/seguranca/page.tsx",
    "src/app/seguranca/SegurancaClient.tsx",
    "src/app/beneficios-sociais/page.tsx",
    "src/app/agro/page.tsx",
  ]);
  assert.deepEqual([...changedRouteDirs(["src/data/telefones.ts"], routes)].sort(), ["beneficios-sociais", "contatos", "seguranca"]);
  const sitemap = [entry("/agro"), entry("/beneficios-sociais"), entry("/contatos"), entry("/seguranca")];
  assert.deepEqual(urlsForRouteDirs(sitemap, changedRouteDirs(["src/data/telefones.ts"], routes), routes), [
    `${SITE}/beneficios-sociais`,
    `${SITE}/contatos`,
    `${SITE}/seguranca`,
  ]);
});

test("helper de src/app usado pela page filha dinâmica leva as fichas dos vereadores", () => {
  const routes = buildRouteTable([
    "src/app/vereadores/page.tsx",
    "src/app/vereadores/VereadoresClient.tsx",
    "src/app/vereadores/tratamento.ts",
    "src/app/vereadores/remuneracao.ts",
    "src/app/vereadores/subsidio-atual.ts",
    "src/app/vereadores/[slug]/page.tsx",
  ]);
  // A subida de pasta para em "vereadores"; a tabela acrescenta a page filha.
  assert.deepEqual([...changedRouteDirs(["src/app/vereadores/tratamento.ts"], routes)].sort(), ["vereadores", "vereadores/[slug]"]);
  assert.deepEqual([...changedRouteDirs(["src/app/vereadores/remuneracao.ts"], routes)].sort(), ["vereadores", "vereadores/[slug]"]);
  // subsidio-atual.ts só é usado pela lista, que a subida de pasta já alcança.
  assert.deepEqual([...changedRouteDirs(["src/app/vereadores/subsidio-atual.ts"], routes)], ["vereadores"]);
  const sitemap = [entry("/vereadores"), entry("/vereadores/fulano-de-tal"), entry("/vereadores/beltrana-silva")];
  assert.deepEqual(urlsForRouteDirs(sitemap, changedRouteDirs(["src/app/vereadores/tratamento.ts"], routes), routes), [
    `${SITE}/vereadores`,
    `${SITE}/vereadores/fulano-de-tal`,
    `${SITE}/vereadores/beltrana-silva`,
  ]);
});

test("page dinâmica alterada leva todas as URLs que ela atende no sitemap", () => {
  const dirs = changedRouteDirs(["src/app/camara/[aba]/page.tsx"], ROUTES);
  assert.deepEqual(urlsForRouteDirs(SITEMAP, dirs, ROUTES), [`${SITE}/camara/contratos`, `${SITE}/camara/diarias`]);
  assert.deepEqual(urlsForRouteDirs(SITEMAP, new Set(["[empresa]"]), ROUTES), [`${SITE}/vitorinoperfumes`]);
  assert.deepEqual(urlsForRouteDirs(SITEMAP, new Set(), ROUTES), []);
});

test("sitemap: lê loc, lastmod e entidades XML", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url>
<loc>https://piracanjuba.ai/</loc>
<lastmod>2026-11-17T13:34:26.934Z</lastmod>
<changefreq>daily</changefreq>
</url>
<url><loc>https://piracanjuba.ai/busca?q=a&amp;b=c</loc></url>
</urlset>`;
  assert.deepEqual(parseSitemap(xml), [
    { loc: "https://piracanjuba.ai/", lastmod: "2026-11-17T13:34:26.934Z" },
    { loc: "https://piracanjuba.ai/busca?q=a&b=c", lastmod: null },
  ]);
  assert.deepEqual(parseSitemap("<sitemapindex><sitemap><loc>https://piracanjuba.ai/s1.xml</loc></sitemap></sitemapindex>"), []);
});

test("sitemap parcial (sem nenhuma ficha de vereador) é detectado antes do cálculo", () => {
  assert.deepEqual(REQUIRED_DYNAMIC_PREFIXES, ["/vereadores/"]);
  // Sitemap só com as rotas fixas, como sai quando o banco falha na geração.
  assert.deepEqual(missingDynamicRoutes([entry("/"), entry("/vereadores"), entry("/agro")]), ["/vereadores/"]);
  assert.deepEqual(missingDynamicRoutes([]), ["/vereadores/"]);
  // Outro domínio e subpasta não contam como ficha.
  assert.deepEqual(
    missingDynamicRoutes([{ loc: "https://www.piracanjuba.ai/vereadores/fulano", lastmod: null }, entry("/vereadores/fulano/extra")]),
    ["/vereadores/"],
  );
  assert.deepEqual(missingDynamicRoutes([entry("/vereadores"), entry("/vereadores/fulano-de-tal")]), []);
  assert.deepEqual(missingDynamicRoutes([entry("/vereadores/fulano-de-tal/")]), []);
  assert.deepEqual(missingDynamicRoutes([entry("/agro")], []), []);
});

test("lastmod: janela entre implantações e hora do build repetida descartada", () => {
  const stamped = Array.from({ length: 57 }, (_, index) => entry(`/pagina-${index}`));
  const entries = [
    ...stamped,
    entry("/compra-e-venda/novo", "2026-11-17T09:00:00.000Z"),
    entry("/vereadores/a", "2026-11-17T03:05:05.241Z"),
    entry("/antes", "2026-11-17T06:11:47Z"),
    entry("/depois", "2026-11-17T13:40:00.000Z"),
    entry("/limite", "2026-11-17T13:34:37Z"),
    entry("/sem-data", null),
    entry("/data-ruim", "ontem"),
  ];
  const result = urlsChangedByLastmod(entries, { after: new Date("2026-11-17T06:11:47Z"), until: new Date("2026-11-17T13:34:37Z") });
  assert.deepEqual(result.urls, [`${SITE}/compra-e-venda/novo`, `${SITE}/limite`]);
  assert.deepEqual(result.buildStamps, [{ lastmod: "2026-11-17T13:34:26.934Z", count: 57 }]);
});

test("seleção automática só envia URL do sitemap, sem repetir e até o limite", () => {
  const result = selectUrls([[`${SITE}/agro`, `${SITE}/agro`, `${SITE}/fora-do-sitemap`], [`${SITE}/camara`]], SITEMAP);
  assert.deepEqual(result.urls, [`${SITE}/agro`, `${SITE}/camara`]);
  assert.deepEqual(result.outside, [`${SITE}/fora-do-sitemap`]);
  assert.equal(result.truncated, 0);

  const outroHost = selectUrls([["https://www.piracanjuba.ai/agro"]], [{ loc: "https://www.piracanjuba.ai/agro", lastmod: null }]);
  assert.deepEqual(outroHost.urls, []);

  const many = Array.from({ length: MAX_URLS + 5 }, (_, index) => `${SITE}/p/${index}`);
  const capped = selectUrls([many], many.map((loc) => ({ loc, lastmod: null })));
  assert.equal(capped.urls.length, MAX_URLS);
  assert.equal(capped.truncated, 5);
});

test("envio manual aceita só https://piracanjuba.ai/", () => {
  const result = parseManualUrls(`https://piracanjuba.ai/agro,https://piracanjuba.ai/agro#topo
    https://piracanjuba.ai/   http://piracanjuba.ai/x https://www.piracanjuba.ai/x
    https://piracanjuba.ai.evil.com/x https://user:senha@piracanjuba.ai/x https://piracanjuba.ai:8443/x nao-e-url`);
  assert.deepEqual(result.urls, [`${SITE}/agro`, `${SITE}/`]);
  assert.deepEqual(result.invalid, [
    "http://piracanjuba.ai/x",
    "https://www.piracanjuba.ai/x",
    "https://piracanjuba.ai.evil.com/x",
    "https://user:senha@piracanjuba.ai/x",
    "https://piracanjuba.ai:8443/x",
    "nao-e-url",
  ]);
  assert.deepEqual(parseManualUrls("").urls, []);
  assert.deepEqual(selectUrls([[`${SITE}/removida`]]).urls, [`${SITE}/removida`]);
});

test("payload segue o protocolo e só 200 e 202 contam como sucesso", () => {
  assert.deepEqual(buildPayload([`${SITE}/agro`]), {
    host: "piracanjuba.ai",
    key: INDEXNOW_KEY,
    keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`,
    urlList: [`${SITE}/agro`],
  });
  assert.equal(isIndexNowSuccess(200), true);
  assert.equal(isIndexNowSuccess(202), true);
  for (const status of [204, 400, 403, 422, 429, 500]) assert.equal(isIndexNowSuccess(status), false);
  assert.match(describeIndexNowStatus(403), /chave recusada/);
  assert.equal(describeIndexNowStatus(503), "resposta inesperada");
});

test("arquivo da chave: só 200 na URL exata e com a chave libera o envio", () => {
  assert.equal(keyFileProblem(200, `${INDEXNOW_KEY}\n`), null);
  assert.match(keyFileProblem(200, "outra-coisa"), /não contém a chave/);
  assert.match(keyFileProblem(200, ""), /não contém a chave/);
  // Redirecionamento cancela, mesmo que o destino traga a chave.
  assert.match(
    keyFileProblem(301, "", `https://www.piracanjuba.ai/${INDEXNOW_KEY}.txt`),
    /redireciona \(HTTP 301 para https:\/\/www\.piracanjuba\.ai\/.+\); o keyLocation precisa responder 200 sem redirecionamento/,
  );
  assert.match(keyFileProblem(308, INDEXNOW_KEY), /redireciona \(HTTP 308\)/);
  assert.match(keyFileProblem(0, ""), /redireciona/);
  assert.match(keyFileProblem(404, ""), /respondeu HTTP 404/);
  assert.match(keyFileProblem(503, ""), /respondeu HTTP 503/);
  assert.ok(keyFileProblem(404, "").startsWith(KEY_LOCATION));
});

function fakeResponse(status) {
  const response = { status, canceled: 0 };
  response.body = {
    cancel: async () => {
      response.canceled += 1;
    },
  };
  return response;
}

function scripted(outcomes) {
  let calls = 0;
  const attempt = async () => {
    const outcome = outcomes[Math.min(calls, outcomes.length - 1)];
    calls += 1;
    if (outcome instanceof Error) throw outcome;
    return outcome;
  };
  return { attempt, calls: () => calls };
}

function recorder() {
  const sleeps = [];
  const retries = [];
  return {
    sleeps,
    retries,
    options: { sleep: async (ms) => void sleeps.push(ms), onRetry: (info) => void retries.push(info) },
  };
}

test("novas tentativas: só 5xx e erro de rede, nunca 429", () => {
  assert.deepEqual(RETRY_DELAYS_MS, [5_000, 15_000]);
  for (const status of [500, 502, 503, 504, 599]) assert.equal(isRetryableStatus(status), true, String(status));
  for (const status of [200, 202, 301, 400, 403, 404, 422, 429]) assert.equal(isRetryableStatus(status), false, String(status));
  assert.equal(isNetworkError(new TypeError("fetch failed")), true);
  assert.equal(isNetworkError(new DOMException("The operation was aborted due to timeout", "TimeoutError")), true);
  assert.equal(isNetworkError(new TypeError("x is not a function")), false);
  assert.equal(isNetworkError(new Error("API do GitHub respondeu HTTP 404")), false);
  assert.equal(isNetworkError(null), false);
});

test("withRetry repete 5xx com espera curta e devolve a resposta boa", async () => {
  const first = fakeResponse(502);
  const ok = fakeResponse(200);
  const script = scripted([first, ok]);
  const rec = recorder();
  assert.equal(await withRetry(script.attempt, rec.options), ok);
  assert.equal(script.calls(), 2);
  assert.deepEqual(rec.sleeps, [5_000]);
  assert.deepEqual(rec.retries, [{ attempt: 1, reason: "HTTP 502", delayMs: 5_000 }]);
  // A resposta descartada tem o corpo liberado.
  assert.equal(first.canceled, 1);
  assert.equal(ok.canceled, 0);
});

test("withRetry não repete 429 nem 4xx", async () => {
  for (const status of [429, 403, 404]) {
    const response = fakeResponse(status);
    const script = scripted([response, fakeResponse(200)]);
    const rec = recorder();
    assert.equal(await withRetry(script.attempt, rec.options), response);
    assert.equal(script.calls(), 1, String(status));
    assert.deepEqual(rec.sleeps, []);
  }
});

test("withRetry esgota as tentativas e devolve o último 5xx", async () => {
  const last = fakeResponse(503);
  const script = scripted([fakeResponse(500), fakeResponse(502), last]);
  const rec = recorder();
  assert.equal(await withRetry(script.attempt, rec.options), last);
  assert.equal(script.calls(), 1 + RETRY_DELAYS_MS.length);
  assert.deepEqual(rec.sleeps, [5_000, 15_000]);
  assert.equal(last.canceled, 0);
});

test("withRetry repete erro de rede e tempo esgotado; outro erro sobe na hora", async () => {
  const ok = fakeResponse(200);
  const timeout = new DOMException("The operation was aborted due to timeout", "TimeoutError");
  const recovered = scripted([new TypeError("fetch failed"), timeout, ok]);
  const rec = recorder();
  assert.equal(await withRetry(recovered.attempt, rec.options), ok);
  assert.equal(recovered.calls(), 3);
  assert.deepEqual(rec.retries.map((retry) => retry.reason), ["fetch failed", "The operation was aborted due to timeout"]);

  const down = scripted([new TypeError("fetch failed")]);
  await assert.rejects(withRetry(down.attempt, recorder().options), /fetch failed/);
  assert.equal(down.calls(), 1 + RETRY_DELAYS_MS.length);

  const bug = scripted([new Error("bug no script"), ok]);
  const bugRec = recorder();
  await assert.rejects(withRetry(bug.attempt, bugRec.options), /bug no script/);
  assert.equal(bug.calls(), 1);
  assert.deepEqual(bugRec.sleeps, []);
});

test("withRetry aceita outra lista de esperas", async () => {
  const script = scripted([fakeResponse(500), fakeResponse(200)]);
  const rec = recorder();
  const response = await withRetry(script.attempt, { ...rec.options, delaysMs: [1] });
  assert.equal(response.status, 200);
  assert.deepEqual(rec.sleeps, [1]);
  const none = scripted([fakeResponse(500), fakeResponse(200)]);
  assert.equal((await withRetry(none.attempt, { ...recorder().options, delaysMs: [] })).status, 500);
});

test("implantação anterior: outra, criada antes, da mais recente para a mais antiga", () => {
  const deployments = [
    { id: 1, sha: "a", created_at: "2026-11-17T05:49:08Z" },
    { id: 3, sha: "c", created_at: "2026-11-17T13:34:37Z" },
    { id: 2, sha: "b", created_at: "2026-11-17T06:11:47Z" },
    { id: 4, sha: "d", created_at: "2026-11-17T14:00:00Z" },
  ];
  const current = { id: "3", sha: "c", created_at: "2026-11-17T13:34:37Z" };
  assert.deepEqual(candidatePreviousDeployments(deployments, current).map((deployment) => deployment.id), [2, 1]);
  assert.equal(hasSuccessStatus([{ state: "inactive" }, { state: "success" }]), true);
  assert.equal(hasSuccessStatus([{ state: "failure" }, { state: "pending" }]), false);
});

test("arquivos de dados e rotas da tabela existem no repositório", () => {
  const dirs = new Set(buildRouteTable(pageFilesOnDisk()).map((route) => route.dir));
  for (const [file, routeDirs] of Object.entries(DATA_FILE_ROUTES)) {
    assert.ok(existsSync(join(ROOT, file)), `${file} não existe`);
    for (const dir of routeDirs) assert.ok(dirs.has(dir), `rota ${dir} de ${file} não tem page`);
  }
});

test("a chave publicada em public/ é a mesma do envio", () => {
  const file = join(ROOT, "public", `${INDEXNOW_KEY}.txt`);
  assert.equal(readFileSync(file, "utf8").trim(), INDEXNOW_KEY);
  assert.equal(KEY_LOCATION, `${SITE}/${INDEXNOW_KEY}.txt`);
});
