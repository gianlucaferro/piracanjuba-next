import { AdminBodyTooLargeError, isAdminSessionToken, readAdminActionBody } from "./admin-session-auth.ts";

export const SYNC_OBSERVATION_TYPES: Record<string, string[]> = {
  "sync-folha-prefeitura-nucleogov": ["sync-folha-prefeitura-nucleogov"],
  "sync-camara-servidores": ["sync-camara-servidores", "camara_servidores"],
  "sync-saude-indicadores": ["sync-saude-indicadores", "saude_indicadores"],
  "sync-educacao": ["sync-educacao", "educacao"],
  "sync-beneficios-sociais": ["sync-beneficios-sociais", "beneficios_sociais"],
  "sync-arrecadacao": ["sync-arrecadacao", "arrecadacao"],
  "sync-agro": ["sync-agro", "agro"],
};

/** Somente métricas e competências. Nunca encaminhar payloads ou mensagens arbitrárias. */
export function safeSyncDetails(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of ["fetched", "source_total", "registros_folha", "remuneracoes", "inserted", "updated", "registros"]) {
    const candidate = input[key];
    if (typeof candidate === "number" && Number.isSafeInteger(candidate) && candidate >= 0) result[key] = candidate;
  }
  for (const key of ["complete", "source_complete", "fallback_used", "max_pages_reached"]) {
    if (typeof input[key] === "boolean") result[key] = input[key];
  }
  for (const key of ["scope", "competencia", "requested_competencia"]) {
    if (typeof input[key] === "string" && /^\d{4}(?:-(?:0[1-9]|1[0-2]))?$/.test(input[key])) result[key] = input[key];
  }
  const writes = input.writes;
  if (writes && typeof writes === "object" && !Array.isArray(writes)) {
    const safeWrites: Record<string, number> = {};
    for (const key of ["canonical", "compatibility", "discarded"]) {
      const candidate = (writes as Record<string, unknown>)[key];
      if (typeof candidate === "number" && Number.isSafeInteger(candidate) && candidate >= 0) safeWrites[key] = candidate;
    }
    result.writes = safeWrites;
  }
  return result;
}

interface Dependencies {
  authorize(token: string): Promise<boolean>;
  loadSnapshot(): Promise<unknown>;
}

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

export function createAdminSyncStatusHandler(deps: Dependencies) {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (req.method !== "POST") return json({ error: "Use POST" }, 405);
    let body: Record<string, unknown>;
    try {
      body = await readAdminActionBody(req, 4096);
    } catch (error) {
      return json({ error: "Requisição inválida" }, error instanceof AdminBodyTooLargeError ? 413 : 400);
    }
    if (Object.keys(body).some((key) => key !== "admin_token")) return json({ error: "Campo não reconhecido" }, 400);
    if (!isAdminSessionToken(body.admin_token)) return json({ error: "Não autorizado" }, 401);
    try {
      if (!await deps.authorize(body.admin_token)) return json({ error: "Sessão expirada ou inválida" }, 401);
      return json(await deps.loadSnapshot());
    } catch {
      return json({ error: "Monitoramento indisponível. Tente novamente." }, 503);
    }
  };
}
