import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";
import { test } from "node:test";

const base = new URL("../supabase/functions/", import.meta.url);
const fixedNow = "2026-11-10T12:00:00Z";
class FixedDate extends Date {
  constructor(...args) { super(...(args.length ? args : [fixedNow])); }
  static now() { return Date.parse(fixedNow); }
}

function database(initial = {}, failure = () => false) {
  const tables = {
    servidores: [], remuneracao_servidores: [], sync_log: [], ...structuredClone(initial),
  };
  const mutations = [];
  let serial = 0;
  return {
    tables,
    mutations,
    from(table) {
      let kind = "read";
      let payload;
      let conflict;
      let single = false;
      let slice;
      let ordering;
      const filters = [];
      const query = {
        select() { return query; },
        eq(key, value) { filters.push((row) => row[key] === value); return query; },
        in(key, values) { filters.push((row) => values.includes(row[key])); return query; },
        gt(key, value) { filters.push((row) => row[key] > value); return query; },
        order(key) { ordering = key; return query; },
        range(from, to) { slice = [from, to + 1]; return query; },
        single() { single = true; return query; },
        insert(rows) { kind = "insert"; payload = rows; return query; },
        update(rows) { kind = "update"; payload = rows; return query; },
        upsert(rows, options) { kind = "upsert"; payload = rows; conflict = options.onConflict; return query; },
        then(resolve, reject) {
          try {
            if (failure({ table, kind, payload })) {
              return Promise.resolve({ data: null, error: { message: "falha simulada" } }).then(resolve, reject);
            }
            let found = tables[table].filter((row) => filters.every((filter) => filter(row)));
            if (kind !== "read") {
              const rows = (Array.isArray(payload) ? payload : [payload]).map((row) => structuredClone(row));
              mutations.push({ table, kind, rows });
              if (kind === "update") {
                for (const row of found) Object.assign(row, rows[0]);
              } else {
                found = rows.map((row) => {
                  const existing = kind === "upsert" && tables[table].find((stored) =>
                    conflict.split(",").every((key) => stored[key] === row[key]));
                  if (existing) { Object.assign(existing, row); return existing; }
                  const inserted = { id: `id-${++serial}`, ...row };
                  tables[table].push(inserted);
                  return inserted;
                });
              }
            }
            if (ordering) found.sort((a, b) => String(a[ordering]).localeCompare(String(b[ordering])));
            if (slice) found = found.slice(...slice);
            return Promise.resolve({ data: single ? found[0] ?? null : found, error: null }).then(resolve, reject);
          } catch (error) { return Promise.reject(error).then(resolve, reject); }
        },
      };
      return query;
    },
  };
}

function portalRow(id, mes, overrides = {}) {
  return {
    id, ano: 2026, mes, matricula: String(id), nome: `Servidor ${id}`, cargo: "Cargo atual",
    tipo_folha: "MENSAL", total_proventos: "1.000,00", total_liquido: "900,00", ...overrides,
  };
}

async function fixture({ rows = () => [], respond, initial, failure, authorized = true } = {}) {
  const db = database(initial, failure);
  const calls = [];
  let clients = 0;
  let handler;
  const scope = vm.createContext({
    Date: FixedDate, console, URL, Request, Response,
    CENTI_BASE_CAMARA: "https://example.test",
    checkCentiAuth: () => authorized,
    createClient: () => { clients++; return db; },
    Deno: { env: { get: () => "fixture" }, serve: (fn) => { handler = fn; } },
    centiCall: async (_referer, requests) => {
      const { extra, limit } = requests[0];
      const call = { ano: Number(extra.ano), mes: Number(extra.mes), offset: limit.offset, size: limit.pageSize };
      calls.push(call);
      if (respond) return { data: await respond(call) };
      const data = rows(call);
      return { data: { total: data.length, dados: data.slice(call.offset, call.offset + call.size) } };
    },
  });
  for (const filename of ["_shared/folha-retroativa.ts", "_shared/servidor-origin.ts", "_shared/persistence-guards.ts", "sync-camara-servidores/index.ts"]) {
    const raw = await readFile(new URL(filename, base), "utf8");
    const source = stripTypeScriptTypes(raw.replace(/^import[\s\S]*?;\n/gm, "").replace(/^export /gm, ""));
    vm.runInContext(source, scope);
  }
  return {
    db, calls, scope, clients: () => clients,
    request: async (query = "", body) => {
      const response = await handler(new Request(`https://example.test/function${query}`, {
        method: "POST", body: body === undefined ? "{}" : JSON.stringify(body),
      }));
      return { status: response.status, body: await response.json() };
    },
  };
}

