import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";
import { test } from "node:test";

const base = new URL("../supabase/functions/", import.meta.url);
const ID = "123e4567-e89b-12d3-a456-426614174000";
const OTHER_ID = "123e4567-e89b-12d3-a456-426614174001";
const server = (id = ID) => ({ id, nome: "Nome repetido", cargo: "Professor", orgao_tipo: "prefeitura", fonte_url: "https://example.test/folha" });
const payment = (id, competencia = "2026-10", tipo_folha = "MENSAL", bruto = 2000, servidor_id = ID) => ({ id, servidor_id, competencia, tipo_folha, bruto, liquido: 1800, fonte_url: "https://example.test/folha" });
class FixtureDate extends Date {
  constructor(...args) { super(...(args.length ? args : ["2026-11-10T15:00:00Z"])); }
}

async function fixture(options = {}) {
  const tables = { servidores: options.servidores ?? [server()], remuneracao_servidores: options.payments ?? [] };
  const calls = { reads: [], clients: 0, fetches: 0 };
  const client = {
    from(table) {
      if (!(table in tables)) throw new Error("Tabela inesperada: " + table);
      const query = { table, filters: [], columns: "", offset: 0, end: Infinity, orders: [], single: false };
      calls.reads.push(query);
      const builder = {
        select(columns, selection) { query.columns = columns; query.selection = selection; return this; },
        eq(key, value) { query.filters.push([key, value]); return this; },
        order(key, direction) { query.orders.push([key, direction]); return this; },
        range(offset, end) { query.offset = offset; query.end = end + 1; return this; },
        maybeSingle() { query.single = true; return this; },
        then(resolve, reject) {
          const failure = options.failure?.(query);
          if (failure) return Promise.resolve({ data: null, count: null, error: { message: failure } }).then(resolve, reject);
          let rows = tables[table].filter(row => query.filters.every(([key, value]) => row[key] === value));
          const count = options.count?.(query, rows.length) ?? rows.length;
          rows = [...rows].sort((a, b) => {
            for (const [key, direction] of query.orders) {
              if (a[key] === b[key]) continue;
              const order = a[key] < b[key] ? -1 : 1;
              return direction?.ascending === false ? -order : order;
            }
            return 0;
          }).slice(query.offset, query.end);
          rows = options.rows?.(query, rows) ?? rows;
          const data = query.single ? rows[0] ?? null : rows;
          return Promise.resolve({ data, error: null, count }).then(resolve, reject);
        },
      };
      return builder;
    },
    rpc() { throw new Error("Consulta de quota/cache inesperada"); },
  };
  let handler;
  const context = vm.createContext({
    Date: FixtureDate, Intl, Request, Response, URL, TextEncoder, TextDecoder, Uint8Array,
    console: { log() {}, error() {} },
    Deno: { env: { get: key => ({ SUPABASE_URL: "https://example.test", SUPABASE_SERVICE_ROLE_KEY: "fixture-service", CRON_SECRET: "fixture-cron" })[key] }, serve: value => { handler = value; } },
    createClient: () => { calls.clients++; return client; },
    fetch: () => { calls.fetches++; throw new Error("Provedor externo inesperado"); },
  });
  const slug = options.slug ?? "summarize-servidor";
  for (const file of ["_shared/service-role-auth.ts", "_shared/admin-session-auth.ts", "_shared/servidor-resumo.ts", slug + "/index.ts"]) {
    const text = await readFile(new URL(file, base), "utf8");
    const source = stripTypeScriptTypes(text.replace(/^import[\s\S]*?;\n/gm, "").replace(/^export /gm, ""));
    vm.runInContext(source, context, { filename: file });
  }
  return { handler, calls, tables };
}
const request = (body = { servidor_id: ID }, headers = {}) => new Request("https://example.test", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
const invoke = async (handler, body, headers) => { const response = await handler(request(body, headers)); return { status: response.status, body: await response.json(), headers: response.headers }; };

test("resumo individual consulta tipos separados sem IA, cache, quota ou escrita", async () => {
  const { handler, calls } = await fixture({ payments: [
    payment("res", "2026-11", "RESCISÃO", 2407.68),
    payment("mensal", "2026-10", "MENSAL", 3000),
    payment("13a", "2026-10", "13º SALÁRIO ADIANTAMENTO", 1000),
    payment("13b", "2026-10", "13º SALÁRIO ADIANTAMENTO- RPPS", 500),
    payment("old", "2026-09", "MENSAL", 2800),
  ] });
  const result = await invoke(handler);
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("cache-control"), "no-store");
  assert.equal(result.body.modo, "dados_oficiais");
  assert.equal(result.body.cached, false);
  assert.equal(result.body.resumo_folha.mensal.bruto, 3000);
  assert.equal(result.body.resumo_folha.mensal.competencia, "2026-10");
  assert.equal(result.body.resumo_folha.rescisoes.competencia, "2026-11");
  assert.equal(result.body.resumo_folha.decimoTerceiro.bruto, 1500);
  assert.equal(result.body.remuneracoes.length, 4);
  assert.match(result.body.resumo, /rescisão disponível \(2026-11\)/);
  assert.equal(calls.fetches, 0);
  assert.deepEqual(calls.reads.map(query => query.table), ["servidores", "remuneracao_servidores"]);
  assert.ok(calls.reads.every(query => !query.columns.includes("*") && !query.columns.includes("cpf")));
});

