import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { test } from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const json = value => new Response(JSON.stringify(value));
const ckan = (records, total = records.length) => json({ success: true, result: { records, total } });
const row = { categoria: "mortalidade_geral", indicador: "obitos_anual", ano: 2024, valor: 1, fonte: "SIM", fonte_url: "https://example.test" };

async function load(slug, fetcher = () => { throw new Error("rede inesperada"); }, rpcOverride) {
  const log = { id: "fixture-log", status: "running" };
  const calls = { network: 0, client: 0, rpc: [] };
  const client = {
    from(table) {
      assert.equal(table, "sync_log", "indicadores só podem ser gravados pelo RPC atômico");
      let payload, filters = [];
      return {
        insert(value) { payload = value; return this; },
        update(value) { payload = value; return this; },
        select() { return this; }, single() { return this; },
        eq(key, value) { filters.push([key, value]); return this; },
        then(resolve, reject) {
          if (filters.every(([key, value]) => log[key] === value)) Object.assign(log, payload);
          return Promise.resolve({ data: log, error: null }).then(resolve, reject);
        },
      };
    },
    async rpc(name, args) {
      assert.equal(name, "replace_saude_snapshot");
      calls.rpc.push(structuredClone(args));
      if (rpcOverride) return await rpcOverride(log, args);
      log.status = "success";
      return { data: { status: "success", total: args.p_rows.length, inserted: args.p_rows.length, updated: 0, unchanged: 0, removed: 0, preserved_missing: 0 } };
    },
  };
  const sandbox = {
    console: { log() {}, error() {} }, Request, Response, Headers, URL, URLSearchParams, AbortSignal,
    Deno: { env: { get: key => key === "SUPABASE_URL" ? "https://example.test" : "fixture" }, serve: handler => { sandbox.handler = handler; } },
    createClient: () => { calls.client++; return client; },
    fetch: async (url, options) => { calls.network++; return await fetcher(url, options); },
  };
  for (const file of ["_shared/service-role-auth.ts", "_shared/health-snapshot.ts", ...(slug ? [`${slug}/index.ts`] : [])]) {
    const source = await readFile(`${root}supabase/functions/${file}`, "utf8");
    vm.runInNewContext(stripTypeScriptTypes(source.replace(/^import[\s\S]*?;\n/gm, "").replace(/^export /gm, "")), sandbox);
  }
  return { sandbox, calls, log, handler: sandbox.handler };
}
const request = (headers = { "x-cron-secret": "fixture" }) => new Request("https://example.test", { method: "POST", headers, body: "{}" });
const mortality = url => ckan([{ _id: 1, "Municipio residencia": "Piracanjuba", ano: 2024, sexo: "MASCULINO", faixa_etaria: "0 A 6 DIAS", dcid_capitulo: "I", "total obitos": 2 }]);
const hiv = url => {
  const id = url.searchParams.get("resource_id");
  if (id === "9cac6ec3-47f5-4e85-9a2f-ae7acbe94810") return ckan([{ _id: 1, municipio: "Piracanjuba", data_diagnostico: "02/01/2024", sexo: "MASCULINO", faixa_etaria: "20 A 29 ANOS" }]);
  if (id === "6ed31d56-ffea-48ec-ba78-d6284cc973cc") return ckan([{ _id: 1, municipio: "Piracanjuba", data_obito: "02/01/2024" }]);
  return ckan([]);
};

for (const slug of ["sync-mortalidade", "sync-saude-hiv-casos"]) {
  test(`${slug}: autorização precede cliente, leitura e gravação`, async () => {
    const { handler, calls } = await load(slug);
    assert.equal((await handler(request({ authorization: "Bearer public-fixture" }))).status, 401);
    assert.equal(calls.client, 0); assert.equal(calls.network, 0); assert.equal(calls.rpc.length, 0);
  });
  test(`${slug}: fonte incompleta mantém snapshot e finaliza log como erro`, async () => {
    const { handler, calls, log } = await load(slug, () => ckan([], 2));
    assert.equal((await handler(request())).status, 500);
    assert.equal(calls.rpc.length, 0); assert.equal(log.status, "error"); assert.ok(log.finished_at);
  });
  test(`${slug}: confirma somente um RPC com todas as fontes`, async () => {
    const { handler, calls, log } = await load(slug, slug === "sync-mortalidade" ? mortality : hiv);
    const response = await handler(request());
    assert.equal(response.status, 200);
    assert.equal(calls.rpc.length, 1); assert.equal(log.status, "success");
    assert.equal(calls.rpc[0].p_sources.length, slug === "sync-mortalidade" ? 2 : 5);
    assert.ok(calls.rpc[0].p_rows.every(r => !r.indicador.includes("taxa_mortalidade")));
    assert.equal((await response.json()).indicadores_confirmados, calls.rpc[0].p_rows.length);
  });
  test(`${slug}: erro RPC não vira sucesso`, async () => {
    const { handler, log } = await load(slug, slug === "sync-mortalidade" ? mortality : hiv, () => ({ error: { code: "P0001", message: "falha de teste" } }));
    const response = await handler(request());
    assert.equal(response.status, 500); assert.equal(log.status, "error");
    assert.match((await response.json()).error, /falha de teste/);
  });
}

