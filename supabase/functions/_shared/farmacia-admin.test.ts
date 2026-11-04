import { createFarmaciaAdminHandler, decodeFarmaciaWebP, farmaciaPhotoPath } from "./farmacia-admin.ts";
import { hasAdminSessionAuth } from "./admin-session-auth.ts";
import { createFarmaciaAdminDependencies } from "./farmacia-admin-store.ts";

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Esperado ${JSON.stringify(expected)}, recebido ${JSON.stringify(actual)}`);
}
function webp(width = 540, height = 400, lossless = false) {
  const bytes = new Uint8Array(30);
  const v = new DataView(bytes.buffer);
  bytes.set(new TextEncoder().encode("RIFF"));
  v.setUint32(4, 22, true);
  bytes.set(new TextEncoder().encode(lossless ? "WEBPVP8L" : "WEBPVP8 "), 8);
  v.setUint32(16, 10, true);
  if (lossless) {
    bytes[20] = 0x2f;
    v.setUint32(21, (width - 1) | ((height - 1) << 14), true);
  } else {
    bytes.set([0x9d, 1, 0x2a], 23);
    v.setUint16(26, width, true);
    v.setUint16(28, height, true);
  }
  return bytes;
}
const base64 = (bytes: Uint8Array) => btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""));
const nome = "Drogaria São José";
const token = "a".repeat(64);
const request = (body: unknown, method = "POST") => new Request("https://example.test", {
  method, ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
});

function fixture(session: { expires_at: string } | null = { expires_at: "2099-01-01" }, throwing = false) {
  const calls: unknown[] = [];
  const handler = createFarmaciaAdminHandler({
    authorize: (t) => hasAdminSessionAuth(t, async (hash) => {
      calls.push(["session", hash]);
      if (throwing) throw new Error("private db error");
      return session;
    }),
    async upload(n, path, image) { calls.push(["upload", n, path, image.length]); },
    async removePhoto(n) { calls.push(["remove", n]); },
    async updatePhone(n, phone, type) { calls.push(["phone", n, phone, type]); },
  });
  return { calls, handler };
}

Deno.test("anon, token malformado, sessao expirada e erro de lookup nao escrevem", async () => {
  for (const admin_token of [undefined, "anon-key", "jwt-user", {}, token.slice(1)]) {
    const f = fixture();
    equal((await f.handler(request({ admin_token, nome, action: "upload", image_base64: base64(webp()) }))).status, 401);
    equal(f.calls, []);
  }
  for (const session of [null, { expires_at: "2000-01-01" }, { expires_at: "invalid" }]) {
    const f = fixture(session);
    equal((await f.handler(request({ admin_token: token, nome, action: "remove_photo" }))).status, 401);
    equal(f.calls.length, 1);
  }
  const f = fixture(null, true);
  equal((await f.handler(request({ admin_token: token, nome, action: "remove_photo" }))).status, 401);
  equal(f.calls.length, 1);
});

Deno.test("admin valido preserva upload, telefone e remocao, sem aceitar caminho arbitrario", async () => {
  const f = fixture();
  equal((await f.handler(request({ admin_token: token, nome, action: "upload", image_base64: base64(webp()), path: "../../outro" }))).status, 200);
  equal(f.calls[1], ["upload", nome, "drogaria-sao-jose.webp", 30]);
  equal((await f.handler(request({ admin_token: token, nome, action: "update_phone", telefone: "(64) 3405-3093" }))).status, 200);
  equal(f.calls[3], ["phone", nome, "(64) 3405-3093", "fixo"]);
  equal((await f.handler(request({ admin_token: token, nome, action: "remove_photo" }))).status, 200);
  equal(f.calls[5], ["remove", nome]);
  equal(farmaciaPhotoPath(nome), "drogaria-sao-jose.webp");
});

Deno.test("campos invalidos e arquivos falsos nao chegam ao storage", async () => {
  for (const payload of [
    { nome: "../fora", action: "remove_photo" },
    { nome, action: "delete_all" },
    { nome, action: "update_phone", telefone: "javascript:alert(1)" },
    { nome, action: "update_phone", telefone: "123" },
    { nome, action: "upload", image_base64: base64(webp(541)) },
    { nome, action: "upload", image_base64: base64(webp(540, 2161)) },
    { nome, action: "upload", image_base64: btoa("<svg>wrong</svg>") },
    { nome, action: "upload", image_base64: "a".repeat(700_000) },
  ]) {
    const f = fixture();
    equal((await f.handler(request({ ...payload, admin_token: token }))).status, 400);
    equal(f.calls.length, 1);
  }
});

Deno.test("WebP lossless e lossy estaticos passam, container truncado ou animado falha", () => {
  for (const lossless of [true, false]) equal(decodeFarmaciaWebP(base64(webp(540, 2160, lossless))).length, 30);
  const truncated = webp().slice(0, 29);
  const wrongSize = webp(); wrongSize[4] = 21;
  const animated = webp(); animated.set(new TextEncoder().encode("ANIM"), 12);
  for (const bytes of [truncated, wrongSize, animated]) {
    let failed = false;
    try { decodeFarmaciaWebP(base64(bytes)); } catch { failed = true; }
    equal(failed, true);
  }
});

Deno.test("limite de corpo real, preflight e metodo nao produzem efeitos", async () => {
  const f = fixture();
  equal((await f.handler(request({}, "OPTIONS"))).status, 200);
  equal((await f.handler(request({}, "GET"))).status, 405);
  equal((await f.handler(request({ x: "x".repeat(710_001) }))).status, 413);
  equal((await f.handler(new Request("https://example.test", { method: "POST", body: "{" }))).status, 400);
  equal(f.calls, []);
});

Deno.test("erro de armazenamento nao devolve detalhes nem falso sucesso", async () => {
  const handler = createFarmaciaAdminHandler({
    authorize: async () => true,
    upload: async () => { throw new Error("secret detail"); },
    removePhoto: async () => {}, updatePhone: async () => {},
  });
  const result = await handler(request({ nome, action: "upload", image_base64: base64(webp()) }));
  equal(result.status, 503);
  equal((await result.text()).includes("secret detail"), false);
});

Deno.test("adaptador mantem foto no telefone e telefone na remocao, autenticacao usa hash singleton", async () => {
  const calls: unknown[] = [];
  let row: Record<string, unknown> = { nome, foto_url: "https://example.test/old.webp", telefone: "(64) 3405-0000" };
  const client = {
    from(table: string) {
      if (table === "admin_sessions") {
        const builder = {
          select: () => builder,
          eq: (key: string, value: unknown) => { calls.push([key, value]); return builder; },
          maybeSingle: async () => ({ data: { expires_at: "2099-01-01" }, error: null }),
        };
        return builder;
      }
      return {
        async upsert(data: Record<string, unknown>, options: { ignoreDuplicates?: boolean }) {
          if (!options.ignoreDuplicates) row = { ...row, ...data };
          return { error: null };
        },
        update(data: Record<string, unknown>) {
          return { eq: async () => { row = { ...row, ...data }; return { error: null }; } };
        },
      };
    },
    storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: "https://example.test/new.webp" } }) }) },
  };
  const deps = createFarmaciaAdminDependencies(client as never);
  equal(await deps.authorize(token), true);
  equal(calls[0], ["id", "singleton"]);
  equal((calls[1] as unknown[])[0], "token_hash");
  equal((calls[1] as unknown[])[1] === token, false);
  await deps.updatePhone(nome, "(64) 99999-9999", "whatsapp");
  equal(row.foto_url, "https://example.test/old.webp");
  await deps.upload(nome, farmaciaPhotoPath(nome), webp());
  equal(row.telefone, "(64) 99999-9999");
  await deps.removePhoto(nome);
  equal(row.foto_url, "");
  equal(row.telefone, "(64) 99999-9999");
});
