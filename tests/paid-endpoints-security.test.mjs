import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { webcrypto } from "node:crypto";
import vm from "node:vm";
import { test } from "node:test";

const base = new URL("../supabase/functions/", import.meta.url);
async function sandbox({ slug, client = {}, fetcher, env = {}, extra = {} } = {}) {
  const calls = { client: 0, fetch: [], rpc: [] };
  const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} }, Request, Response, Headers, URL,
    TextEncoder, TextDecoder, Uint8Array, AbortSignal, crypto: webcrypto,
    setTimeout: callback => { callback(); return 0; },
    corsHeaders: { "Access-Control-Allow-Origin": "*" },
    buildBenefitContextRows: () => [],
    Deno: {
      env: { get: key => ({ SUPABASE_URL: "https://fixture.invalid", SUPABASE_SERVICE_ROLE_KEY: "fixture-service", CRON_SECRET: "fixture-cron", GEMINI_API_KEY: "fixture-ai", ...env })[key] },
      serve: handler => { context.handler = handler; },
    },
    createClient: () => { calls.client++; return client; },
    fetch: async (url, options) => {
      calls.fetch.push({ url, options });
      if (!fetcher) throw new Error("Chamada externa inesperada no teste");
      return fetcher(url, options);
    },
    ...extra,
  });
  for (const name of ["_shared/service-role-auth.ts", "_shared/admin-session-auth.ts", "_shared/ratelimit.ts", ...(slug ? [slug + "/index.ts"] : [])]) {
    const text = await readFile(new URL(name, base), "utf8");
    const stripped = text.replace(/^import[\s\S]*?;\n/gm, "").replace(/^export /gm, "");
    vm.runInContext(stripTypeScriptTypes(stripped), context, { filename: name });
  }
  return { context, calls };
}
const request = (body, headers = {}) => new Request("https://fixture.invalid", {
  method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body),
});

for (const [label, result] of [
  ["erro", { data: { allowed: true }, error: { message: "falha" } }],
  ["nulo", { data: null, error: null }],
  ["vazio", { data: {}, error: null }],
  ["string", { data: { allowed: "true" }, error: null }],
  ["array", { data: [{ allowed: true }], error: null }],
  ["negação inválida", { data: { allowed: false }, error: null }],
]) {
  test("guard não libera geração com " + label, async () => {
    const { context } = await sandbox();
    const resultGuard = await context.aiGuard({ rpc: async () => result }, request({}), "fixture");
    assert.equal(resultGuard.allowed, false);
    const response = context.guardBlockedResponse(resultGuard);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error_code, "quota_unavailable");
  });
}
test("guard bloqueia exceção e preserva respostas de quota válida", async () => {
  const { context } = await sandbox();
  const denied = await context.aiGuard({ rpc: async () => { throw new Error("offline"); } }, request({}), "fixture");
  assert.equal(denied.allowed, false);
  for (const reason of ["rate", "budget"]) {
    const decision = await context.aiGuard({ rpc: async () => ({ data: { allowed: false, reason }, error: null }) }, request({}), "fixture");
    assert.equal(context.guardBlockedResponse(decision).status, 429);
  }
  const allowed = await context.aiGuard({ rpc: async () => ({ data: { allowed: true }, error: null }) }, request({}), "fixture");
  assert.equal(allowed.allowed, true);
});

for (const slug of ["backfill-servidor-resumos", "analyze-contrato-risco"]) {
  test(slug + " recusa visitante e chave anon antes de banco ou IA", async () => {
    const { context, calls } = await sandbox({ slug });
    for (const headers of [{}, { Authorization: "Bearer fixture-anon", apikey: "fixture-anon" }]) {
      const response = await context.handler(request({ dry_run: true }, headers));
      assert.equal(response.status, 401);
    }
    assert.equal(calls.client, 0);
    assert.equal(calls.fetch.length, 0);
  });
  test(slug + " permite diagnóstico interno sem executar negócio", async () => {
    const { context, calls } = await sandbox({ slug });
    for (const headers of [{ "x-cron-secret": "fixture-cron" }, { Authorization: "Bearer fixture-service" }]) {
      const response = await context.handler(request({ dry_run: true }, headers));
      assert.equal(response.status, 200);
      assert.equal((await response.json()).dry_run, true);
    }
    assert.equal(calls.client, 0);
    assert.equal(calls.fetch.length, 0);
  });
  test(slug + " rejeita corpo excessivo e JSON malformado autorizado", async () => {
    const { context, calls } = await sandbox({ slug });
    assert.equal((await context.handler(request({ pad: "x".repeat(8200) }, { "x-cron-secret": "fixture-cron" }))).status, 413);
    assert.equal((await context.handler(new Request("https://fixture.invalid", { method: "POST", headers: { "x-cron-secret": "fixture-cron" }, body: "{" }))).status, 400);
    assert.equal(calls.fetch.length, 0);
  });
}

test("ai-search bloqueia quota antes das leituras de contexto e do fornecedor", async () => {
  let reads = 0;
  const { context, calls } = await sandbox({ slug: "ai-search", client: {
    rpc: async () => ({ data: null, error: { message: "offline" } }),
    from: () => { reads++; throw new Error("Contexto não deveria ser lido"); },
  } });
  const response = await context.handler(request({ question: "Como estão as obras?" }));
  assert.equal(response.status, 503);
  assert.equal(reads, 0);
  assert.equal(calls.fetch.length, 0);
});

