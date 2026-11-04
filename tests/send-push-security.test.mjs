import assert from "node:assert/strict";
import { createECDH } from "node:crypto";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";
import { test } from "node:test";

const base = new URL("../supabase/functions/", import.meta.url);
const keyPair = createECDH("prime256v1");
keyPair.setPrivateKey(Buffer.alloc(32, 1));
const p256dh = keyPair.getPublicKey().toString("base64url");
const auth = Buffer.alloc(16, 2).toString("base64url");
const validMessage = { title: "Folha disponível", body: "Acesse os dados oficiais.", url: "/prefeitura", dedup_key: "folha_2026-10" };
const serviceHeaders = { Authorization: "Bearer fixture-service" };
const request = (body = validMessage, headers = serviceHeaders) => new Request("https://fixture.invalid/send-push", {
  method: "POST", headers, body: JSON.stringify(body),
});
const subscription = (i = 0, overrides = {}) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
  endpoint: `https://fcm.googleapis.com/fcm/send/fixture-${i}`,
  keys_p256dh: p256dh, keys_auth: auth, ...overrides,
});

async function loadPolicy() {
  const logs = [];
  const timers = new Set();
  const context = vm.createContext({
    Request, Response, Headers, URL, TextEncoder, TextDecoder, Uint8Array, AbortController,
    fetch: () => { throw new Error("Nenhuma rede real permitida no teste"); },
    setTimeout: (callback, ms) => {
      const id = setTimeout(() => { timers.delete(id); callback(); }, ms);
      timers.add(id);
      return id;
    },
    clearTimeout: id => { timers.delete(id); clearTimeout(id); },
    console: Object.fromEntries(["log", "warn", "error"].map(level => [level, (...args) => logs.push(args.map(value => typeof value === "string" ? value : JSON.stringify(value)).join(" "))])),
  });
  for (const file of ["_shared/service-role-auth.ts", "_shared/admin-session-auth.ts", "_shared/send-push-policy.ts"]) {
    const source = await readFile(new URL(file, base), "utf8");
    const stripped = source.replace(/^import[\s\S]*?;\n/gm, "").replace(/^export /gm, "");
    vm.runInContext(stripTypeScriptTypes(stripped), context, { filename: file });
  }
  return { context, logs, timers };
}

async function fixture({ subscriptions = [subscription()], duplicate = false, storeError, sender, senderConfigError = false, cleanupError = false, recordError = false, serviceKey = "fixture-service", cronSecret = "fixture-cron" } = {}) {
  const runtime = await loadPolicy();
  const calls = { stores: 0, senders: 0, duplicate: [], loads: [], sends: [], expired: [], records: [] };
  const handler = runtime.context.createSendPushHandler({
    getServiceRoleKey: () => serviceKey,
    getCronSecret: () => cronSecret,
    now: () => 1_794_000_000_000,
    createStore: key => {
      calls.stores++;
      assert.equal(key, "fixture-service");
      return {
        async findDuplicate(key) {
          calls.duplicate.push(key);
          if (storeError === "duplicate") throw new Error("segredo-interno-fixture");
          return duplicate;
        },
        async loadSubscriptions(topic, limit) {
          calls.loads.push({ topic, limit });
          if (storeError === "load") throw new Error("segredo-interno-fixture");
          return subscriptions;
        },
        async removeExpired(ids) {
          calls.expired.push(Array.from(ids));
          if (cleanupError) throw new Error("segredo-interno-fixture");
        },
        async recordDelivery(key, details) {
          calls.records.push({ key, details: JSON.parse(JSON.stringify(details)) });
          if (recordError) throw new Error("segredo-interno-fixture");
        },
      };
    },
    createSender: () => {
      calls.senders++;
      if (senderConfigError) throw new Error("segredo-interno-fixture configuração VAPID");
      return async (sub, payload) => {
        calls.sends.push({ sub, payload: JSON.parse(payload) });
        return sender ? sender(sub, payload) : 201;
      };
    },
  });
  return { ...runtime, handler, calls };
}

