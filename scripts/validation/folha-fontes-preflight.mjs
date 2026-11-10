// Executa os handlers locais com dry_run contra as fontes publicas, sem segredos.
// Permissao de rede exclui Supabase para impedir qualquer escrita acidental.
Deno.env.set("SUPABASE_URL", "http://127.0.0.1:9");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "validation-fixture");
Deno.env.set("CRON_SECRET", "validation-fixture");
if (Deno.args.includes("--diagnostic")) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const response = await originalFetch(input, init);
    if (String(input).endsWith("/api")) {
      const payload = await response.clone().json().catch(() => ({}));
      const params = JSON.parse(new URLSearchParams(String(init?.body)).get("params") ?? "{}");
      for (const [key, value] of Object.entries(payload)) {
        if (value?.error || value?.erro || value?.success === false) {
          console.log(JSON.stringify({ diagnostic: "source-error", params: params[key], error: value.error ?? value.erro, success: value.success, total: value.total }));
        }
      }
    }
    return response;
  };
}
let camaraHandler;
Deno.serve = (handler) => { camaraHandler = handler; };
await import("../../supabase/functions/sync-camara-servidores/index.ts");
const { createNucleoGovSyncHandler } = await import("../../supabase/functions/_shared/nucleogov-sync.ts");
const handlers = [
  ["camara", camaraHandler],
  ["prefeitura", createNucleoGovSyncHandler("folha", "validation-fixture")],
];
const results = [];
for (const [name, handler] of handlers) {
  if (Deno.args.includes("--prefeitura-only") && name !== "prefeitura") continue;
  const response = await handler(new Request("http://127.0.0.1:9/", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-cron-secret": "validation-fixture" },
    body: JSON.stringify({ dry_run: true }),
  }));
  const body = await response.json();
  const result = { name, status: response.status, body };
  results.push(result);
  console.log(JSON.stringify(result));
}
if (results.some((result) => result.status !== 200 || result.body.dry_run !== true || result.body.success !== true)) Deno.exit(1);
