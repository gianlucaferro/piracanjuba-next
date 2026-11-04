import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";
import { test } from "node:test";

const base = new URL("../supabase/functions/", import.meta.url);
const slugs = ["import-folha-manual", "import-folha-xlsx", "sync-prefeitura-diaria", "sync-prefeitura-mensal"];
const serviceHeaders = { Authorization: "Bearer fixture-service" };
const jsonRequest = (body, headers = serviceHeaders, suffix = "") => new Request(`https://fixture.invalid/${suffix}`, {
  method: "POST", headers, body: JSON.stringify(body),
});

async function load(slug, { client, fetcher, env = {}, extra = {} } = {}) {
  const calls = { clients: 0, fetch: [], logs: [], timeouts: [] };
  const context = vm.createContext({
    Request, Response, Headers, URL, TextEncoder, TextDecoder, Uint8Array,
    AbortController, setTimeout, clearTimeout,
    AbortSignal: { timeout: ms => { calls.timeouts.push(ms); return new AbortController().signal; } },
    console: Object.fromEntries(["log", "warn", "error"].map(level => [level, (...parts) => calls.logs.push(parts.join(" "))])),
    Deno: {
      env: { get: key => ({ SUPABASE_URL: "https://fixture.invalid", SUPABASE_SERVICE_ROLE_KEY: "fixture-service", CRON_SECRET: "fixture-cron", CENTI_INGEST_SECRET: "fixture-ingest", ...env })[key] },
      serve: handler => { context.handler = handler; },
    },
    createClient: () => {
      calls.clients++;
      if (!client) throw new Error("Banco inesperado no teste");
      return client;
    },
    fetch: async (url, options) => {
      calls.fetch.push({ url, options });
      if (!fetcher) throw new Error("Rede inesperada no teste");
      return fetcher(url, options);
    },
    ...extra,
  });
  const files = ["_shared/service-role-auth.ts", "_shared/admin-session-auth.ts", "_shared/push-caller-auth.ts", "_shared/servidor-origin.ts", "_shared/persistence-guards.ts", `${slug}/index.ts`];
  for (const file of files) {
    const source = await readFile(new URL(file, base), "utf8");
    const stripped = source.replace(/^import[\s\S]*?;\n/gm, "").replace(/^export /gm, "");
    vm.runInContext(stripTypeScriptTypes(stripped), context, { filename: file });
  }
  return { context, calls, handler: context.handler };
}

for (const slug of slugs) {
  test(`${slug}: recusa visitante, anon e credencial parcial antes de ler corpo ou acessar serviços`, async () => {
    const { handler, calls } = await load(slug);
    for (const headers of [{}, { Authorization: "Bearer fixture-anon", apikey: "fixture-anon" }, { Authorization: "Bearer prefix-fixture-service-suffix" }, { "x-cron-secret": "incorreto" }]) {
      let read = false;
      const req = { method: "POST", headers: new Headers(headers), get body() { read = true; throw new Error("Não pode ler corpo"); } };
      assert.equal((await handler(req)).status, 401);
      assert.equal(read, false);
    }
    assert.equal(calls.clients, 0);
    assert.equal(calls.fetch.length, 0);
  });

  test(`${slug}: diagnóstico com serviço ou cron é autenticado e não executa coleta`, async () => {
    const { handler, calls } = await load(slug);
    for (const headers of [serviceHeaders, { apikey: "fixture-service" }, { "x-cron-secret": "fixture-cron" }]) {
      const response = await handler(jsonRequest({ dry_run: true }, headers));
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { success: true, dry_run: true });
    }
    assert.equal(calls.clients, 0);
    assert.equal(calls.fetch.length, 0);
  });

  test(`${slug}: OPTIONS é público e outros métodos não executam negócio`, async () => {
    const { handler, calls } = await load(slug);
    assert.equal((await handler(new Request("https://fixture.invalid", { method: "OPTIONS" }))).status, 204);
    assert.equal((await handler(new Request("https://fixture.invalid", { method: "GET", headers: serviceHeaders }))).status, 405);
    assert.equal(calls.clients, 0);
    assert.equal(calls.fetch.length, 0);
  });

  test(`${slug}: limite é aplicado ao stream real mesmo com Content-Length falso`, async () => {
    const { handler, calls } = await load(slug);
    const limit = slug === "import-folha-manual" ? 4 * 1024 * 1024 : 8 * 1024;
    let cancelled = false;
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"pad":"'));
        controller.enqueue(new Uint8Array(limit + 1));
      },
      cancel() { cancelled = true; },
    });
    const request = new Request("https://fixture.invalid", { method: "POST", headers: { ...serviceHeaders, "Content-Length": "1" }, body: stream, duplex: "half" });
    assert.equal((await handler(request)).status, 413);
    assert.equal(cancelled, true);
    assert.equal(calls.clients, 0);
    assert.equal(calls.fetch.length, 0);
  });

  test(`${slug}: JSON e dry_run inválidos falham antes do banco`, async () => {
    const { handler, calls } = await load(slug);
    for (const body of ["{", "[]", "null", '{"dry_run":"true"}']) {
      assert.equal((await handler(new Request("https://fixture.invalid", { method: "POST", headers: serviceHeaders, body }))).status, 400);
    }
    assert.equal(calls.clients, 0);
    assert.equal(calls.fetch.length, 0);
  });

  test(`${slug}: segredo de serviço ausente nunca autoriza negócio via cron`, async () => {
    const { handler, calls } = await load(slug, { env: { SUPABASE_SERVICE_ROLE_KEY: undefined } });
    assert.equal((await handler(jsonRequest({ dry_run: true }, { "x-cron-secret": "fixture-cron" }))).status, 503);
    assert.equal(calls.clients, 0);
    assert.equal(calls.fetch.length, 0);
  });
}

