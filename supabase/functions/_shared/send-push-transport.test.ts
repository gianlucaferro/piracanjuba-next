import process from "node:process";
import { createECDH, randomBytes } from "node:crypto";
import { sendWebPushRequest } from "./send-push-policy.ts";

// O teste isolado usa apenas configuração sintética, sem ler o ambiente do host.
process.env = {};
const webpush = await import("https://esm.sh/web-push@3.6.7");

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

Deno.test("transporte preserva ciphertext, VAPID e TTL da biblioteca real sem enviar mensagens", async () => {
  const vapid = webpush.generateVAPIDKeys();
  const browser = createECDH("prime256v1");
  browser.generateKeys();
  const endpoint = "https://fcm.googleapis.com/wp/fixture-sintetica";
  const payload = JSON.stringify({ title: "Folha atualizada", body: "Dados disponíveis", url: "/servidores" });
  const details = webpush.generateRequestDetails({
    endpoint,
    keys: { p256dh: browser.getPublicKey().toString("base64url"), auth: randomBytes(16).toString("base64url") },
  }, payload, {
    TTL: 86_400,
    vapidDetails: { subject: "mailto:fixture@example.test", ...vapid },
  });
  let requests = 0;
  let cancelled = false;
  const status = await sendWebPushRequest(details, async (input, init) => {
    requests++;
    assert(input === endpoint && init?.method === "POST", "Destino e método preservados");
    const headers = new Headers(init.headers);
    assert(headers.get("ttl") === "86400", "TTL preservado");
    assert(headers.get("content-encoding") === "aes128gcm", "Codificação Web Push preservada");
    assert(headers.get("authorization")?.startsWith("vapid t="), "VAPID presente");
    const body = init.body as Uint8Array;
    assert(body instanceof Uint8Array && body.length === details.body.length, "Ciphertext completo");
    assert(body.every((value, index) => value === details.body[index]), "Ciphertext idêntico ao original");
    assert(new TextDecoder().decode(body) !== payload, "Mensagem criptografada");
    assert(init.redirect === "error" && !!init.signal, "Sem redirects e com cancelamento");
    return new Response(new ReadableStream({ cancel() { cancelled = true; } }), { status: 201 });
  });
  assert(status === 201 && requests === 1 && cancelled, "Sucesso com resposta descartada");
});
