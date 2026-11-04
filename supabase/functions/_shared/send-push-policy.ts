import { hasCronOrServiceRoleAuth } from "./service-role-auth.ts";
import { AdminBodyTooLargeError, readAdminActionBody } from "./admin-session-auth.ts";

export const MAX_PUSH_SUBSCRIPTIONS = 200;
export const PUSH_CONCURRENCY = 20;
export const PUSH_TIMEOUT_MS = 5_000;
const PUSH_ORIGIN = "https://piracanjuba.ai";
const MAX_PAYLOAD_BYTES = 3_993;

export interface PushSubscriptionRecord {
  id: string;
  endpoint: string;
  keys_p256dh: string;
  keys_auth: string;
}

export interface PushDeliveryDetails {
  title: string;
  sent: number;
  failed: number;
  topic?: string;
}

export interface PushStore {
  findDuplicate(key: string): Promise<boolean>;
  loadSubscriptions(topic: string | undefined, limit: number): Promise<PushSubscriptionRecord[]>;
  removeExpired(ids: string[]): Promise<void>;
  recordDelivery(key: string, details: PushDeliveryDetails): Promise<void>;
}

export interface PushDependencies {
  getServiceRoleKey(): string | undefined;
  getCronSecret(): string | undefined;
  createStore(serviceRoleKey: string): PushStore;
  createSender(): (subscription: PushSubscriptionRecord, payload: string) => Promise<number>;
  now?(): number;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export function normalizePushUrl(value: unknown): string {
  if (value === undefined || value === null || value === "") return "/";
  if (typeof value !== "string" || value.length > 1_024 || /[\\\u0000-\u0020\u007f]/u.test(value) || value.startsWith("//")) {
    throw new Error("URL inválida");
  }
  const url = new URL(value, PUSH_ORIGIN);
  if (url.origin !== PUSH_ORIGIN || url.username || url.password) throw new Error("URL inválida");
  // Preservar uma rota relativa evita depender do Host ou Origin da requisição.
  const path = url.pathname + url.search + url.hash;
  if (path.startsWith("//")) throw new Error("URL inválida");
  return path;
}

export function isAllowedPushEndpoint(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 4_096 || /[\\\s]/u.test(value)) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.port || url.username || url.password || url.hash) return false;
    const host = url.hostname;
    return host === "fcm.googleapis.com" || host === "android.googleapis.com" ||
      host === "updates.push.services.mozilla.com" || host.endsWith(".push.services.mozilla.com") ||
      host.endsWith(".push.apple.com") || host.endsWith(".notify.windows.com");
  } catch {
    return false;
  }
}

function validSubscription(sub: PushSubscriptionRecord): boolean {
  return typeof sub.id === "string" && isAllowedPushEndpoint(sub.endpoint) &&
    typeof sub.keys_p256dh === "string" && /^B[A-Za-z0-9_-]{86}=?$/.test(sub.keys_p256dh) &&
    typeof sub.keys_auth === "string" && /^[A-Za-z0-9_-]{22}(?:==)?$/.test(sub.keys_auth);
}

