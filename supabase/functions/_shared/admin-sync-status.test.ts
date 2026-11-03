import { createAdminSyncStatusHandler, safeSyncDetails } from "./admin-sync-status.ts";

function assert(value: unknown, message = "Falha na asserção"): asserts value {
  if (!value) throw new Error(message);
}

Deno.test("monitoramento rejeita sessão ausente sem acessar dados", async () => {
  let reads = 0;
  const handler = createAdminSyncStatusHandler({ authorize: async () => { reads++; return true; }, loadSnapshot: async () => { reads++; return {}; } });
  const response = await handler(new Request("https://example.test", { method: "POST", body: "{}" }));
  assert(response.status === 401 && reads === 0);
});

Deno.test("monitoramento rejeita sessão inválida e corpo excessivo", async () => {
  let reads = 0;
  const handler = createAdminSyncStatusHandler({ authorize: async () => false, loadSnapshot: async () => { reads++; return {}; } });
  const request = (body: string) => new Request("https://example.test", { method: "POST", body });
  assert((await handler(request(JSON.stringify({ admin_token: "a".repeat(64) })))).status === 401);
  assert((await handler(request("x".repeat(4097)))).status === 413);
  assert(reads === 0);
});

Deno.test("monitoramento só responde após autenticação e não permite cache", async () => {
  const order: string[] = [];
  const handler = createAdminSyncStatusHandler({ authorize: async () => { order.push("auth"); return true; }, loadSnapshot: async () => { order.push("read"); return { jobs: [] }; } });
  const response = await handler(new Request("https://example.test", { method: "POST", body: JSON.stringify({ admin_token: "a".repeat(64) }) }));
  assert(response.status === 200 && order.join(",") === "auth,read");
  assert(response.headers.get("cache-control") === "no-store");
});

Deno.test("resumo de logs remove dados arbitrários e preserva métricas de cobertura", () => {
  const safe = safeSyncDetails({ fetched: 800, source_total: 1800, complete: false, scope: "2026-09", requested_competencia: "2026-10", error: "segredo", payload: { private: true }, writes: { canonical: 800, discarded: 2, credential: "segredo" } });
  assert(safe.fetched === 800 && safe.complete === false && safe.scope === "2026-09");
  assert(!("error" in safe) && !("payload" in safe));
  assert(JSON.stringify(safe.writes) === JSON.stringify({ canonical: 800, discarded: 2 }));
});
