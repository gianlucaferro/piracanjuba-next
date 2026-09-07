import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { test } from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const annual = { categoria: "dda", indicador: "internacoes_por_100mil", ano: 2024, mes: null, semana_epidemiologica: null, valor: 12.5, valor_texto: "taxa", fonte: "fonte fixture", fonte_url: "https://example.test" };
const log = { id: "log1", tipo: "tcm_go", status: "running", started_at: "2026-01-01T00:00:00Z", detalhes: { runId: "Run1", datasetId: "Dataset1" } };

function clientFor(seed = {}, failure = () => null) {
  const tables = structuredClone({ saude_indicadores: [], sync_log: [], tcm_go_apontamentos: [], ...seed });
  const traces = [];
  let nextId = 1;
  return {
    tables, traces,
    from(table) {
      const trace = { table, op: "read", filters: [], payload: null, order: null };
      traces.push(trace);
      let limit = Infinity, single = false;
      const query = {
        select() { return this; },
        eq(key, value) { trace.filters.push(row => row[key] === value); return this; },
        or(value) {
          const match = value.match(/^(\w+)\.is\.null,\1\.eq\.0$/);
          assert.ok(match, value);
          trace.filters.push(row => row[match[1]] == null || row[match[1]] === 0); return this;
        },
        filter(key, _op, value) { assert.equal(key, "detalhes->>runId"); trace.filters.push(row => row.detalhes?.runId === value); return this; },
        lt(key, value) { trace.filters.push(row => row[key] < value); return this; },
        order(key) { trace.order = key; if (table === "sync_log") assert.equal(key, "started_at"); return this; },
        limit(value) { limit = value; return this; },
        maybeSingle() { single = true; return this; }, single() { single = true; return this; },
        insert(payload) { trace.op = "insert"; trace.payload = payload; return this; },
        update(payload) { trace.op = "update"; trace.payload = payload; return this; },
        upsert(payload) { trace.op = "upsert"; trace.payload = payload; return this; },
        then(resolve, reject) {
          const error = failure(trace, tables);
          if (error) return Promise.resolve({ data: null, error }).then(resolve, reject);
          let rows = tables[table].filter(row => trace.filters.every(filter => filter(row))).slice(0, limit);
          if (trace.op === "insert" || trace.op === "upsert") {
            const row = structuredClone({ id: `new${nextId++}`, ...trace.payload });
            tables[table].push(row); rows = [row];
          } else if (trace.op === "update") for (const row of rows) Object.assign(row, structuredClone(trace.payload));
          return Promise.resolve({ data: single ? rows[0] ?? null : rows, error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  };
}

async function load(slug, client, fetcher = () => { throw new Error("rede não esperada"); }) {
  const source = await readFile(`${root}supabase/functions/${slug}/index.ts`, "utf8");
  const compiled = stripTypeScriptTypes(source.replace(/^import[\s\S]*?;\n/gm, ""));
  const calls = [];
  const sandbox = {
    console, Request, Response, Headers, URL, AbortSignal, btoa, Date,
    Deno: { env: { get: key => key === "SUPABASE_URL" ? "https://example.test" : "fixture" }, serve: handler => { sandbox.handler = handler; } },
    createClient: () => client,
    fetch: async (url, options) => { calls.push({ url, options }); return await fetcher(url, options); },
  };
  const auth = await readFile(`${root}supabase/functions/_shared/service-role-auth.ts`, "utf8");
  vm.runInNewContext(stripTypeScriptTypes(auth.replace(/^export /gm, "")), sandbox);
  vm.runInNewContext(compiled, sandbox);
  return { sandbox, calls, handler: sandbox.handler };
}

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers });
const callback = () => new Request("https://example.test?action=fetch", { method: "POST", headers: { "x-tcm-secret": "fixture" }, body: JSON.stringify({ resource: { id: "Run1", status: "SUCCEEDED" } }) });
const provider = (items, status = "SUCCEEDED") => url => url.includes("/actor-runs/") ? json({ data: { id: "Run1", status, defaultDatasetId: "Dataset1" } }) : json(items);

for (const empty of [null, 0]) {
  test(`saúde atualiza identidade anual com mes=${empty} sem alterar semana`, async () => {
    const client = clientFor({ saude_indicadores: [{ ...annual, id: "annual", mes: empty, semana_epidemiologica: empty, valor: 2 }, { ...annual, id: "weekly", semana_epidemiologica: 12, valor: 99 }] });
    const { sandbox } = await load("sync-saude-indicadores", client);
    const errors = [];
    assert.equal(await sandbox.upsertIndicador(client, annual, errors), true);
    assert.equal(client.tables.saude_indicadores.length, 2);
    assert.equal(client.tables.saude_indicadores[0].valor, 12.5);
    assert.equal(client.tables.saude_indicadores[0].mes, null);
    assert.equal(client.tables.saude_indicadores[1].valor, 99);
    assert.deepEqual(errors, []);
  });
}

for (const op of ["read", "update", "insert"]) {
  test(`saúde não conta gravação quando ${op} falha`, async () => {
    const client = clientFor({ saude_indicadores: op === "update" ? [{ ...annual, id: "old" }] : [] }, trace => trace.op === op ? { code: "fixture" } : null);
    const { sandbox } = await load("sync-saude-indicadores", client);
    const errors = [];
    assert.equal(await sandbox.upsertIndicador(client, annual, errors), false);
    assert.equal(errors.length, 1);
  });
}

test("saúde recupera corrida de inserção sem duplicar identidade", async () => {
  let raced = false;
  const client = clientFor({}, (trace, tables) => {
    if (trace.op === "insert" && !raced) { raced = true; tables.saude_indicadores.push({ ...annual, id: "raced", valor: 1 }); return { code: "23505" }; }
    return null;
  });
  const { sandbox } = await load("sync-saude-indicadores", client);
  assert.equal(await sandbox.upsertIndicador(client, annual, []), true);
  assert.equal(client.tables.saude_indicadores.length, 1);
  assert.equal(client.tables.saude_indicadores[0].valor, 12.5);
});

test("IBGE mantém ausências e médias plurianuais fora da série anual", async () => {
  const { sandbox } = await load("sync-saude-indicadores", clientFor());
  const input = [{ id: 30279, res: [{ localidade: "521710", res: { "2024": "10,31", "2023": "-", "2022": "", "2012-2014": "14.3", "2021": "0" } }] }];
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.annualValues(input, 30279))), [{ ano: 2021, valor: 0 }, { ano: 2024, valor: 10.31 }]);
  assert.throws(() => sandbox.annualValues(input, 60032), /ausente/);
});