test("janela revisa quatro meses mesmo com rescisao no mes atual e importa retificacoes tardias", async () => {
  let revised = false;
  const f = await fixture({ rows: ({ mes }) => mes === 11
    ? [portalRow(2, 11, { tipo_folha: "RESCISÃO" })]
    : mes === 10
      ? [portalRow(1, 10, { total_proventos: revised ? "1.100,00" : "1.000,00" }), ...(revised ? [portalRow(3, 10)] : [])]
      : [] });
  const first = await f.request();
  assert.equal(first.status, 200);
  assert.deepEqual(first.body.reviewed_competencias, ["2026-11", "2026-10", "2026-09", "2026-08"]);
  assert.equal(f.db.tables.remuneracao_servidores.length, 2);
  revised = true;
  const second = await f.request();
  assert.equal(second.status, 200);
  assert.equal(f.db.tables.remuneracao_servidores.length, 3);
  const id = f.db.tables.servidores.find((row) => row.nucleogov_portal_id === 1).id;
  assert.equal(f.db.tables.remuneracao_servidores.find((row) => row.servidor_id === id).bruto, 1100);
  assert.deepEqual(f.calls.map(({ mes }) => mes), [11, 10, 9, 8, 11, 10, 9, 8]);
});

test("janela de janeiro inclui dezembro novembro e outubro do ano anterior", async () => {
  const f = await fixture();
  const window = await f.scope.fetchFolhaWindow(2027, 1, false);
  assert.deepEqual(JSON.parse(JSON.stringify(window.results.map((row) => row.competencia))), ["2027-01", "2026-12", "2026-11", "2026-10"]);
  assert.deepEqual(f.calls.map(({ ano, mes }) => [ano, mes]), [[2027, 1], [2026, 12], [2026, 11], [2026, 10]]);
});

test("competencia explicita vazia nao importa outro mes nem apaga historico", async () => {
  const existing = { id: "rem-old", servidor_id: "srv-old", competencia: "2026-09", tipo_folha: "MENSAL", bruto: 500 };
  const f = await fixture({ initial: { remuneracao_servidores: [existing] } });
  const result = await f.request("?ano=2026&mes=9");
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.reviewed_competencias, ["2026-09"]);
  assert.deepEqual(f.db.tables.remuneracao_servidores, [existing]);
  assert.deepEqual(f.calls.map(({ mes }) => mes), [9]);
});

test("cadastro mais recente e preservado na janela e no reprocessamento manual", async () => {
  const f = await fixture({ rows: ({ mes }) => mes >= 10 ? [portalRow(1, mes, { cargo: mes === 11 ? "Cargo atual" : "Cargo antigo" })] : [] });
  assert.equal((await f.request()).status, 200);
  assert.equal(f.db.tables.servidores[0].cargo, "Cargo atual");
  assert.equal((await f.request("?ano=2026&mes=10")).status, 200);
  assert.equal(f.db.tables.servidores[0].cargo, "Cargo atual");
  assert.equal(f.db.tables.remuneracao_servidores.length, 2);
});

test("origem repetida na janela adota identidade legada uma unica vez e preserva tipos", async () => {
  const f = await fixture({
    initial: { servidores: [{ id: "legado", nome: "Servidor 1", origem_chave: "camara:nome:SERVIDOR 1", orgao_tipo: "camara" }] },
    rows: ({ mes }) => mes === 11 ? [portalRow(1, 11, { tipo_folha: "RESCISÃO" })] : mes === 10
      ? [portalRow(1, 10), portalRow(1, 10, { tipo_folha: "13º SALÁRIO" })] : [],
  });
  const result = await f.request();
  assert.equal(result.status, 200);
  assert.equal(result.body.identidades_historicas_adotadas, 1);
  assert.equal(f.db.tables.servidores.length, 1);
  assert.equal(f.db.tables.servidores[0].id, "legado");
  assert.deepEqual(f.db.tables.remuneracao_servidores.map((row) => [row.servidor_id, row.competencia, row.tipo_folha]), [
    ["legado", "2026-11", "RESCISÃO"], ["legado", "2026-10", "MENSAL"], ["legado", "2026-10", "13º SALÁRIO"],
  ]);
});