test("resumo percorre paginas ate encontrar mensal alem dos lancamentos recentes", async () => {
  const payments = Array.from({ length: 501 }, (_, i) => payment(`outro-${String(i).padStart(4, "0")}`, "2026-11", "COMPLEMENTAR", 1));
  payments.push(payment("mensal-antiga", "2025-12", "MENSAL", 999));
  const { handler, calls } = await fixture({ payments });
  const result = await invoke(handler);
  assert.equal(result.status, 200);
  assert.equal(result.body.resumo_folha.totalRegistros, 502);
  assert.equal(result.body.resumo_folha.mensal.bruto, 999);
  assert.deepEqual(calls.reads.filter(query => query.table === "remuneracao_servidores").map(query => query.offset), [0, 250, 500]);
});

test("resumo separa homonimos por UUID e aceita UUID com letras maiusculas", async () => {
  const { handler, calls } = await fixture({ servidores: [server(), server(OTHER_ID)], payments: [payment("a", "2026-10", "MENSAL", 100), payment("b", "2026-10", "MENSAL", 9000, OTHER_ID)] });
  const result = await invoke(handler, { servidor_id: ID.toUpperCase() });
  assert.equal(result.status, 200);
  assert.equal(result.body.servidor.id, ID);
  assert.equal(result.body.resumo_folha.mensal.bruto, 100);
  assert.ok(calls.reads.every(query => query.filters.some(([key, value]) => (key === "id" || key === "servidor_id") && value === ID)));
});

test("resumo reflete retificacao do mesmo mes em nova consulta", async () => {
  const { handler, tables } = await fixture({ payments: [payment("a", "2026-10", "MENSAL", 100)] });
  const before = await invoke(handler);
  tables.remuneracao_servidores[0].bruto = 200;
  const after = await invoke(handler);
  assert.equal(after.body.resumo_folha.mensal.bruto, 200);
  assert.notEqual(before.body.resumo, after.body.resumo);
});

test("ausencia real de servidor e de folha sao diferentes de falha de banco", async () => {
  const absent = await fixture({ servidores: [] });
  assert.equal((await invoke(absent.handler)).status, 404);
  const noPayroll = await fixture();
  const empty = await invoke(noPayroll.handler);
  assert.equal(empty.status, 200);
  assert.equal(empty.body.resumo_folha.totalRegistros, 0);
  for (const table of ["servidores", "remuneracao_servidores"]) {
    const failed = await fixture({ failure: query => query.table === table ? "detalhe interno confidencial" : null });
    const result = await invoke(failed.handler);
    assert.equal(result.status, 503);
    assert.equal(result.body.resumo_folha, undefined);
    assert.ok(!JSON.stringify(result.body).includes("confidencial"));
  }
});

for (const issue of ["short", "changed-count", "duplicate", "second-page-error", "wrong-person", "too-many"]) {
  test("resumo rejeita historico inconsistente: " + issue, async () => {
    const payments = Array.from({ length: 260 }, (_, i) => payment(String(i).padStart(4, "0")));
    const options = {
      payments,
      count: (query, value) => query.table !== "remuneracao_servidores" ? value : issue === "too-many" ? 5001 : issue === "changed-count" && query.offset > 0 ? 261 : value,
      failure: query => issue === "second-page-error" && query.offset > 0 ? "offline" : null,
      rows: (query, rows) => {
        if (query.table !== "remuneracao_servidores") return rows;
        if (issue === "short") return rows.slice(0, 2);
        if (issue === "duplicate" && query.offset > 0) return [payments[0], ...rows.slice(1)];
        if (issue === "wrong-person") return rows.map(row => ({ ...row, servidor_id: OTHER_ID }));
        return rows;
      },
    };
    assert.equal((await invoke((await fixture(options)).handler)).status, 503);
  });
}

test("resumo valida metodo, identidade, corpo e overrides antes de acessar dados", async () => {
  const { handler, calls } = await fixture();
  assert.equal((await handler(new Request("https://example.test"))).status, 405);
  assert.equal((await handler(new Request("https://example.test", { method: "OPTIONS" }))).status, 200);
  for (const body of [{}, { servidor_id: "invalid" }, { servidor_id: ID, model: "override" }, { servidor_id: ID, provider: "override" }]) {
    assert.equal((await invoke(handler, body)).status, body.servidor_id === ID ? 403 : 400);
  }
  assert.equal((await handler(request({ pad: "a".repeat(8300) }))).status, 413);
  assert.equal((await handler(new Request("https://example.test", { method: "POST", body: "{" }))).status, 400);
  assert.equal(calls.clients, 0);
  assert.equal(calls.fetches, 0);
});

test("backfill permanece privado e retorna sem banco, cache ou chamada externa", async () => {
  const { handler, calls } = await fixture({ slug: "backfill-servidor-resumos" });
  assert.equal((await invoke(handler, {})).status, 401);
  assert.equal((await invoke(handler, {}, { Authorization: "Bearer fixture-anon" })).status, 401);
  for (const headers of [{ "x-cron-secret": "fixture-cron" }, { Authorization: "Bearer fixture-service" }]) {
    for (const dry_run of [false, true]) {
      const result = await invoke(handler, { dry_run, batch_size: 40, provider: "openrouter" }, headers);
      assert.equal(result.status, 200);
      assert.equal(result.body.skipped, true);
      assert.equal(result.body.reason, "resumos_deterministicos");
      assert.equal(result.body.gerados, 0);
      assert.equal(result.body.dry_run, dry_run);
    }
  }
  assert.equal((await invoke(handler, { dry_run: "true" }, { "x-cron-secret": "fixture-cron" })).status, 400);
  assert.equal(calls.clients, 0);
  assert.equal(calls.fetches, 0);
  assert.deepEqual(calls.reads, []);
});
