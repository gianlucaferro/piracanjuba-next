export const MAX_ADMIN_ACTION_BYTES = 1_048_576;

export class AdminBodyTooLargeError extends Error {}

/** Limite aplicado ao fluxo real antes de JSON.parse, sem confiar no header. */
export async function readAdminActionBody(
  req: Request,
  maxBytes = MAX_ADMIN_ACTION_BYTES,
): Promise<Record<string, unknown>> {
  const statedLength = Number(req.headers.get("content-length"));
  if (Number.isFinite(statedLength) && statedLength > maxBytes) {
    throw new AdminBodyTooLargeError("Corpo excede o limite permitido");
  }
  const reader = req.body?.getReader();
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
          throw new AdminBodyTooLargeError("Corpo excede o limite permitido");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const body: unknown = text.trim() ? JSON.parse(text) : {};
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Corpo deve ser um objeto JSON");
  }
  return body as Record<string, unknown>;
}

/** O admin-login existente emite 32 bytes aleatorios em 64 caracteres hex. */
export function isAdminSessionToken(token: unknown): token is string {
  return typeof token === "string" && /^[a-f0-9]{64}$/.test(token);
}

export async function hasAdminSessionAuth(
  token: unknown,
  findSession: (tokenHash: string) => Promise<{ expires_at: string } | null>,
  now = Date.now(),
): Promise<boolean> {
  if (!isAdminSessionToken(token)) return false;
  try {
    const bytes = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(token),
    );
    const tokenHash = Array.from(new Uint8Array(bytes))
      .map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const session = await findSession(tokenHash);
    return !!session && Date.parse(session.expires_at) > now;
  } catch {
    return false;
  }
}