test("dry_run autenticado por query ou JSON nao instancia cliente nem escreve logs", async () => {
  const f = await fixture({ rows: ({ mes }) => [portalRow(1, mes)] });
  for (const [query, body] of [["?dry_run=true", undefined], ["", { dry_run: true }]]) {
    const result = await f.request(query, body);
    assert.equal(result.status, 200);
    assert.equal(result.body.dry_run, true);
    assert.equal(result.body.remuneracoes_janela, 0);
    assert.equal(result.body.registros_folha_janela, 4);
  }
  assert.equal(f.clients(), 0);
  assert.deepEqual(f.db.mutations, []);
  const denied = await fixture({ authorized: false });
  assert.equal((await denied.request("?dry_run=true")).status, 401);
  assert.equal(denied.calls.length, 0);
});

test("falha de fonte num mes preserva seu historico e registra sucesso parcial dos demais", async () => {
  const f = await fixture({ respond: ({ mes }) => ({ total: mes >= 10 ? 1 : 0, dados: mes >= 10 ? [portalRow(1, 11)] : [] }) });
  const result = await f.request();
  assert.equal(result.status, 500);
  assert.equal(result.body.status, "partial");
  assert.equal(result.body.por_competencia.find((row) => row.mes === 10).stage, "collection");
  assert.deepEqual(f.db.tables.remuneracao_servidores.map((row) => row.competencia), ["2026-11"]);
  assert.equal(f.db.tables.sync_log[0].status, "partial");
});

test("falha de persistencia informa competencia e contagens ja gravadas sem sucesso integral", async () => {
  const f = await fixture({
    rows: ({ mes }) => mes >= 10 ? [portalRow(1, mes)] : [],
    failure: ({ table, kind, payload }) => table === "remuneracao_servidores" && kind === "upsert" && payload[0].competencia === "2026-10",
  });
  const result = await f.request();
  assert.equal(result.status, 500);
  assert.equal(result.body.success, false);
  assert.equal(result.body.remuneracoes_janela, 1);
  const failed = result.body.por_competencia.find((row) => row.mes === 10);
  assert.equal(failed.status, "error");
  assert.equal(failed.stage, "persistence");
  assert.equal(failed.remuneracoes, 0);
});

for (const [label, respond] of [
  ["total variavel", ({ offset }) => ({ total: offset ? 101 : 102, dados: Array.from({ length: offset ? 1 : 100 }, (_, i) => portalRow(offset + i + 1, 10)) })],
  ["pagina repetida", () => ({ total: 200, dados: Array.from({ length: 100 }, (_, i) => portalRow(i + 1, 10)) })],
  ["dados excedentes", () => ({ total: 0, dados: [portalRow(1, 10)] })],
  ["total ausente", () => ({ dados: [] })],
  ["erro logico com total zero", () => ({ total: 0, dados: [], error: "fonte indisponivel" })],
  ["pagina curta", () => ({ total: 2, dados: [portalRow(1, 10)] })],
]) {
  test(`coleta rejeita ${label} antes de persistir o mes`, async () => {
    const f = await fixture({ respond });
    const result = await f.request("?ano=2026&mes=10");
    assert.equal(result.status, 500);
    assert.equal(result.body.status, "error");
    assert.equal(f.db.tables.servidores.length, 0);
    assert.equal(f.db.tables.remuneracao_servidores.length, 0);
  });
}

test("parametros invalidos nao iniciam coleta nem criam logs", async () => {
  const f = await fixture();
  for (const query of ["?ano=2026", "?mes=10", "?ano=2026&mes=10abc", "?ano=2026&mes=", "?ano=2026&mes=12", "?dry_run=talvez"]) {
    assert.equal((await f.request(query)).status, 400);
  }
  assert.equal(f.calls.length, 0);
  assert.equal(f.clients(), 0);
});

test("dry_run divergente entre URL e corpo e rejeitado antes de qualquer escrita", async () => {
  const f = await fixture();
  for (const [query, body] of [
    ["?dry_run=false", { dry_run: true }],
    ["?dry_run=true", { dry_run: false }],
    ["", { dry_run: "false" }],
    ["", { dry_run: null }],
  ]) {
    assert.equal((await f.request(query, body)).status, 400);
  }
  assert.equal(f.clients(), 0);
  assert.equal(f.calls.length, 0);
  assert.deepEqual(f.db.mutations, []);
});
