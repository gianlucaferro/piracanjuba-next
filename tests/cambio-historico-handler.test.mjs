import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";
import test from "node:test";

// 2026-11-25 17:40 em Brasília.
const BASE_TIME = Date.parse("2026-11-25T20:40:00Z");
const KEY = "fixture-private-key";
const DAY_S = 86_400;
const payload = () => Array.from({ length: 45 }, (_, index) => ({
  ...(index === 0 ? { code: "USD", codein: "BRL", name: "Dólar Americano/Real Brasileiro" } : {}),
  bid: (5.8 + index / 1000).toFixed(4),
  ask: (5.8006 + index / 1000).toFixed(4),
  high: "6", low: "5", varBid: "0", pctChange: "0",
  timestamp: String(BASE_TIME / 1000 - 300 - index * DAY_S),
}));

async function fixture(options = {}) {
  const clock = { now: BASE_TIME };
  const calls = [];
  const env = { AWESOMEAPI_KEY: options.key === undefined ? KEY : options.key };
  class FixtureDate extends Date { static now() { return clock.now; } }
  const scope = vm.createContext({
    Date: FixtureDate, Request, Response, URL, TextDecoder,
    process: { env },
    AbortSignal,
    // O cache do framework fica fora deste teste: cada chamada simula cache vazio.
    unstable_cache: (fn) => fn,
    fetch: async (...args) => {
      calls.push(args);
      return options.fetch ? options.fetch(...args) : Response.json(payload());
    },
  });
  for (const file of [
    "src/lib/cambio.ts",
    "src/lib/cambio-historico.ts",
    "src/lib/data/cambio.ts",
    "src/lib/data/cambio-historico.ts",
    "src/app/api/cambio/historico/route.ts",
  ]) {
    const raw = await readFile(new URL("../" + file, import.meta.url), "utf8");
    const source = stripTypeScriptTypes(raw.replace(/^import[\s\S]*?;\n/gm, "").replace(/^export /gm, ""));
    vm.runInContext(source, scope, { filename: file });
  }
  const get = vm.runInContext("GET", scope);
  return { get, calls, clock };
}

const request = (search = "") => new Request("https://piracanjuba.ai/api/cambio/historico" + search);

test("histórico consulta o fechamento diário uma vez, com chave só no header e sem cache de navegador", async () => {
  const { get, calls } = await fixture();
  const response = await get(request());
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  assert.equal(body.source, "AwesomeAPI");
  assert.equal(body.currency, "USD");
  assert.equal(body.days, 30);
  // Itens diários: hoje e os 29 dias anteriores entram; os 15 mais antigos ficam fora.
  assert.equal(body.points.length, 30);
  assert.equal(body.points[0].date, "2026-10-27");
  assert.equal(body.points.at(-1).date, "2026-11-25");
  assert.equal(calls.length, 1);
  const [url, init] = calls[0];
  assert.equal(url, "https://economia.awesomeapi.com.br/json/daily/USD-BRL/45");
  assert.equal(init.headers["x-api-key"], KEY);
  assert.equal(init.cache, "no-store");
  assert.equal(init.redirect, "error");
  assert.ok(init.signal instanceof AbortSignal);
  assert.ok(!JSON.stringify(body).includes(KEY));
});

test("histórico recusa parâmetros e falta de chave sem consultar a fonte", async () => {
  const withQuery = await fixture();
  const rejected = await withQuery.get(request("?dias=365"));
  assert.equal(rejected.status, 400);
  assert.equal(withQuery.calls.length, 0);

  const withoutKey = await fixture({ key: "  " });
  const unavailable = await withoutKey.get(request());
  assert.equal(unavailable.status, 503);
  assert.equal(withoutKey.calls.length, 0);
});

test("falha da fonte vira 503 genérico, sem vazar chave nem resposta, e espera 5 minutos para tentar de novo", async () => {
  const { get, calls, clock } = await fixture({
    fetch: async () => new Response(`erro interno ${KEY}`, { status: 500 }),
  });
  const first = await get(request());
  const text = await first.text();
  assert.equal(first.status, 503);
  assert.equal(first.headers.get("retry-after"), "300");
  assert.equal(first.headers.get("cache-control"), "no-store");
  assert.ok(!text.includes(KEY) && !text.includes("erro interno"));
  assert.equal(calls.length, 1);

  clock.now += 4 * 60_000;
  assert.equal((await get(request())).status, 503);
  assert.equal(calls.length, 1);

  clock.now += 61_000;
  assert.equal((await get(request())).status, 503);
  assert.equal(calls.length, 2);
});

test("resposta inválida, grande demais ou com redirecionamento não chega ao navegador", async () => {
  const cases = [
    async () => Response.json(payload().map((item, index) => (index === 0 ? { ...item, code: "EUR" } : item))),
    async () => new Response("x".repeat(10), { headers: { "content-length": "40000" } }),
    async () => new Response("y".repeat(40_000)),
    async () => { throw new TypeError("redirect mode is set to error"); },
  ];
  for (const respond of cases) {
    const { get } = await fixture({ fetch: respond });
    const response = await get(request());
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.deepEqual(Object.keys(body), ["error"]);
  }
});

test("pedidos simultâneos com cache vazio compartilham uma única consulta", async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const { get, calls } = await fixture({
    fetch: async () => { await gate; return Response.json(payload()); },
  });
  const pending = [get(request()), get(request()), get(request())];
  await new Promise((resolve) => setImmediate(resolve));
  release();
  const responses = await Promise.all(pending);
  assert.deepEqual(responses.map((response) => response.status), [200, 200, 200]);
  assert.equal(calls.length, 1);
});