test("send-push recusa visitantes, anon, sessão administrativa e credenciais parciais antes de ler o corpo", async () => {
  const { handler, calls } = await fixture();
  for (const headers of [{}, { Authorization: "Bearer fixture-anon", apikey: "fixture-anon" }, { Authorization: "Bearer prefix-fixture-service" }, { "x-cron-secret": "errado" }, { "x-admin-token": "a".repeat(64) }]) {
    let read = false;
    const req = { method: "POST", headers: new Headers(headers), get body() { read = true; throw new Error("Não ler corpo"); } };
    assert.equal((await handler(req)).status, 401);
    assert.equal(read, false);
  }
  assert.equal(calls.stores, 0);
  assert.equal(calls.senders, 0);
});

test("dry_run autenticado e OPTIONS não criam store nem sender; GET é recusado", async () => {
  const { handler, calls } = await fixture();
  assert.equal((await handler(new Request("https://fixture.invalid", { method: "OPTIONS" }))).status, 204);
  for (const headers of [serviceHeaders, { apikey: "fixture-service" }, { "x-cron-secret": "fixture-cron" }]) {
    const result = await handler(request({ dry_run: true }, headers));
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), { success: true, dry_run: true });
  }
  assert.equal((await handler(new Request("https://fixture.invalid", { method: "GET", headers: serviceHeaders }))).status, 405);
  assert.equal(calls.stores, 0);
  assert.equal(calls.senders, 0);
});

test("check_config autenticado valida sender sem criar store nem enviar mensagens", async () => {
  const { handler, calls } = await fixture();
  for (const headers of [serviceHeaders, { apikey: "fixture-service" }, { "x-cron-secret": "fixture-cron" }]) {
    const response = await handler(request({ dry_run: true, check_config: true }, headers));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true, dry_run: true, configuration_valid: true });
  }
  assert.equal(calls.senders, 3);
  assert.equal(calls.stores, 0);
  assert.equal(calls.sends.length, 0);
});

test("check_config permanece privado e não aceita flag verdadeira fora de dry_run", async () => {
  const { handler, calls } = await fixture();
  for (const headers of [{}, { Authorization: "Bearer fixture-anon", apikey: "fixture-anon" }]) {
    assert.equal((await handler(request({ dry_run: true, check_config: true }, headers))).status, 401);
  }
  for (const body of [
    { ...validMessage, check_config: true },
    { ...validMessage, dry_run: false, check_config: true },
    { dry_run: true, check_config: "true" },
    { dry_run: true, check_config: null },
    { dry_run: true, check_config: 1 },
  ]) assert.equal((await handler(request(body))).status, 400);
  assert.equal(calls.senders, 0);
  assert.equal(calls.stores, 0);
  assert.equal(calls.sends.length, 0);
});

test("dry_run simples e check_config=false não verificam VAPID e mantêm resposta original", async () => {
  const { handler, calls } = await fixture({ senderConfigError: true });
  for (const body of [{ dry_run: true }, { dry_run: true, check_config: false }]) {
    const response = await handler(request(body));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true, dry_run: true });
  }
  assert.equal(calls.senders, 0);
  assert.equal(calls.stores, 0);
  assert.equal(calls.sends.length, 0);
});

test("falha de configuração retorna 503 sanitizado sem banco ou entrega", async () => {
  const { handler, calls, logs } = await fixture({ senderConfigError: true });
  const response = await handler(request({ dry_run: true, check_config: true }));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "push_configuration_unavailable", sent: 0 });
  assert.equal(calls.senders, 1);
  assert.equal(calls.stores, 0);
  assert.equal(calls.sends.length, 0);
  assert.ok(logs.every(log => !log.includes("segredo-interno-fixture")));
});