test("somente a rotina mensal mantém a autenticação Centi", async () => {
  for (const slug of slugs) {
    const { handler, calls } = await load(slug);
    const response = await handler(jsonRequest({ dry_run: true }, { "x-centi-ingest-secret": "fixture-ingest" }));
    assert.equal(response.status, slug === "sync-prefeitura-mensal" ? 200 : 401);
    assert.equal(calls.clients, 0);
    assert.equal(calls.fetch.length, 0);
  }
});

test("prévia mensal legada continua disponível somente após autenticação", async () => {
  const { context, handler, calls } = await load("sync-prefeitura-mensal", { client: {} });
  let discoveries = 0;
  context.descobrirCompetenciaMaisRecente = async () => {
    discoveries++;
    return { competencia: "2026-10", mes: 10, ano: 2026, totalFonte: 1, countsPorOrgao: { 22: 1 }, forced: true };
  };
  assert.equal((await handler(jsonRequest({}, {}, "?dry_run=1"))).status, 401);
  assert.equal(discoveries, 0);
  const preview = await handler(jsonRequest({}, serviceHeaders, "?dry_run=1&orgao=22"));
  assert.equal(preview.status, 200);
  assert.equal((await preview.json()).detected.competencia, "2026-10");
  assert.equal(discoveries, 1);
  assert.equal(calls.clients, 1);
  assert.equal(calls.fetch.length, 0);
});

function payrollClient() {
  const writes = [];
  const servers = new Map();
  return {
    writes,
    from(table) {
      let operation = "read";
      let values;
      let origins = [];
      return {
        upsert(rows) { operation = "upsert"; values = rows; return this; },
        insert(rows) { operation = "insert"; values = rows; return this; },
        select() { return this; },
        in(column, values) { assert.equal(column, "origem_chave"); origins = values; return this; },
        then(resolve, reject) {
          if (operation !== "read") writes.push({ table, operation, values: JSON.parse(JSON.stringify(values)) });
          if (table === "servidores" && operation === "upsert") {
            for (const row of values) servers.set(row.origem_chave, { ...row, id: "fixture-server" });
          }
          const data = table === "servidores" && operation === "read"
            ? origins.map(key => servers.get(key))
            : table === "remuneracao_servidores" ? values.map(() => ({ id: "fixture-rem" })) : null;
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        },
      };
    },
  };
}

for (const slug of ["import-folha-manual", "import-folha-xlsx"]) {
  for (const delivery of ["success", "http-failure", "network-failure"]) {
    test(`${slug}: folha é preservada e push usa serviço quando entrega=${delivery}`, async () => {
      const client = payrollClient();
      const { handler, calls } = await load(slug, {
        client,
        extra: { XLSX: {
          read: () => ({ SheetNames: ["fixture"], Sheets: { fixture: {} } }),
          utils: { sheet_to_json: () => [["Matrícula", "Nome", "Cargo", "Total proventos", "Descontos"], ["101", "Pessoa Fixture", "Professor", 100, 10]] },
        } },
        fetcher: url => {
          if (url === "https://sheet.invalid/fixture.xlsx") return new Response(new Uint8Array([1]));
          if (delivery === "network-failure") throw new Error("Falha que contém fixture-service e conteúdo privado");
          return new Response("conteúdo privado do fornecedor", { status: delivery === "http-failure" ? 503 : 200 });
        },
      });
      const body = { competencia: "2026-10", orgao_tipo: "prefeitura", ...(slug === "import-folha-manual"
        ? { registros: [{ matricula: "101", nome: "Pessoa Fixture", cargo: "Professor", total_proventos: 100, total_descontos: 10 }] }
        : { file_url: "https://sheet.invalid/fixture.xlsx" }) };
      const response = await handler(jsonRequest(body));
      assert.equal(response.status, 200);
      assert.equal((await response.json()).success, true);
      assert.equal(client.writes.filter(write => write.table === "remuneracao_servidores").length, 1);
      const rem = client.writes.find(write => write.table === "remuneracao_servidores").values[0];
      assert.equal(rem.bruto, 100);
      assert.equal(rem.liquido, 90);
      assert.equal(rem.tipo_folha, "NORMAL");
      const notifications = calls.fetch.filter(call => call.url.endsWith("/send-push"));
      assert.equal(notifications.length, 1);
      const { url, options } = notifications[0];
      assert.equal(url, "https://fixture.invalid/functions/v1/send-push");
      assert.equal(options.headers.Authorization, "Bearer fixture-service");
      assert.equal(options.headers.apikey, "fixture-service");
      assert.ok(options.signal);
      assert.deepEqual(JSON.parse(options.body), {
        title: "💰 Folha de Outubro/2026 disponível",
        body: "A folha de pagamento de Outubro já está disponível com 1 registros.",
        topic: "geral", url: "/prefeitura", dedup_key: "folha_2026-10",
      });
      assert.ok(client.writes.find(write => write.table === "sync_log" && write.values.status === "success"));
      if (delivery === "success") assert.ok(calls.logs.every(log => !log.includes("Notificação push")));
      assert.deepEqual(calls.timeouts, [75_000]);
      assert.ok(calls.logs.every(log => !log.includes("fixture-service") && !log.includes("conteúdo privado")));
      if (delivery === "http-failure") assert.ok(calls.logs.some(log => log.includes("HTTP 503")));
      if (delivery === "network-failure") assert.ok(calls.logs.some(log => log.includes("tempo limite")));
    });
  }
}