export function cleanVapidPrivateKey(value: string | undefined): string {
  let key = value?.trim();
  if (key?.startsWith("{")) {
    const parsed = JSON.parse(key);
    key = parsed.privateKey || parsed.private_key || parsed.privKey;
  }
  if (typeof key !== "string") throw new Error("Configuração VAPID ausente");
  key = key.replace(/[=\s"']/g, "");
  if (!/^[A-Za-z0-9_-]{43}$/.test(key)) throw new Error("Configuração VAPID inválida");
  return key;
}

export interface WebPushRequestDetails {
  endpoint: string;
  method: string;
  headers: Record<string, string | number>;
  body: Uint8Array;
}

/** O cadastro público não pode forçar leitura ilimitada de colunas TEXT. */
export async function fetchPushStore(
  input: RequestInfo | URL,
  init?: RequestInit,
  fetcher: typeof fetch = fetch,
  timeoutMs = 5_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const maxBytes = 1_048_576;
  try {
    const response = await fetcher(input, { ...init, redirect: "error", signal: controller.signal });
    if (Number(response.headers.get("content-length")) > maxBytes) {
      await response.body?.cancel();
      throw new Error("Resposta do banco acima do limite");
    }
    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    if (reader) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          length += value.byteLength;
          if (length > maxBytes) {
            await reader.cancel();
            throw new Error("Resposta do banco acima do limite");
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    headers.delete("content-encoding");
    return new Response([204, 205, 304].includes(response.status) ? null : bytes, {
      status: response.status, statusText: response.statusText, headers,
    });
  } catch {
    throw new Error("Banco push indisponível ou resposta acima do limite");
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

/** Mantém a criptografia web-push; limita o transporte, sem seguir redirects. */
export async function sendWebPushRequest(
  details: WebPushRequestDetails,
  fetcher: typeof fetch = fetch,
  timeoutMs = PUSH_TIMEOUT_MS,
): Promise<number> {
  if (!isAllowedPushEndpoint(details.endpoint) || details.method !== "POST") {
    throw new Error("Destino push inválido");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = new Headers();
    for (const [key, value] of Object.entries(details.headers)) headers.set(key, String(value));
    const response = await fetcher(details.endpoint, {
      method: "POST",
      headers,
      body: new Uint8Array(details.body),
      redirect: "error",
      signal: controller.signal,
    });
    // A resposta do provedor não é necessária e pode conter tokens/endpoints.
    const status = response.status;
    await response.body?.cancel().catch(() => undefined);
    return status;
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

function requiredText(value: unknown, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error("Texto inválido");
  return value;
}

function optionalText(value: unknown, max: number): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return requiredText(value, max);
}

export function createSendPushHandler(deps: PushDependencies) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    const serviceRoleKey = deps.getServiceRoleKey();
    if (!hasCronOrServiceRoleAuth(req, serviceRoleKey, deps.getCronSecret())) {
      return reply({ error: "Não autorizado" }, 401);
    }
    if (req.method !== "POST") return reply({ error: "Use POST" }, 405);
    if (!serviceRoleKey?.trim()) return reply({ error: "Serviço não configurado" }, 503);

    let message: Record<string, unknown>;
    let title: string, body: string, topic: string | undefined, dedupKey: string | undefined, payload: string;
    try {
      message = await readAdminActionBody(req, 8_192);
      if ("dry_run" in message && typeof message.dry_run !== "boolean") throw new Error("dry_run inválido");
      if ("check_config" in message && typeof message.check_config !== "boolean") throw new Error("check_config inválido");
      if (message.check_config === true && message.dry_run !== true) throw new Error("check_config exige dry_run");
      if (message.dry_run === true) {
        if (message.check_config === true) {
          try { deps.createSender(); }
          catch { return reply({ error: "push_configuration_unavailable", sent: 0 }, 503); }
          return reply({ success: true, dry_run: true, configuration_valid: true });
        }
        return reply({ success: true, dry_run: true });
      }
      title = requiredText(message.title, 200);
      body = requiredText(message.body, 2_000);
      topic = optionalText(message.topic, 100);
      dedupKey = optionalText(message.dedup_key, 200);
      payload = JSON.stringify({ title, body, icon: "/favicon.png", badge: "/favicon.png", url: normalizePushUrl(message.url), timestamp: (deps.now ?? Date.now)() });
      if (new TextEncoder().encode(payload).length > MAX_PAYLOAD_BYTES) throw new Error("Payload excede o limite");
    } catch (error) {
      return reply({ error: "Notificação inválida ou acima do limite permitido" }, error instanceof AdminBodyTooLargeError ? 413 : 400);
    }

    let store: PushStore;
    let subscriptions: PushSubscriptionRecord[];
    let sender: ReturnType<PushDependencies["createSender"]>;
    try {
      store = deps.createStore(serviceRoleKey);
      if (dedupKey && await store.findDuplicate(dedupKey)) return reply({ sent: 0, message: "Already notified", dedup_key: dedupKey });
      subscriptions = await store.loadSubscriptions(topic, MAX_PUSH_SUBSCRIPTIONS + 1);
      if (subscriptions.length > MAX_PUSH_SUBSCRIPTIONS) {
        return reply({ error: "fanout_limit_exceeded", sent: 0 }, 503);
      }
      if (!subscriptions.length) return reply({ sent: 0, message: "No subscriptions found" });
      sender = deps.createSender();
    } catch {
      console.error("Push indisponível antes do envio");
      return reply({ error: "push_unavailable", sent: 0 }, 503);
    }

    let next = 0, sent = 0, failed = 0, invalid = 0;
    const expiredIds: string[] = [];
    // Snapshot único: limpar 404/410 não desloca páginas nem pula destinatários.
    await Promise.all(Array.from({ length: Math.min(PUSH_CONCURRENCY, subscriptions.length) }, async () => {
      while (next < subscriptions.length) {
        const sub = subscriptions[next++];
        if (!validSubscription(sub)) { failed++; invalid++; continue; }
        try {
          const status = await sender(sub, payload);
          if (status >= 200 && status < 300) sent++;
          else {
            failed++;
            if (status === 404 || status === 410) expiredIds.push(sub.id);
          }
        } catch {
          failed++;
        }
      }
    }));

    let expiredCleaned = 0;
    const warnings: string[] = [];
    if (expiredIds.length) {
      try { await store.removeExpired(expiredIds); expiredCleaned = expiredIds.length; }
      catch { warnings.push("expired_cleanup_failed"); }
    }
    if (dedupKey && sent > 0) {
      try { await store.recordDelivery(dedupKey, { title, sent, failed, topic }); }
      catch { warnings.push("dedup_log_failed"); }
    }
    if (failed || warnings.length) console.warn("Push concluído com ocorrências", { sent, failed, invalid, warnings });
    // Não recomendar repetição de um disparo que já pode ter chegado a assinantes.
    return reply({ sent, failed, expired_cleaned: expiredCleaned, ...(invalid ? { invalid_skipped: invalid } : {}), ...(warnings.length ? { warnings } : {}) });
  };
}
