import { hasCronOrServiceRoleAuth } from "../_shared/service-role-auth.ts";
import {
  AdminBodyTooLargeError,
  readAdminActionBody,
} from "../_shared/admin-session-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const headers = {
  ...corsHeaders,
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

// O cron antigo permanece compativel, sem gerar textos obsoletos ou consumir IA.
// Resumos individuais agora sao calculados dos registros oficiais em cada consulta.
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") {
    return new Response(null, {
      status: 405,
      headers: { ...headers, Allow: "POST, OPTIONS" },
    });
  }
  if (
    !hasCronOrServiceRoleAuth(
      req,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
      Deno.env.get("CRON_SECRET"),
    )
  ) {
    return new Response(JSON.stringify({ error: "Não autorizado" }), {
      status: 401,
      headers,
    });
  }
  let body: Record<string, unknown>;
  try {
    body = await readAdminActionBody(req, 8_192);
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Corpo da requisição inválido ou muito grande.",
      }),
      {
        status: error instanceof AdminBodyTooLargeError ? 413 : 400,
        headers,
      },
    );
  }
  if (body.dry_run !== undefined && typeof body.dry_run !== "boolean") {
    return new Response(
      JSON.stringify({ error: "dry_run deve ser booleano." }),
      { status: 400, headers },
    );
  }
  return new Response(
    JSON.stringify({
      success: true,
      dry_run: body.dry_run === true,
      skipped: true,
      reason: "resumos_deterministicos",
      gerados: 0,
      cacheHits: 0,
      erros: 0,
      restantes: 0,
      message:
        "Os resumos individuais são calculados dos registros oficiais na consulta; não precisam de geração prévia.",
    }),
    { headers },
  );
});
