import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { test } from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const json = value => new Response(JSON.stringify(value));
function fixture() {
  const today = new Date().toISOString().slice(0, 10);
  const dates = Array.from({ length: 9 }, (_, i) => new Date(Date.parse(`${today}T12:00:00Z`) + (i - 2) * 86400000).toISOString().slice(0, 10));
  return {
    current: { time: `${today}T13:00`, temperature_2m: 25, relative_humidity_2m: 40, precipitation: 0, wind_speed_10m: 3, weather_code: 0 },
    daily: { time: dates, temperature_2m_max: dates.map(() => 30), temperature_2m_min: dates.map(() => 15), temperature_2m_mean: dates.map(() => 22), precipitation_sum: dates.map(() => 0), wind_speed_10m_max: dates.map(() => 10), relative_humidity_2m_mean: dates.map(() => 45) },
  };
}

async function load(fetcher, failWrite = false) {
  const traces = { network: [], writes: [], logs: [] };
  const log = { id: "log-fixture" };
  const sb = { from(table) {
    let payload;
    return {
      insert(row) { payload = row; return this; }, update(row) { payload = row; return this; },
      upsert(row, options) { assert.equal(table, "inmet_clima_diario"); assert.equal(options.onConflict, "data,estacao_codigo"); payload = row; return this; },
      select() { return this; }, single() { return this; }, eq() { return this; },
      then(resolve) {
        if (table === "sync_log") { Object.assign(log, payload); traces.logs.push(structuredClone(payload)); resolve({ data: log, error: null }); }
        else { traces.writes.push(structuredClone(payload)); resolve({ error: failWrite ? { code: "23505" } : null }); }
      },
    };
  } };
  const sandbox = { Request, Response, URL, URLSearchParams, AbortSignal, console,
    setTimeout: callback => setTimeout(callback, 0),
    fetch: async (url, options) => { traces.network.push({ url, options }); return await fetcher(url, options); },
    createClient: () => sb,
    Deno: { env: { get: () => "fixture-not-a-secret" }, serve: handler => { sandbox.handler = handler; } },
  };
  for (const file of ["_shared/open-meteo-fetch.ts", "sync-inmet-clima/index.ts"]) {
    const code = await readFile(`${root}supabase/functions/${file}`, "utf8");
    vm.runInNewContext(stripTypeScriptTypes(code.replace(/^import[\s\S]*?;\n/gm, "").replace(/^export /gm, "")), sandbox);
  }
  return { sandbox, traces, log, handler: sandbox.handler };
}

test("Open-Meteo recupera 503 com a mesma requisição e registra as tentativas", async () => {
  let count = 0;
  const { handler, traces, log } = await load(() => ++count === 1 ? new Response("temporário", { status: 503 }) : json(fixture()));
  const result = await handler(new Request("https://example.test"));
  const body = await result.json();
  assert.equal(result.status, 200); assert.equal(body.success, true); assert.equal(body.upserted, 9);
  assert.equal(traces.network.length, 2); assert.equal(traces.network[0].url, traces.network[1].url);
  assert.equal(new URL(traces.network[0].url).hostname, "api.open-meteo.com");
  assert.equal(new URL(traces.network[0].url).searchParams.get("forecast_days"), "7");
  assert.equal(traces.writes.length, 9);
  assert.deepEqual(body.tentativas.map(a => a.outcome), ["http_error", "success"]);
  assert.equal(log.status, "success"); assert.ok(log.finished_at);
});

test("Open-Meteo limita a três tentativas e mantém erro após 5xx persistente", async () => {
  const { handler, traces, log } = await load(() => new Response("falhou", { status: 503 }));
  const result = await handler(new Request("https://example.test"));
  assert.equal(result.status, 500); assert.equal((await result.json()).success, false);
  assert.equal(traces.network.length, 3); assert.equal(traces.writes.length, 0);
  assert.equal(log.status, "error"); assert.equal(log.detalhes.tentativas.length, 3); assert.equal(log.detalhes.upserted, 0);
});