test("cron sem chave de serviço configurada falha fechado", async () => {
  const { handler, calls } = await fixture({ serviceKey: "" });
  assert.equal((await handler(request({ dry_run: true }, { "x-cron-secret": "fixture-cron" }))).status, 503);
  assert.equal(calls.stores, 0);
  assert.equal(calls.sends.length, 0);
});

test("corpo real acima de 8 KiB é recusado mesmo sem Content-Length confiável", async () => {
  const { handler, calls } = await fixture();
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(8193)); },
    cancel() { cancelled = true; },
  });
  const req = new Request("https://fixture.invalid", { method: "POST", headers: { ...serviceHeaders, "Content-Length": "1" }, body: stream, duplex: "half" });
  assert.equal((await handler(req)).status, 413);
  assert.equal(cancelled, true);
  assert.equal(calls.stores, 0);
});

test("limites de campos e payload UTF-8 são verificados antes de store ou sender", async () => {
  const invalid = [
    { title: "" }, { title: 7 }, { title: "a".repeat(201) },
    { body: " " }, { body: "a".repeat(2001) },
    { topic: "a".repeat(101) }, { dedup_key: "a".repeat(201) },
    { body: "界".repeat(1500) }, { dry_run: "true" },
  ];
  const { handler, calls } = await fixture();
  for (const delta of invalid) assert.equal((await handler(request({ ...validMessage, ...delta }))).status, 400);
  for (const raw of ["{", "[]", "null"]) {
    assert.equal((await handler(new Request("https://fixture.invalid", { method: "POST", headers: serviceHeaders, body: raw }))).status, 400);
  }
  assert.equal(calls.stores, 0);
  assert.equal(calls.sends.length, 0);
});

test("URLs de notificação ficam no domínio canônico e nunca aceitam navegação externa", async () => {
  const { handler, calls } = await fixture();
  for (const url of ["//evil.invalid", "https://evil.invalid", "https://piracanjuba.ai.evil.invalid", "https://user:pass@piracanjuba.ai/", "javascript:alert(1)", "/\\evil.invalid", "/\nadmin", "https://piracanjuba.ai//evil.invalid"]) {
    assert.equal((await handler(request({ ...validMessage, url }))).status, 400, url);
  }
  assert.equal(calls.sends.length, 0);
  const result = await handler(request({ ...validMessage, url: "https://piracanjuba.ai/prefeitura?ano=2026#folha" }));
  assert.equal(result.status, 200);
  assert.equal(calls.sends[0].payload.url, "/prefeitura?ano=2026#folha");
});

test("broadcast mantém inscrições e topic é passado ao store sem alterar conteúdo", async () => {
  const { handler, calls } = await fixture();
  const broadcast = { title: "Alerta de sincronização", body: "Verifique o painel.", url: "/admin" };
  assert.equal((await handler(request(broadcast))).status, 200);
  assert.deepEqual(calls.loads[0], { topic: undefined, limit: 201 });
  assert.equal(calls.duplicate.length, 0);
  assert.equal(calls.records.length, 0);
  assert.equal(calls.sends[0].payload.url, "/admin");
  assert.equal(calls.sends[0].payload.icon, "/favicon.png");
  assert.equal(calls.sends[0].payload.timestamp, 1_794_000_000_000);
  assert.equal((await handler(request({ ...validMessage, topic: "geral" }))).status, 200);
  assert.deepEqual(calls.loads[1], { topic: "geral", limit: 201 });
  assert.equal(calls.records[0].details.topic, "geral");
});

test("até 200 inscrições são processadas uma vez, com concorrência máxima 20", async () => {
  let active = 0;
  let maximum = 0;
  const { handler, calls } = await fixture({ subscriptions: Array.from({ length: 200 }, (_, i) => subscription(i)), sender: async () => {
    active++;
    maximum = Math.max(maximum, active);
    await new Promise(resolve => setImmediate(resolve));
    active--;
    return 201;
  } });
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { sent: 200, failed: 0, expired_cleaned: 0 });
  assert.equal(new Set(calls.sends.map(call => call.sub.id)).size, 200);
  assert.equal(maximum, 20);
  assert.equal(active, 0);
  assert.equal(calls.records.length, 1);
});

