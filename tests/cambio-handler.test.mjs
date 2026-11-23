import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";
import test from "node:test";

const BASE_TIME = Date.parse("2026-11-23T15:00:00Z");
const KEY = "fixture-private-key";
const payload = () => Object.fromEntries(["USD", "EUR"].map((code) => [`${code}BRL`, {
  code, codein: "BRL", bid: "5.1234", ask: "5.1256", pctChange: "0.25", timestamp: String(BASE_TIME / 1000 - 30),
}]));

async function fixture(options = {}) {
  const clock = { now: BASE_TIME };
  const calls = [];
  const env = { AWESOMEAPI_KEY: options.key === undefined ? KEY : options.key };
  class FixtureDate extends Date { static now() { return clock.now; } }
  const scope = vm.createContext({
    Date: FixtureDate, Request, Response, URL, TextDecoder,
    process: { env },
    AbortSignal: options.abortSignal ?? AbortSignal,
    // O cache do framework fica fora deste teste. Simular miss em cada chamada
    // exercita o transporte real, inclusive concorrência e falhas de validação.
    unstable_cache: (fn) => fn,
    fetch: async (...args) => {
      calls.push(args);
      return options.fetch ? options.fetch(...args) : Response.json(payload());
    },
  });
  for (const file of ["src/lib/cambio.ts", "src/lib/data/cambio.ts", "src/app/api/cambio/route.ts"]) {
    const raw = await readFile(new URL("../" + file, import.meta.url), "utf8");
    const source = stripTypeScriptTypes(raw.replace(/^import[\s\S]*?;\n/gm, "").replace(/^export /gm, ""));
    vm.runInContext(source, scope, { filename: file });
  }
  const get = vm.runInContext("GET", scope);
  return { get, calls, clock, env };
}

const request = (search = "") => new Request("https://piracanjuba.ai/api/cambio" + search);

test("API consulta dois pares uma única vez, com chave somente no header e sem cache de navegador", async () => {
  const { get, calls } = await fixture();
  const response = await get(request());
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  assert.equal(body.source, "AwesomeAPI");
  assert.deepEqual(body.quotes.map((quote) => quote.currency), ["USD", "EUR"]);
  assert.equal(body.fetchedAt, "2026-11-23T15:00:00.000Z");
  assert.equal(calls.length, 1);
  const [url, init] = calls[0];
  assert.equal(url, "https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL");
  assert.equal(init.headers["x-api-key"], KEY);
  assert.equal(init.cache, "no-store");
  assert.equal(init.redirect, "error");
  assert.ok(init.signal instanceof AbortSignal);
  assert.ok(!JSON.stringify(body).includes(KEY));
});

test("chave ausente ou vazia não chama fornecedor nem devolve dados inventados", async () => {
  for (const key of ["", "   ", null]) {
    const { get, calls } = await fixture({ key });
    const response = await get(request());
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("retry-after"), "60");
    assert.deepEqual(await response.json(), { error: "Cotações temporariamente indisponíveis." });
    assert.equal(calls.length, 0);
  }
});

test("rota rejeita parâmetros arbitrários antes de acessar fornecedor", async () => {
  const { get, calls } = await fixture();
  for (const search of ["?moeda=BTC", "?url=https://example.test", "?token=other"]) {
    assert.equal((await get(request(search))).status, 400);
  }
  assert.equal(calls.length, 0);
});

test("HTTP 429, erro lógico e JSON inválido falham sem expor resposta do fornecedor", async () => {
  const factories = [
    () => new Response("fixture-private-key: cobrança interna", { status: 429 }),
    () => Response.json({ status: 200, error: "fixture-private-key" }),
    () => new Response("{broken"),
    () => Response.json({ ...payload(), EURBRL: { ...payload().EURBRL, bid: null } }),
    () => { throw new Error("network: fixture-private-key"); },
  ];
  for (const factory of factories) {
    const { get } = await fixture({ fetch: factory });
    const response = await get(request());
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "Cotações temporariamente indisponíveis." });
  }
});

test("resposta excessiva é interrompida mesmo sem Content-Length", async () => {
  for (const headers of [{}, { "Content-Length": "40000" }]) {
    let cancelled = false;
    const stream = new ReadableStream({
      pull(controller) { controller.enqueue(new TextEncoder().encode("a".repeat(20_000))); },
      cancel() { cancelled = true; },
    });
    const { get } = await fixture({ fetch: () => new Response(stream, { headers }) });
    assert.equal((await get(request())).status, 503);
    assert.equal(cancelled, true);
  }
});

test("timeout é aplicado ao transporte e tratado como indisponibilidade", async () => {
  let timeout;
  const signal = AbortSignal.abort(new DOMException("fixture-private-key", "TimeoutError"));
  const { get } = await fixture({
    abortSignal: { timeout: (milliseconds) => { timeout = milliseconds; return signal; } },
    fetch: async (_url, init) => { init.signal.throwIfAborted(); },
  });
  assert.equal((await get(request())).status, 503);
  assert.equal(timeout, 8000);
});

test("consultas simultâneas em cache vazio compartilham uma chamada externa", async () => {
  let release;
  const responseReady = new Promise((resolve) => { release = resolve; });
  const { get, calls } = await fixture({ fetch: () => responseReady });
  const first = get(request());
  const second = get(request());
  release(Response.json(payload()));
  const responses = await Promise.all([first, second]);
  assert.deepEqual(responses.map((response) => response.status), [200, 200]);
  assert.equal(calls.length, 1);
});

test("falha limita novas tentativas por um minuto e depois aceita recuperação válida", async () => {
  let available = false;
  const { get, calls, clock } = await fixture({ fetch: () => available ? Response.json(payload()) : new Response("offline", { status: 503 }) });
  assert.equal((await get(request())).status, 503);
  available = true;
  clock.now += 59_999;
  assert.equal((await get(request())).status, 503);
  assert.equal(calls.length, 1);
  clock.now += 1;
  const recovered = await get(request());
  assert.equal(recovered.status, 200);
  assert.equal(calls.length, 2);
  assert.equal((await recovered.json()).fetchedAt, "2026-11-23T15:01:00.000Z");
});