test("ai-search valida pergunta e corpo antes da quota", async () => {
  let reservations = 0;
  const { context } = await sandbox({ slug: "ai-search", client: { rpc: async () => { reservations++; throw new Error("Não deveria reservar"); } } });
  assert.equal((await context.handler(request({ question: "" }))).status, 400);
  assert.equal((await context.handler(request({ question: "a".repeat(4001) }))).status, 400);
  assert.equal((await context.handler(request({ question: "ok", pad: "a".repeat(16384) }))).status, 413);
  assert.equal(reservations, 0);
});

test("backfill mantém lote e encadeamento privado e para em quota indisponível", async () => {
  let queries = 0;
  const { context, calls } = await sandbox({ slug: "backfill-servidor-resumos", client: {
    rpc: async (_name, args) => {
      queries++;
      assert.ok(args.lim === 10 || args.lim === 100000);
      return { data: args.lim === 10 ? [{ id: "fixture-id" }, { id: "outro" }] : [], error: null };
    },
  }, fetcher: async (_url, options) => {
    assert.equal(options.headers.Authorization, "Bearer fixture-service");
    return new Response("{}", { status: 503 });
  } });
  const response = await context.handler(request({ batch_size: 10 }, { "x-cron-secret": "fixture-cron" }));
  assert.equal(response.status, 503);
  const result = await response.json();
  assert.equal(result.quotaParou, true);
  assert.equal(result.success, false);
  assert.equal(calls.fetch.length, 1);
  assert.equal(queries, 2);
});

function summaryClient(cached, quotaError) {
  const reads = [];
  return {
    reads,
    rpc: async () => {
      if (cached) throw new Error("Cache não deve consumir quota");
      return { data: null, error: quotaError };
    },
    from(table) {
      reads.push(table);
      const data = table === "servidores" ? { nome: "Fixture", cargo: "Professor" }
        : table === "remuneracao_servidores" ? [{ competencia: "2026-10", bruto: 100, liquido: 90 }]
        : cached ? { resumo: "Resumo em cache" } : null;
      return { select() { return this; }, eq() { return this; }, order() { return this; }, limit() { return this; },
        single: async () => ({ data, error: null }), maybeSingle: async () => ({ data, error: null }),
        then(resolve, reject) { return Promise.resolve({ data, error: null }).then(resolve, reject); } };
    },
  };
}
const serverId = "123e4567-e89b-12d3-a456-426614174000";
test("resumo em cache continua público e não chama quota nem provedor", async () => {
  const { context, calls } = await sandbox({ slug: "summarize-servidor", client: summaryClient(true) });
  const response = await context.handler(request({ servidor_id: serverId }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).cached, true);
  assert.equal(calls.fetch.length, 0);
});
test("resumo sem cache bloqueia geração quando quota falha", async () => {
  const { context, calls } = await sandbox({ slug: "summarize-servidor", client: summaryClient(false, { message: "offline" }) });
  const response = await context.handler(request({ servidor_id: serverId }));
  assert.equal(response.status, 503);
  assert.equal(calls.fetch.length, 0);
});
test("visitante não altera provider ou modelo de resumo", async () => {
  const { context, calls } = await sandbox({ slug: "summarize-servidor" });
  for (const override of [{ provider: "gemini" }, { model: "modelo-caro" }]) {
    assert.equal((await context.handler(request({ servidor_id: serverId, ...override }))).status, 403);
  }
  assert.equal(calls.client, 0);
});

test("análise administrativa sinaliza 503 sem pagar quando quota fica indisponível", async () => {
  const client = {
    rpc: async () => ({ data: null, error: { message: "offline" } }),
    from(table) {
      const data = table === "contratos" ? [{ id: "fixture", numero: "1", vigencia_inicio: "2025-01-01", empresa: "Fixture", valor: 10 }] : [];
      return { select() { return this; }, order() { return this; }, range() { return this; }, eq() { return this; },
        then(resolve, reject) { return Promise.resolve({ data, error: null }).then(resolve, reject); } };
    },
  };
  const { context, calls } = await sandbox({ slug: "analyze-contrato-risco", client });
  const response = await context.handler(request({ desde: "2025-01-01", batch_size: 12 }, { "x-cron-secret": "fixture-cron" }));
  assert.equal(response.status, 503);
  const result = await response.json();
  assert.equal(result.success, false);
  assert.equal(result.stopped_reason, "unavailable");
  assert.equal(result.analyzed, 0);
  assert.equal(calls.fetch.length, 0);
});

test("chatbot com quota indisponível não grava pergunta nem monta contexto", async () => {
  const reads = [];
  const client = {
    rpc: async () => ({ data: null, error: { message: "offline" } }),
    from(table) {
      reads.push(table);
      return { select() { return this; }, eq() { return this; }, gte: async () => ({ count: 0, error: null }),
        insert() { throw new Error("Não deve gravar quando não reservou quota"); } };
    },
  };
  const { context, calls } = await sandbox({ slug: "chatbot", client });
  const response = await context.handler(request({ question: "Quais obras foram concluídas?" }));
  assert.equal(response.status, 503);
  assert.deepEqual(reads, ["chatbot_consultas"]);
  assert.equal(calls.fetch.length, 0);
});
