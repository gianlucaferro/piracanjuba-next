const bucket = "email-descadastros";
const registryPath = "cadastro/v1.json";
const storageUrl = Deno.env.get("SUPABASE_URL") + "/storage/v1";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const headers = { apikey: serviceKey, Authorization: "Bearer " + serviceKey };
const tokenFormat = /^[A-Za-z0-9_-]{43}$/;
const hexDigest = /^[a-f0-9]{64}$/;

function reply(status: number, state?: string) {
  return new Response(state ?? null, { status, headers: { "Cache-Control": "no-store" } });
}

async function storage(path: string, method = "GET", body?: object) {
  return await fetch(storageUrl + path, {
    method,
    headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(5000),
  });
}

async function marked(name: string) {
  const response = await storage("/object/list/" + bucket, "POST", { prefix: "baixas", search: name, limit: 1 });
  if (!response.ok) throw new Error("lista indisponível");
  const rows = await response.json();
  if (!Array.isArray(rows) || (rows.length > 0 && rows[0]?.name !== name)) throw new Error("lista inválida");
  return rows.length === 1;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return reply(405);
  try {
    // Corpo pequeno e sem credencial em URLs ou logs.
    if (!request.headers.get("Content-Type")?.startsWith("application/json")) return reply(415);
    if (Number(request.headers.get("Content-Length")) > 256 || !request.body) return reply(400);
    const bytes = new Uint8Array(256);
    const reader = request.body.getReader();
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value.length + length > bytes.length) {
        await reader.cancel();
        return reply(400);
      }
      bytes.set(value, length);
      length += value.length;
    }
    const input = new TextDecoder().decode(bytes.subarray(0, length));
    let data;
    try {
      data = JSON.parse(input);
    } catch {
      return reply(400);
    }
    if (!data || typeof data.token !== "string" || !tokenFormat.test(data.token)) return reply(404);
    if (data.action !== "check" && data.action !== "unsubscribe") return reply(400);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data.token));
    const tokenHash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");

    const registry = await storage("/object/authenticated/" + bucket + "/" + registryPath);
    if (!registry.ok) return reply(503);
    const records = await registry.json();
    if (!records || Object.getPrototypeOf(records) !== Object.prototype) return reply(503);
    if (!Object.hasOwn(records, tokenHash)) return reply(404);
    const emailHash = records[tokenHash];
    if (typeof emailHash !== "string" || !hexDigest.test(emailHash)) return reply(503);

    const name = emailHash + ".json";
    if (data.action === "check") {
      // Listagem autenticada distingue lista vazia de bucket indisponível.
      return reply(200, await marked(name) ? "unsubscribed" : "subscribed");
    }
    // Inserção exclusiva preserva a data da primeira baixa, inclusive sob concorrência.
    const inserted = await storage("/object/" + bucket + "/baixas/" + name, "POST", { unsubscribed: true });
    if (!inserted.ok && !await marked(name)) return reply(503);
    return reply(200, "unsubscribed");
  } catch {
    return reply(503);
  }
});