test("InfoDengue aceita zero declarado e rejeita dado ausente/duplicado", async () => {
  const { sandbox } = await load("sync-saude-indicadores", clientFor());
  const week = { data_iniSE: Date.UTC(2026, 7, 23), SE: 202634, casos: 0, nivel: 1 };
  assert.equal(sandbox.monthlyAlerts([week]).get("2026-8").casos, 0);
  assert.throws(() => sandbox.monthlyAlerts([{ ...week, casos: null }]), /inválida/);
  assert.throws(() => sandbox.monthlyAlerts([week, week]), /duplicada/);
  assert.throws(() => sandbox.monthlyAlerts([]), /sem semanas/);
});

test("saúde usa indicador correto, repara população indevida e informa vacinação pendente", async () => {
  const client = clientFor({ saude_indicadores: [{ ...annual, id: "wrong", categoria: "mortalidade_infantil", indicador: "taxa_anual", ano: 2007, valor: 999 }] });
  const { handler, calls } = await load("sync-saude-indicadores", client, url => {
    if (url.includes("info.dengue")) return json([{ data_iniSE: Date.UTC(2026, 7, 23), SE: 202634, casos: 3, nivel: 1 }]);
    const id = url.includes("30279") ? 30279 : 60032;
    return json([{ id, res: [{ localidade: "521710", res: { "2007": "25", "2025": "-" } }] }]);
  });
  const result = await handler(new Request("https://example.test", { headers: { "x-cron-secret": "fixture" } }));
  assert.equal(result.status, 207);
  const body = await result.json();
  assert.equal(body.success, false);
  assert.equal(body.totalWritten, 5);
  assert.match(body.errors[0], /vacinacao/);
  assert.equal(client.tables.saude_indicadores.find(row => row.id === "wrong").valor, 25);
  assert.equal(client.tables.saude_indicadores.find(row => row.id === "wrong").indicador, "taxa_mortalidade_infantil");
  assert.equal(client.tables.sync_log[0].status, "partial");
  assert.ok(client.tables.sync_log[0].finished_at);
  assert.ok(calls.filter(call => call.url.includes("info.dengue")).every(call => call.url.includes("ew_end=53")));
  assert.ok(calls.every(call => call.options.signal));
  assert.ok(calls.every(call => !call.url.includes("apisidra")));
});