test("201 inscrições bloqueiam o lote inteiro antes de qualquer envio", async () => {
  const { handler, calls } = await fixture({ subscriptions: Array.from({ length: 201 }, (_, i) => subscription(i)) });
  const response = await handler(request());
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "fanout_limit_exceeded", sent: 0 });
  assert.deepEqual(calls.loads[0], { topic: undefined, limit: 201 });
  assert.equal(calls.senders, 0);
  assert.equal(calls.sends.length, 0);
});

test("deduplicação e ausência de inscrições preservam as respostas legadas", async () => {
  for (const duplicate of [true, false]) {
    const { handler, calls } = await fixture({ duplicate, subscriptions: [] });
    const result = await handler(request());
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), duplicate
      ? { sent: 0, message: "Already notified", dedup_key: "folha_2026-10" }
      : { sent: 0, message: "No subscriptions found" });
    assert.equal(calls.senders, 0);
    assert.equal(calls.records.length, 0);
  }
});

for (const storeError of ["duplicate", "load"]) {
  test(`falha de ${storeError} bloqueia todos os envios sem expor detalhes internos`, async () => {
    const { handler, calls, logs } = await fixture({ storeError });
    const response = await handler(request());
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "push_unavailable", sent: 0 });
    assert.equal(calls.sends.length, 0);
    assert.ok(logs.every(log => !log.includes("segredo-interno-fixture")));
  });
}

test("SSRF e chaves inválidas são ignoradas sem envio nem remoção da inscrição", async () => {
  const subscriptions = [
    subscription(0, { endpoint: "http://127.0.0.1/private" }),
    subscription(1, { endpoint: "https://fcm.googleapis.com.evil.invalid/push" }),
    subscription(2, { endpoint: "https://fcm.googleapis.com@evil.invalid/push" }),
    subscription(3, { keys_p256dh: "inválida" }),
    subscription(4, { keys_auth: "inválida" }),
    subscription(5),
  ];
  const { handler, calls } = await fixture({ subscriptions });
  const result = await handler(request());
  assert.deepEqual(await result.json(), { sent: 1, failed: 5, expired_cleaned: 0, invalid_skipped: 5 });
  assert.deepEqual(calls.sends.map(call => call.sub.id), [subscription(5).id]);
  assert.equal(calls.expired.length, 0);
});

test("respostas parciais contam 2xx e removem apenas 404/410 por ID, sem retry", async () => {
  const statuses = [200, 299, 404, 410, 429, 503];
  const { handler, calls } = await fixture({ subscriptions: statuses.map((_, i) => subscription(i)), sender: sub => statuses[Number(sub.id.slice(-12))] });
  const result = await handler(request());
  assert.deepEqual(await result.json(), { sent: 2, failed: 4, expired_cleaned: 2 });
  assert.deepEqual(calls.expired.flat().sort(), [subscription(2).id, subscription(3).id]);
  assert.equal(calls.sends.length, statuses.length);
  assert.deepEqual(calls.records[0], { key: "folha_2026-10", details: { title: validMessage.title, sent: 2, failed: 4 } });
});

test("falhas de limpeza e registro após entrega retornam contagens e avisos sem recomendar retry", async () => {
  const { handler, calls, logs } = await fixture({ subscriptions: [subscription(0), subscription(1)], sender: sub => sub.id === subscription(0).id ? 201 : 410, cleanupError: true, recordError: true });
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { sent: 1, failed: 1, expired_cleaned: 0, warnings: ["expired_cleanup_failed", "dedup_log_failed"] });
  assert.equal(calls.sends.length, 2);
  assert.equal(calls.records.length, 1);
  assert.ok(logs.every(log => !log.includes("segredo-interno-fixture")));
});

