import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";
import test from "node:test";

const BASE = "https://fipe.parallelum.com.br/api/v2";
const TOKEN = "token-de-teste-privado";

// Catálogo mínimo com o formato real da API FIPE v2 (conferido em 2026-11-25).
const CATALOGO = {
  "/cars/brands": [{ code: "59", name: "VW - VolksWagen" }, { code: "21", name: "Fiat" }],
  "/cars/brands/59/models": [{ code: "6280", name: "Gol (novo) 1.0 Mi Total Flex 8V 2p" }],
  "/cars/brands/59/models/6280/years": [{ code: "2013-5", name: "2013 Flex" }, { code: "2014-5", name: "2014 Flex" }],
  "/cars/brands/59/models/6280/years/2013-5": {
    vehicleType: 1, price: "R$ 29.180,00", brand: "VW - VolksWagen", model: "Gol (novo) 1.0 Mi Total Flex 8V 2p",
    modelYear: 2013, fuel: "Flex", codeFipe: "005345-7", referenceMonth: "novembro de 2026", fuelAcronym: "F",
  },
};

const catalogo = async (url) => {
  const caminho = url.slice(BASE.length);
  return caminho in CATALOGO ? Response.json(CATALOGO[caminho]) : Response.json({ error: "not found" }, { status: 404 });
};

async function fixture(options = {}) {
  const calls = [];
  const env = options.token ? { FIPE_API_TOKEN: options.token } : {};
  const scope = vm.createContext({
    Date, Request, Response, URL, TextDecoder, Intl,
    process: { env },
    AbortSignal,
    // O cache do framework fica fora deste teste: cada chamada simula cache vazio.
    unstable_cache: (fn) => fn,
    fetch: async (url, init) => {
      calls.push({ url, init });
      return (options.fetch ?? catalogo)(url, init);
    },
  });
  for (const file of [
    "src/lib/cambio.ts",
    "src/lib/data/cambio.ts",
    "src/lib/fipe.ts",
    "src/lib/data/fipe.ts",
    "src/app/api/fipe/[...partes]/route.ts",
  ]) {
    const raw = await readFile(new URL("../" + file, import.meta.url), "utf8");
    const source = stripTypeScriptTypes(raw.replace(/^import[\s\S]*?;\n/gm, "").replace(/^export /gm, ""));
    vm.runInContext(source, scope, { filename: file });
  }
  const GET = vm.runInContext("GET", scope);
  const get = (partes, search = "") => GET(
    new Request(`https://piracanjuba.ai/api/fipe/${partes.join("/")}${search}`),
    { params: Promise.resolve({ partes }) },
  );
  return { get, calls };
}

test("marcas vêm da API FIPE v2 com cache de CDN e sem token quando não há token", async () => {
  const { get, calls } = await fixture();
  const response = await get(["carros"]);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /s-maxage=21600/);
  assert.deepEqual(await response.json(), {
    etapa: "marcas",
    opcoes: [{ codigo: "21", nome: "Fiat" }, { codigo: "59", nome: "VW - VolksWagen" }],
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${BASE}/cars/brands`);
  assert.equal(calls[0].init.headers["X-Subscription-Token"], undefined);
  assert.equal(calls[0].init.cache, "no-store");
  assert.equal(calls[0].init.redirect, "error");
  assert.ok(calls[0].init.signal instanceof AbortSignal);
});

test("token, quando configurado, vai só no cabeçalho e nunca na resposta", async () => {
  const { get, calls } = await fixture({ token: TOKEN });
  const response = await get(["carros"]);
  assert.equal(calls[0].init.headers["X-Subscription-Token"], TOKEN);
  assert.ok(!(await response.text()).includes(TOKEN));
  assert.ok(!calls[0].url.includes(TOKEN));
});

test("preço confere marca, modelo e ano nas listas antes de consultar o valor", async () => {
  const { get, calls } = await fixture();
  const response = await get(["carros", "59", "6280", "2013-5"]);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.etapa, "preco");
  assert.equal(body.preco.valor, 29180);
  assert.equal(body.preco.codigoFipe, "005345-7");
  assert.deepEqual(calls.map((call) => call.url.slice(BASE.length)), [
    "/cars/brands",
    "/cars/brands/59/models",
    "/cars/brands/59/models/6280/years",
    "/cars/brands/59/models/6280/years/2013-5",
  ]);
});

test("código inexistente na tabela é recusado sem gastar consulta do valor", async () => {
  const marca = await fixture();
  assert.equal((await marca.get(["carros", "999", "6280", "2013-5"])).status, 404);
  assert.deepEqual(marca.calls.map((call) => call.url.slice(BASE.length)), ["/cars/brands"]);

  const ano = await fixture();
  assert.equal((await ano.get(["carros", "59", "6280", "2010-1"])).status, 404);
  assert.equal(ano.calls.length, 3);
});

test("rota recusa parâmetros e caminhos fora do padrão sem consultar a API", async () => {
  const { get, calls } = await fixture();
  assert.equal((await get(["carros"], "?marca=59")).status, 400);
  assert.equal((await get(["onibus"])).status, 404);
  assert.equal((await get(["carros", "abc"])).status, 404);
  assert.equal((await get(["carros", "59", "6280", "2013-5", "extra"])).status, 404);
  assert.equal(calls.length, 0);
});

test("limite diário, falha e resposta inválida viram mensagens genéricas, sem dados do fornecedor", async () => {
  const limite = await fixture({ fetch: async () => new Response(`limite ${TOKEN}`, { status: 429 }) });
  const r429 = await limite.get(["carros"]);
  assert.equal(r429.status, 503);
  assert.equal(r429.headers.get("retry-after"), "3600");
  assert.equal(r429.headers.get("cache-control"), "no-store");
  const texto429 = await r429.text();
  assert.match(texto429, /limite do dia/);
  assert.ok(!texto429.includes(TOKEN));

  const casos = [
    async () => new Response("erro interno", { status: 500 }),
    async () => { throw new TypeError("redirect mode is set to error"); },
    async () => Response.json([{ code: "59", name: "" }]),
    async () => new Response("x".repeat(10), { headers: { "content-length": "300000" } }),
  ];
  for (const respond of casos) {
    const { get } = await fixture({ fetch: respond });
    const response = await get(["carros"]);
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("retry-after"), "300");
    assert.deepEqual(Object.keys(await response.json()), ["error"]);
  }

  const naoAchou = await fixture({ fetch: async () => Response.json({ error: "x" }, { status: 404 }) });
  assert.equal((await naoAchou.get(["carros"])).status, 404);
});