test("TCM encerra falha real sem exigir dataset no callback", async () => {
  const client = clientFor({ sync_log: [log] });
  const { handler } = await load("sync-tcm-go-piracanjuba", client, provider([], "TIMED-OUT"));
  const result = await handler(callback());
  assert.equal(result.status, 200);
  assert.equal((await result.json()).success, false);
  assert.equal(client.tables.sync_log[0].status, "error");
  assert.ok(client.tables.sync_log[0].finished_at);
});

test("TCM mantém execução ativa pendente e sem término inventado", async () => {
  const client = clientFor({ sync_log: [log] });
  const { handler } = await load("sync-tcm-go-piracanjuba", client, provider([], "RUNNING"));
  assert.equal((await handler(callback())).status, 202);
  assert.equal(client.tables.sync_log[0].finished_at, undefined);
});

test("TCM registra falha de download e não deixa running", async () => {
  const client = clientFor({ sync_log: [log] });
  const { handler } = await load("sync-tcm-go-piracanjuba", client, url => url.includes("/actor-runs/") ? provider([])(url) : json({}, 503));
  await handler(callback());
  assert.equal(client.tables.sync_log[0].status, "error");
  assert.ok(client.tables.sync_log[0].finished_at);
});

const document = { url: "https://www.tcmgo.tc.br/doc/fixture", markdown: "Processo: 12345/2026\nPrefeitura de Piracanjuba\nEmenta: Documento municipal de teste\nData de publicação: 05/09/2026\nStatus: em análise" };

test("TCM rejeita pesquisa genérica e múltiplos processos sem inventar identidade", async () => {
  const client = clientFor({ sync_log: [log] });
  const { handler, sandbox } = await load("sync-tcm-go-piracanjuba", client, provider([{ url: document.url, markdown: "Busca por Piracanjuba, resultados administrativos" }]));
  assert.equal(sandbox.parseApontamento({ ...document, markdown: `${document.markdown}\nProcesso: 54321/2026` }), null);
  assert.equal(sandbox.parseApontamento({ ...document, url: "https://example.test" }), null);
  assert.equal(sandbox.parseApontamento({ ...document, markdown: document.markdown.replace("Data de publicação: 05/09/2026", "") }), null);
  assert.equal(sandbox.parseApontamento({ ...document, markdown: document.markdown.replace("05/09/2026", "31/02/2026") }), null);
  assert.equal((await handler(callback())).status, 207);
  assert.equal(client.tables.tcm_go_apontamentos.length, 0);
  assert.equal(client.tables.sync_log[0].status, "partial");
});

test("TCM importa documento verificável e callback repetido não duplica", async () => {
  const client = clientFor({ sync_log: [log] });
  const { handler } = await load("sync-tcm-go-piracanjuba", client, provider([document]));
  const first = await (await handler(callback())).json();
  const second = await (await handler(callback())).json();
  assert.equal(first.upserted, 1);
  assert.equal(second.replay, true);
  assert.equal(client.tables.tcm_go_apontamentos.length, 1);
  assert.equal(client.tables.tcm_go_apontamentos[0].valor_envolvido, null);
});