for (const status of [400, 401, 403, 404, 429]) {
  test(`Open-Meteo não repete HTTP ${status}`, async () => {
    const { handler, traces, log } = await load(() => new Response("recusado", { status }));
    assert.equal((await handler(new Request("https://example.test"))).status, 500);
    assert.equal(traces.network.length, 1); assert.equal(traces.writes.length, 0); assert.equal(log.status, "error");
  });
}

for (const kind of ["network", "json"]) {
  test(`Open-Meteo recupera falha de ${kind} sem gravar a resposta inválida`, async () => {
    let count = 0;
    const { handler, traces } = await load(() => {
      if (++count > 1) return json(fixture());
      if (kind === "network") throw new TypeError("fetch failed fixture");
      return new Response("Unexpected upstream response");
    });
    const body = await (await handler(new Request("https://example.test"))).json();
    assert.equal(body.success, true); assert.equal(traces.network.length, 2); assert.equal(traces.writes.length, 9);
    assert.equal(body.tentativas[0].outcome, kind === "network" ? "network_error" : "invalid_json");
  });
}

test("Open-Meteo usa timeout real por tentativa e atrasos curtos limitados", async () => {
  const { sandbox } = await load(() => { throw new Error("fetch global inesperado"); });
  const waits = []; let calls = 0;
  await assert.rejects(() => sandbox.fetchWeatherSnapshot("https://example.test", {
    timeoutMs: 5,
    wait: async ms => { waits.push(ms); },
    fetcher: (_url, { signal }) => { calls++; return new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true })); },
  }), error => error.name === "WeatherFetchError" && error.attempts.length === 3);
  assert.equal(calls, 3); assert.deepEqual(waits, [250, 750]);
});

for (const kind of ["missing-series", "different-length", "duplicate-date", "invalid-date", "current-null", "current-nan"]) {
  test(`Open-Meteo recusa payload ${kind} antes de qualquer upsert`, async () => {
    const data = fixture();
    if (kind === "missing-series") delete data.daily.temperature_2m_mean;
    if (kind === "different-length") data.daily.precipitation_sum.pop();
    if (kind === "duplicate-date") data.daily.time[1] = data.daily.time[0];
    if (kind === "invalid-date") data.daily.time[0] = "2026-02-31";
    if (kind === "current-null") data.current.precipitation = null;
    if (kind === "current-nan") data.current.temperature_2m = NaN;
    const { handler, traces, log } = await load(() => json(data));
    assert.equal((await handler(new Request("https://example.test"))).status, 500);
    assert.equal(traces.network.length, 1); assert.equal(traces.writes.length, 0);
    assert.equal(log.detalhes.tentativas[0].outcome, "invalid_payload");
  });
}

test("Open-Meteo preserva zero declarado e null diário sem inventar valores", async () => {
  const data = fixture();
  data.daily.precipitation_sum[0] = null;
  data.current.temperature_2m = -2;
  const { handler, traces } = await load(() => json(data));
  const result = await handler(new Request("https://example.test"));
  assert.equal(result.status, 200);
  assert.equal(traces.writes[0].precipitacao_mm, null);
  assert.equal(traces.writes[1].precipitacao_mm, 0);
  assert.equal(traces.writes[2].temperatura_media, -2);
});

test("Open-Meteo dry_run mantém o contrato sem gravar indicadores", async () => {
  const { handler, traces } = await load(() => json(fixture()));
  const body = await (await handler(new Request("https://example.test?dry_run=1"))).json();
  assert.equal(body.dry_run, true); assert.equal(body.upserted, 9); assert.equal(traces.writes.length, 0);
});

test("Open-Meteo não registra success quando o upsert falha", async () => {
  const { handler, traces, log } = await load(() => json(fixture()), true);
  const result = await handler(new Request("https://example.test"));
  assert.equal(result.status, 500); assert.equal((await result.json()).success, false);
  assert.equal(log.status, "error"); assert.equal(log.detalhes.upserted, 0);
  assert.equal(traces.network.length, 1);
});