test("erro do sender fica sanitizado e nenhum registro de sucesso é criado sem entrega", async () => {
  const { handler, calls, logs } = await fixture({ sender: () => { throw new Error("segredo-interno-fixture"); } });
  const result = await handler(request());
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { sent: 0, failed: 1, expired_cleaned: 0 });
  assert.equal(calls.records.length, 0);
  assert.equal(calls.sends.length, 1);
  assert.ok(logs.every(log => !log.includes("segredo-interno-fixture")));
});

const details = { endpoint: "https://fcm.googleapis.com/fcm/send/fixture", method: "POST", headers: { TTL: 86400 }, body: new Uint8Array([1, 2, 3]) };

test("transporte limita destinos e método antes de fetch", async () => {
  const { context, timers } = await loadPolicy();
  let fetched = 0;
  for (const delta of [
    { method: "GET" }, { endpoint: "https://127.0.0.1/private" },
    { endpoint: "http://fcm.googleapis.com/push" }, { endpoint: "https://fcm.googleapis.com:444/push" },
    { endpoint: "https://user:pass@fcm.googleapis.com/push" }, { endpoint: "https://fcm.googleapis.com/push#fragment" },
  ]) {
    await assert.rejects(context.sendWebPushRequest({ ...details, ...delta }, async () => { fetched++; return new Response(null); }));
  }
  assert.equal(fetched, 0);
  assert.equal(timers.size, 0);
  for (const endpoint of ["https://fcm.googleapis.com/send", "https://updates.push.services.mozilla.com/wpush/v2/fixture", "https://web.push.apple.com/fixture", "https://wns2.notify.windows.com/fixture"]) {
    assert.equal(context.isAllowedPushEndpoint(endpoint), true);
  }
});

test("transporte usa redirect:error, descarta corpo e cancela timer após sucesso", async () => {
  const { context, timers } = await loadPolicy();
  let fetched;
  let cancelled = false;
  const status = await context.sendWebPushRequest(details, async (url, options) => {
    fetched = { url, options };
    return new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array([1])); }, cancel() { cancelled = true; } }), { status: 201 });
  });
  assert.equal(status, 201);
  assert.equal(fetched.url, details.endpoint);
  assert.equal(fetched.options.redirect, "error");
  assert.equal(fetched.options.method, "POST");
  assert.equal(fetched.options.headers.get("TTL"), "86400");
  assert.deepEqual(Array.from(fetched.options.body), [1, 2, 3]);
  assert.equal(fetched.options.signal.aborted, true);
  assert.equal(cancelled, true);
  assert.equal(timers.size, 0);
});

test("transporte aborta timeout e não mantém timers pendentes", async () => {
  const { context, timers } = await loadPolicy();
  let aborted = false;
  const fetcher = (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => { aborted = true; reject(new Error("AbortError fixture")); }, { once: true });
  });
  await assert.rejects(context.sendWebPushRequest(details, fetcher, 5), /AbortError/);
  assert.equal(aborted, true);
  assert.equal(timers.size, 0);
});

test("redirect recusado pelo fetch encerra transporte sem segunda chamada", async () => {
  const { context, timers } = await loadPolicy();
  let calls = 0;
  let observed;
  await assert.rejects(context.sendWebPushRequest(details, async (_url, options) => {
    calls++; observed = options; throw new Error("Redirect recusado");
  }), /Redirect recusado/);
  assert.equal(calls, 1);
  assert.equal(observed.redirect, "error");
  assert.equal(observed.signal.aborted, true);
  assert.equal(timers.size, 0);
});

test("formato VAPID legado em JSON mantém compatibilidade sem expor chave", async () => {
  const { context } = await loadPolicy();
  const key = Buffer.alloc(32, 3).toString("base64url");
  for (const name of ["privateKey", "private_key", "privKey"]) {
    assert.equal(context.cleanVapidPrivateKey(JSON.stringify({ [name]: key })), key);
  }
  assert.equal(context.cleanVapidPrivateKey(`  ${key}=\n`), key);
  for (const value of [undefined, "", "inválida", "{}", "{"]) assert.throws(() => context.cleanVapidPrivateKey(value));
});