test("TCM falha de gravação fica parcial e não aumenta contador", async () => {
  const client = clientFor({ sync_log: [log] }, trace => trace.op === "upsert" ? { code: "fixture" } : null);
  const { handler } = await load("sync-tcm-go-piracanjuba", client, provider([document]));
  const body = await (await handler(callback())).json();
  assert.equal(body.upserted, 0);
  assert.equal(body.success, false);
  assert.equal(client.tables.sync_log[0].status, "partial");
});

test("TCM erro ao finalizar log retorna 500 para permitir retry", async () => {
  const client = clientFor({ sync_log: [log] }, trace => trace.table === "sync_log" && trace.op === "update" ? { code: "fixture" } : null);
  const { handler } = await load("sync-tcm-go-piracanjuba", client, provider([]));
  assert.equal((await handler(callback())).status, 500);
});

test("TCM trigger preserva limites e registra falha de início", async () => {
  const client = clientFor();
  const { handler, calls } = await load("sync-tcm-go-piracanjuba", client, () => json({}, 402));
  assert.equal((await handler(new Request("https://example.test?action=trigger", { headers: { "x-cron-secret": "fixture" } }))).status, 502);
  assert.equal(client.tables.sync_log[0].status, "error");
  assert.ok(client.tables.sync_log[0].finished_at);
  const call = calls[0];
  assert.match(call.url, /memory=2048&timeout=600/);
  const input = JSON.parse(call.options.body);
  assert.equal(input.maxCrawlPages, 50);
  assert.ok(input.startUrls.every(row => row.url.startsWith("https://www.tcmgo.tc.br/")));
  assert.ok(input.includeUrlGlobs.includes("https://www.tcmgo.tc.br/**"));
});

test("TCM reconcilia callback perdido sem iniciar crawler", async () => {
  const client = clientFor({ sync_log: [log] });
  const { handler, calls } = await load("sync-tcm-go-piracanjuba", client, provider([]));
  const response = await handler(new Request("https://example.test?action=reconcile", { method: "POST", headers: { "x-tcm-secret": "fixture" } }));
  assert.equal((await response.json()).processed, 1);
  assert.equal(client.tables.sync_log[0].status, "partial");
  assert.ok(calls.every(call => !call.url.includes("/acts/")));
});

for (const slug of ["sync-saude-indicadores", "sync-tcm-go-piracanjuba"]) {
  test(`${slug} rejeita chamada sem segredo antes de banco ou fonte`, async () => {
    const client = clientFor();
    const { handler, calls } = await load(slug, client);
    const result = await handler(new Request("https://example.test", { method: "POST", body: "{}" }));
    assert.equal(result.status, 401);
    assert.equal(client.traces.length, 0);
    assert.equal(calls.length, 0);
  });
}


test("TCM reconcilia pelo corpo autenticado do cron sem iniciar crawler", async () => {
  const client = clientFor({ sync_log: [log] });
  const { handler, calls } = await load("sync-tcm-go-piracanjuba", client, provider([]));
  const result = await handler(new Request("https://example.test", { method: "POST", headers: { "x-cron-secret": "fixture" }, body: JSON.stringify({ action: "reconcile" }) }));
  assert.equal((await result.json()).processed, 1);
  assert.equal(client.tables.sync_log[0].status, "partial");
  assert.ok(calls.every(call => !call.url.includes("/acts/")));
});

test("TCM segredo de webhook não autoriza iniciar novo crawler", async () => {
  const client = clientFor();
  const { handler, calls } = await load("sync-tcm-go-piracanjuba", client);
  const result = await handler(new Request("https://example.test?action=trigger", { headers: { "x-tcm-secret": "fixture" } }));
  assert.equal(result.status, 401);
  assert.equal(client.traces.length, 0);
  assert.equal(calls.length, 0);
});
