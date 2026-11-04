import { hasCronOrServiceRoleAuth } from "./service-role-auth.ts";
import {
  AdminBodyTooLargeError,
  readAdminActionBody,
} from "./admin-session-auth.ts";

type PreparedPushCaller =
  | { response: Response }
  | { body: Record<string, unknown>; serviceRoleKey: string };

/** Autoriza o chamador antes de ler o corpo ou acessar banco e fontes externas. */
export async function preparePushCallerRequest(
  req: Request,
  corsHeaders: Record<string, string>,
  maxBytes: number,
  allowCentiIngest = false,
): Promise<PreparedPushCaller> {
  const headers = {
    ...corsHeaders,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
  const reply = (body: unknown, status: number) => ({
    response: new Response(JSON.stringify(body), { status, headers }),
  });
  if (req.method === "OPTIONS") {
    return { response: new Response(null, { status: 204, headers }) };
  }
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ingestSecret = allowCentiIngest
    ? Deno.env.get("CENTI_INGEST_SECRET")
    : undefined;
  const authorized = hasCronOrServiceRoleAuth(
    req,
    serviceRoleKey,
    Deno.env.get("CRON_SECRET"),
  ) || (!!ingestSecret?.trim() &&
    req.headers.get("x-centi-ingest-secret") === ingestSecret);
  if (!authorized) return reply({ success: false, error: "Não autorizado" }, 401);
  if (req.method !== "POST") {
    return reply({ success: false, error: "Use POST" }, 405);
  }
  if (!serviceRoleKey?.trim()) {
    return reply({ success: false, error: "Serviço não configurado" }, 503);
  }
  let body: Record<string, unknown>;
  try {
    body = await readAdminActionBody(req, maxBytes);
  } catch (error) {
    return reply(
      { success: false, error: "Corpo inválido ou acima do limite permitido" },
      error instanceof AdminBodyTooLargeError ? 413 : 400,
    );
  }
  if ("dry_run" in body && typeof body.dry_run !== "boolean") {
    return reply({ success: false, error: "dry_run deve ser booleano" }, 400);
  }
  if (body.dry_run === true) {
    return reply({ success: true, dry_run: true }, 200);
  }
  return { body, serviceRoleKey };
}

/** Falha de notificação não invalida a coleta já persistida. */
export async function notifyPushFromCaller(
  supabaseUrl: string,
  serviceRoleKey: string,
  payload: {
    title: string;
    body: string;
    topic: string;
    url: string;
    dedup_key: string;
  },
): Promise<boolean> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(75_000),
    });
    const ok = response.ok;
    if (!ok) console.warn(`Notificação push recusada: HTTP ${response.status}`);
    await response.body?.cancel();
    return ok;
  } catch {
    console.warn("Notificação push indisponível ou tempo limite excedido");
    return false;
  }
}