test("entrypoint real conecta auth, store limitado, criptografia e transporte sem IO no diagnóstico", async () => {
  const { context, timers } = await loadPolicy();
  const trace = { clients: [], queries: [], vapid: [], generated: [], transport: [] };
  context.AbortSignal = AbortSignal;
  context.Deno = {
    env: { get: key => ({ SUPABASE_URL: "https://fixture.invalid", SUPABASE_SERVICE_ROLE_KEY: "fixture-service", CRON_SECRET: "fixture-cron", VAPID_PRIVATE_KEY: Buffer.alloc(32, 3).toString("base64url") })[key] },
    serve: handler => { context.handler = handler; },
  };
  context.createClient = (url, key, options) => {
    trace.clients.push({ url, key, options });
    return {
      from(table) {
        const query = { table, filters: [] };
        const builder = {
          select(columns) { query.columns = columns; return this; },
          eq(column, value) { query.filters.push([column, value]); return this; },
          order(column) { query.order = column; return this; },
          limit(limit) { query.limit = limit; return this; },
          insert(value) { query.insert = JSON.parse(JSON.stringify(value)); return this; },
          then(resolve, reject) {
            trace.queries.push(query);
            return Promise.resolve({ data: table === "push_subscriptions" ? [subscription()] : [], error: null }).then(resolve, reject);
          },
        };
        return builder;
      },
    };
  };
  context.webpush = {
    setVapidDetails: (...args) => trace.vapid.push(args),
    generateRequestDetails: (...args) => { trace.generated.push(args); return details; },
  };
  context.fetch = async (url, options) => { trace.transport.push({ url, options }); return new Response(null, { status: 201 }); };
  const source = await readFile(new URL("send-push/index.ts", base), "utf8");
  vm.runInContext(stripTypeScriptTypes(source.replace(/^import[\s\S]*?;\n/gm, "")), context, { filename: "send-push/index.ts" });
  assert.equal((await context.handler(request(validMessage, {}))).status, 401);
  assert.equal((await context.handler(request({ dry_run: true }))).status, 200);
  assert.equal(trace.clients.length, 0);
  assert.equal(trace.vapid.length, 0);
  assert.equal(trace.transport.length, 0);
  const configuration = await context.handler(request({ dry_run: true, check_config: true }));
  assert.equal(configuration.status, 200);
  assert.deepEqual(await configuration.json(), { success: true, dry_run: true, configuration_valid: true });
  assert.equal(trace.clients.length, 0);
  assert.equal(trace.vapid.length, 1);
  assert.equal(trace.generated.length, 0);
  assert.equal(trace.transport.length, 0);
  const response = await context.handler(request({ ...validMessage, topic: "geral" }));
  assert.deepEqual(await response.json(), { sent: 1, failed: 0, expired_cleaned: 0 });
  assert.equal(trace.clients[0].key, "fixture-service");
  const subscriptions = trace.queries.find(query => query.table === "push_subscriptions");
  assert.equal(subscriptions.columns, "id, endpoint, keys_p256dh, keys_auth");
  assert.equal(subscriptions.order, "id");
  assert.equal(subscriptions.limit, 201);
  assert.deepEqual(subscriptions.filters, [["topic", "geral"]]);
  assert.equal(trace.generated[0][0].endpoint, subscription().endpoint);
  assert.equal(trace.generated[0][0].keys.p256dh, p256dh);
  assert.equal(trace.generated[0][0].keys.auth, auth);
  assert.equal(JSON.parse(trace.generated[0][1]).url, "/prefeitura");
  assert.equal(trace.generated[0][2].TTL, 86_400);
  assert.equal(trace.transport.length, 1);
  assert.equal(trace.transport[0].options.redirect, "error");
  assert.equal(timers.size, 0);
});