test("resposta perdida após commit preserva sucesso do log transacional", async () => {
  const { handler, log } = await load("sync-mortalidade", mortality, log => { log.status = "success"; log.finished_at = "committed"; throw new Error("conexão interrompida após commit"); });
  assert.equal((await handler(request())).status, 500);
  assert.equal(log.status, "success"); assert.equal(log.finished_at, "committed");
});

test("data, ano e número inválidos nunca se convertem em zero", async () => {
  const { sandbox: s } = await load();
  for (const bad of [null, undefined, "", "ignorado", "12abc", NaN, -1]) assert.throws(() => s.strictHealthNumber(bad, "campo"));
  assert.equal(s.strictHealthNumber("12,5", "campo"), 12.5);
  assert.throws(() => s.strictHealthYear("2024.5"));
  assert.throws(() => s.healthDateYear("31/02/2024"));
  assert.equal(s.healthDateYear("29/02/2024"), 2024);
});

test("identidade coalescida rejeita duplicata e categoria externa", async () => {
  const { sandbox: s } = await load();
  assert.throws(() => s.normalizeHealthSnapshot("mortalidade", [row, { ...row, mes: 0, semana_epidemiologica: 0 }]));
  assert.throws(() => s.normalizeHealthSnapshot("mortalidade", [{ ...row, categoria: "hiv" }]));
  assert.throws(() => s.normalizeHealthSnapshot("mortalidade", []));
});

test("paginação CKAN ordena por identidade e confirma total exato", async () => {
  const offsets = [];
  const { sandbox: s } = await load(null, url => {
    assert.equal(url.searchParams.get("sort"), "_id asc");
    const offset = Number(url.searchParams.get("offset")); offsets.push(offset);
    return ckan(Array.from({ length: offset === 0 ? 100 : 1 }, (_, i) => ({ _id: offset + i + 1, municipio: "Piracanjuba" })), 101);
  });
  const result = await s.readHealthSource("fixture", "municipio", "Piracanjuba");
  assert.equal(result.records.length, 101); assert.equal(result.receipt.complete, true);
  assert.deepEqual(offsets, [0, 100]);
});

for (const mode of ["success-false", "total-estimado", "total-mudou", "id-repetido", "municipio-errado"]) {
  test(`CKAN recusa ${mode} e não declara cobertura`, async () => {
    const { sandbox: s } = await load(null, url => {
      const offset = Number(url.searchParams.get("offset"));
      if (mode === "success-false") return json({ success: false });
      if (mode === "total-estimado") return json({ success: true, result: { records: [], total: 0, total_was_estimated: true } });
      if (mode === "municipio-errado") return ckan([{ _id: 1, municipio: "Outro" }]);
      if (offset === 0) return ckan(Array.from({ length: 100 }, (_, i) => ({ _id: i + 1, municipio: "Piracanjuba" })), 101);
      return ckan([{ _id: 1, municipio: "Piracanjuba" }], mode === "total-mudou" ? 102 : 101);
    });
    await assert.rejects(() => s.readHealthSource("fixture", "municipio", "Piracanjuba"));
  });
}

test("falha em taxa de gestantes preserva também todos os demais indicadores HIV", async () => {
  const { handler, calls, log } = await load("sync-saude-hiv-casos", url => url.searchParams.get("resource_id") === "03cc41bf-4aa6-4f93-86d9-5cc375bf18a3" ? new Response("", { status: 503 }) : hiv(url));
  assert.equal((await handler(request())).status, 500);
  assert.equal(calls.rpc.length, 0); assert.equal(log.status, "error");
});
