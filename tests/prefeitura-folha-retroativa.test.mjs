import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";
import { test } from "node:test";

const base = new URL("../supabase/functions/_shared/", import.meta.url);
const json = value => JSON.parse(JSON.stringify(value));
class FixtureDate extends Date {
  constructor(...args) { super(...(args.length ? args : ["2026-11-10T15:00:00Z"])); }
  static now() { return new Date("2026-11-10T15:00:00Z").getTime(); }
}
const folha = (id, month, tipo = "MENSAL", overrides = {}) => ({
  id, ano: 2026, mes: month, orgao_id: 22, nome: `Servidor teste ${id}`,
  cargo: `Cargo ${month}`, matricula: String(id), tipo_folha: tipo,
  tipo_movimentacao: "NORMAL", total_proventos: "2.000,00", total_liquido: "1.800,00",
  ...overrides,
});

function clientFor(seed = {}, failure = () => null, hideIdentities = false) {
  const tables = structuredClone({ servidores: [], remuneracao_servidores: [], prefeitura_folha_nucleogov: [], prefeitura_sync_state: [], sync_log: [], ...seed });
  const traces = [];
  let nextId = 1;
  return {
    tables, traces,
    from(table) {
      const trace = { table, op: "read", payload: null, filters: [], columns: "*", conflict: [] };
      traces.push(trace);
      let single = false, start = 0, end = Infinity;
      const query = {
        select(columns) { trace.columns = columns; return this; },
        eq(key, value) { trace.filters.push(row => row[key] === value); return this; },
        in(key, values) { trace.filters.push(row => values.includes(row[key])); return this; },
        gt(key, value) { trace.filters.push(row => row[key] > value); return this; },
        order() { return this; },
        range(from, to) { start = from; end = to + 1; return this; },
        single() { single = true; return this; },
        insert(payload) { trace.op = "insert"; trace.payload = payload; return this; },
        upsert(payload, options) { trace.op = "upsert"; trace.payload = payload; trace.conflict = options.onConflict.split(","); return this; },
        update(payload) { trace.op = "update"; trace.payload = payload; return this; },
        then(resolve, reject) {
          const error = failure(trace);
          if (error) return Promise.resolve({ data: null, error }).then(resolve, reject);
          let rows = tables[table].filter(row => trace.filters.every(filter => filter(row))).slice(start, end);
          if (trace.op === "insert" || trace.op === "upsert") {
            const payload = Array.isArray(trace.payload) ? trace.payload : [trace.payload];
            rows = payload.map(value => {
              let stored = trace.op === "upsert" && tables[table].find(row => trace.conflict.every(key => row[key] === value[key]));
              if (stored) Object.assign(stored, structuredClone(value));
              else { stored = { id: `new-${nextId++}`, ...structuredClone(value) }; tables[table].push(stored); }
              return stored;
            });
          } else if (trace.op === "update") for (const row of rows) Object.assign(row, structuredClone(trace.payload));
          if (hideIdentities && table === "servidores" && trace.op === "read" && trace.columns === "id,nucleogov_portal_id") rows = [];
          return Promise.resolve({ data: single ? rows[0] ?? null : rows, error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  };
}

async function fixture(months = {}, options = {}) {
  const client = clientFor(options.seed, options.failure, options.hideIdentities);
  const calls = [];
  const scope = {
    Date: FixtureDate, console, Request, Response, URL, Object,
    Deno: { env: { get: () => "fixture" } },
    CENTI_BASE_PREFEITURA: "https://example.test",
    createClient: () => client,
    checkCentiAuth: () => options.authorized !== false,
  };
  for (const file of ["nucleogov-normalize.ts", "folha-retroativa.ts", "nucleogov-sync.ts"]) {
    const text = await readFile(new URL(file, base), "utf8");
    const source = stripTypeScriptTypes(text.replace(/^import[\s\S]*?;\n/gm, "").replace(/^export /gm, ""));
    vm.runInNewContext(source, scope);
  }
  scope.fetchFolhaPrefeituraWindow = async params => {
    calls.push(json(params));
    return scope.folhaCompetencias(params.year, params.month, params.forced).map(period => {
      const value = months[period.competencia] ?? [];
      if (value instanceof Error) return { ...period, error: value.message };
      return {
        ...period,
        source: { scope: period.competencia, dados: value, total: value.length, complete: true, pagesFetched: 1, maxPagesReached: false, by_orgao: [{ orgao_id: 22, source_total: value.length, fetched: value.length }] },
      };
    });
  };
  return { client, calls, handler: scope.createNucleoGovSyncHandler("folha", "sync-folha-prefeitura-nucleogov") };
}
const request = (body = {}, query = "") => new Request(`https://example.test/${query}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const invoke = async (handler, body = {}, query = "") => { const response = await handler(request(body, query)); return { status: response.status, body: await response.json() }; };

test("Prefeitura revisa quatro meses, importa publicacao tardia e mantem tipos separados sem duplicar", async () => {
  const months = {
    "2026-11": [folha(1, 11, "RESCISAO")],
    "2026-10": [folha(1, 10)],
    "2026-09": [folha(1, 9, "13 SALARIO")],
  };
  const { client, handler, calls } = await fixture(months);
  const first = await invoke(handler);
  assert.equal(first.status, 200);
  assert.deepEqual(first.body.reviewed_competencias, ["2026-11", "2026-10", "2026-09", "2026-08"]);
  assert.equal(client.tables.servidores[0].cargo, "Cargo 11");
  assert.equal(client.tables.remuneracao_servidores.length, 3);
  months["2026-10"] = [folha(1, 10, "MENSAL", { total_proventos: "2.500,00" }), folha(2, 10)];
  const second = await invoke(handler);
  assert.equal(second.status, 200);
  assert.equal(client.tables.remuneracao_servidores.length, 4);
  assert.equal(client.tables.prefeitura_folha_nucleogov.length, 4);
  const october = client.tables.remuneracao_servidores.filter(row => row.competencia === "2026-10");
  assert.deepEqual(october.map(row => row.bruto).sort((a, b) => a - b), [2000, 2500]);
  assert.equal(client.tables.servidores.find(row => row.nucleogov_portal_id === 1).cargo, "Cargo 11");
  assert.deepEqual(calls.map(call => call.forced), [false, false]);
  assert.equal(second.body.window_writes.compatibility, 4);
});

test("Prefeitura mantem movimentos canonicos e mensal, rescisao e 13 separados na compatibilidade", async () => {
  const { handler, client } = await fixture({ "2026-10": [
    folha(1, 10, "MENSAL", { total_proventos: "1.000,00" }),
    folha(1, 10, "MENSAL", { total_proventos: "1.100,00", tipo_movimentacao: "RETIFICACAO" }),
    folha(1, 10, "RESCISAO", { total_proventos: "500,00" }),
    folha(1, 10, "13 SALARIO", { total_proventos: "800,00" }),
  ] });
  assert.equal((await invoke(handler, { year: 2026, month: 10 })).status, 200);
  assert.equal(client.tables.prefeitura_folha_nucleogov.length, 4);
  assert.equal(client.tables.remuneracao_servidores.length, 3);
  assert.equal(client.tables.remuneracao_servidores.find(row => row.tipo_folha === "MENSAL").bruto, 1100);
  assert.equal(client.tables.remuneracao_servidores.find(row => row.tipo_folha === "RESCISAO").bruto, 500);
  assert.equal(client.tables.remuneracao_servidores.find(row => row.tipo_folha === "13 SALARIO").bruto, 800);
});

test("Prefeitura mes explicito vazio preserva dados existentes e nao importa outro mes", async () => {
  const stored = { id: "old", servidor_id: "s1", competencia: "2026-10", tipo_folha: "MENSAL", bruto: 3000 };
  const { handler, client } = await fixture({ "2026-09": [folha(1, 9)] }, { seed: { remuneracao_servidores: [stored] } });
  const response = await invoke(handler, { year: 2026, month: 10 });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.reviewed_competencias, ["2026-10"]);
  assert.equal(response.body.source_total, 0);
  assert.deepEqual(client.tables.remuneracao_servidores, [stored]);
});

test("Prefeitura reprocessamento manual antigo nao regride cadastro com folha posterior", async () => {
  const servidor = { id: "s1", origem_chave: "prefeitura:nucleogov:1", nucleogov_portal_id: 1, orgao_tipo: "prefeitura", cargo: "Cargo atual" };
  const { handler, client } = await fixture({ "2026-10": [folha(1, 10)] }, { seed: { servidores: [servidor], remuneracao_servidores: [{ id: "r1", servidor_id: "s1", competencia: "2026-11", tipo_folha: "MENSAL", bruto: 3000 }] } });
  assert.equal((await invoke(handler, { year: 2026, month: 10 })).status, 200);
  assert.equal(client.tables.servidores[0].cargo, "Cargo atual");
  assert.equal(client.tables.remuneracao_servidores.length, 2);
});

test("Prefeitura dry_run consulta toda janela sem qualquer escrita ou consulta ao banco", async () => {
  const { handler, client, calls } = await fixture({ "2026-11": [folha(1, 11)], "2026-10": [folha(2, 10)] });
  const response = await invoke(handler, { dry_run: true });
  assert.equal(response.status, 200);
  assert.equal(response.body.dry_run, true);
  assert.equal(response.body.window_fetched, 2);
  assert.equal(response.body.window_writes.canonical, 0);
  assert.equal(client.traces.length, 0);
  assert.equal(calls.length, 1);
  assert.equal((await invoke(handler, {}, "?dry_run=true")).status, 200);
  assert.equal(client.traces.length, 0);
});

for (const body of [{ year: 2026 }, { month: 10 }, { year: null, month: 10 }, { year: 2026, month: 12 }, { year: 2026, month: "10oops" }, { dry_run: "true" }, { dry_run: 1 }]) {
  test(`Prefeitura rejeita parametros invalidos sem importar: ${JSON.stringify(body)}`, async () => {
    const { handler, client, calls } = await fixture();
    assert.equal((await invoke(handler, body)).status, 400);
    assert.equal(client.traces.length, 0);
    assert.equal(calls.length, 0);
  });
}

test("Prefeitura rejeita JSON invalido e conflito de simulacao sem mutacoes", async () => {
  const { handler, client } = await fixture();
  assert.equal((await handler(new Request("https://example.test", { method: "POST", body: "{" }))).status, 400);
  assert.equal((await invoke(handler, { dry_run: false }, "?dry_run=true")).status, 400);
  assert.equal((await invoke(handler, {}, "?dry_run=1")).status, 400);
  assert.equal(client.traces.length, 0);
});

test("Prefeitura erro de fonte em um mes nao grava esse mes e nao impede os demais", async () => {
  const { handler, client } = await fixture({ "2026-11": new Error("fonte incompleta"), "2026-10": [folha(1, 10)] });
  const response = await invoke(handler);
  assert.equal(response.status, 500);
  assert.equal(response.body.status, "partial");
  assert.equal(response.body.success, false);
  assert.equal(response.body.by_competencia[0].step, "source");
  assert.equal(response.body.by_competencia[0].writes.canonical, 0);
  assert.equal(client.tables.remuneracao_servidores.length, 1);
  assert.equal(client.tables.remuneracao_servidores[0].competencia, "2026-10");
  assert.ok(client.tables.prefeitura_sync_state.every(row => row.scope !== "2026-11"));
  assert.equal(client.tables.sync_log[0].status, "partial");
});

test("Prefeitura falha de persistencia informa etapa e contagens confirmadas sem declarar sucesso", async () => {
  const { handler, client } = await fixture({ "2026-11": [folha(1, 11)], "2026-10": [folha(2, 10)] }, {
    failure: trace => trace.table === "remuneracao_servidores" && trace.op === "upsert" && trace.payload[0]?.competencia === "2026-11" ? { message: "fixture write failed" } : null,
  });
  const response = await invoke(handler);
  assert.equal(response.status, 500);
  assert.equal(response.body.status, "partial");
  assert.equal(response.body.by_competencia[0].step, "remuneracoes");
  assert.equal(response.body.by_competencia[0].writes.canonical, 1);
  assert.equal(response.body.by_competencia[0].writes.servidores, 1);
  assert.equal(response.body.by_competencia[0].writes.compatibility, 0);
  assert.equal(client.tables.remuneracao_servidores[0].competencia, "2026-10");
  assert.ok(client.tables.prefeitura_sync_state.every(row => row.scope !== "2026-11"));
});

test("Prefeitura identidade ausente falha sem descartar silenciosamente remuneracoes", async () => {
  const { handler, client } = await fixture({ "2026-10": [folha(1, 10)] }, { hideIdentities: true });
  const response = await invoke(handler, { year: 2026, month: 10 });
  assert.equal(response.status, 500);
  assert.equal(response.body.by_competencia[0].step, "identidades");
  assert.match(response.body.by_competencia[0].error, /identidade.*ausente/);
  assert.equal(client.tables.remuneracao_servidores.length, 0);
});

test("Prefeitura simulacao continua exigindo autenticacao", async () => {
  const { handler, client, calls } = await fixture({}, { authorized: false });
  assert.equal((await invoke(handler, { dry_run: true })).status, 401);
  assert.equal(client.traces.length, 0);
  assert.equal(calls.length, 0);
});