test("fetch do store reconstrói resposta normal e preserva status/headers úteis", async () => {
  const { context, timers } = await loadPolicy();
  let observed;
  const response = await context.fetchPushStore("https://fixture.invalid/rest/v1/push_subscriptions", { method: "GET" }, async (url, options) => {
    observed = { url, options };
    return new Response('[{"id":"fixture"}]', { status: 206, headers: { "content-type": "application/json", "content-length": "999", "content-encoding": "gzip", "content-range": "0-0/1" } });
  });
  assert.equal(response.status, 206);
  assert.deepEqual(await response.json(), [{ id: "fixture" }]);
  assert.equal(response.headers.get("content-type"), "application/json");
  assert.equal(response.headers.get("content-range"), "0-0/1");
  assert.equal(response.headers.has("content-length"), false);
  assert.equal(response.headers.has("content-encoding"), false);
  assert.equal(observed.options.redirect, "error");
  assert.equal(observed.options.signal.aborted, true);
  assert.equal(timers.size, 0);
});

for (const lengthHeader of [undefined, "1"]) {
  test(`fetch do store limita chunks reais quando Content-Length=${lengthHeader ?? "ausente"}`, async () => {
    const { context, timers } = await loadPolicy();
    let cancelled = false;
    let signal;
    const fetcher = async (_url, options) => {
      signal = options.signal;
      return new Response(new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(100));
          controller.enqueue(new Uint8Array(1_048_576));
        },
        cancel() { cancelled = true; },
      }), { headers: lengthHeader === undefined ? {} : { "content-length": lengthHeader } });
    };
    await assert.rejects(context.fetchPushStore("https://fixture.invalid/rest/v1/push_subscriptions", {}, fetcher));
    assert.equal(cancelled, true);
    assert.equal(signal.aborted, true);
    assert.equal(timers.size, 0);
  });
}

test("fetch do store recusa tamanho declarado excessivo e cancela corpo sem lê-lo", async () => {
  const { context, timers } = await loadPolicy();
  let cancelled = false;
  let reads = 0;
  await assert.rejects(context.fetchPushStore("https://fixture.invalid", {}, async () => ({
    headers: new Headers({ "content-length": "1048577" }),
    body: { cancel: async () => { cancelled = true; }, getReader: () => { reads++; throw new Error("Leitura indevida"); } },
  })));
  assert.equal(cancelled, true);
  assert.equal(reads, 0);
  assert.equal(timers.size, 0);
});

test("fetch do store aceita exatamente 1 MiB sem truncamento", async () => {
  const { context, timers } = await loadPolicy();
  const bytes = new Uint8Array(1_048_576).fill(7);
  const response = await context.fetchPushStore("https://fixture.invalid", {}, async () => new Response(bytes));
  const received = new Uint8Array(await response.arrayBuffer());
  assert.equal(received.byteLength, bytes.byteLength);
  assert.equal(received.at(-1), 7);
  assert.equal(timers.size, 0);
});

test("fetch do store mantém timeout ativo até terminar leitura, com erro sanitizado", async () => {
  const { context, timers } = await loadPolicy();
  let aborted = false;
  const fetcher = async (_url, { signal }) => new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array([1]));
      signal.addEventListener("abort", () => {
        aborted = true;
        controller.error(new Error("segredo-interno-fixture timeout"));
      }, { once: true });
    },
  }));
  await assert.rejects(context.fetchPushStore("https://fixture.invalid", {}, fetcher, 5), error => !error.message.includes("segredo-interno-fixture"));
  assert.equal(aborted, true);
  assert.equal(timers.size, 0);
});

test("fetch do store sanitiza erro de rede e limpa timer", async () => {
  const { context, timers } = await loadPolicy();
  await assert.rejects(context.fetchPushStore("https://fixture.invalid", {}, async () => { throw new Error("segredo-interno-fixture"); }), error => !error.message.includes("segredo-interno-fixture"));
  assert.equal(timers.size, 0);
});
