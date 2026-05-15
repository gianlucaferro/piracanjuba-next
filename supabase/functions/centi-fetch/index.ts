// Edge function genérica que faz fetch ao /api do Centi.
// Pode ser chamada por outras edges ou diretamente via service_role (admin debug).
//
// Body esperado:
//   {
//     "referer": "/cidadao/transparencia/gastosparlamentares",
//     "acao": "gastos_parlamentares/listar",
//     "extra": { "mp_id": "16" }    // opcional
//     "offset": 0,
//     "page_size": 100,
//     "all_pages": true             // se true, pagina automaticamente
//   }
//
// Auth: X-Centi-Ingest-Secret header (definido em CENTI_INGEST_SECRET).
// Em fallback, service_role tambem aceito.

import { centiList, centiListAll } from "../_shared/centi-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, content-type, x-centi-ingest-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const CENTI_INGEST_SECRET = Deno.env.get("CENTI_INGEST_SECRET");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  // Auth
  const provided = req.headers.get("x-centi-ingest-secret") ?? "";
  const authHeader = req.headers.get("authorization") ?? "";
  const isAuthorized =
    (CENTI_INGEST_SECRET && provided === CENTI_INGEST_SECRET) ||
    (SERVICE_ROLE && authHeader.includes(SERVICE_ROLE));

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const referer = body.referer as string;
  const acao = body.acao as string;
  const extra = (body.extra as Record<string, string>) ?? undefined;
  const offset = (body.offset as number) ?? 0;
  const pageSize = (body.page_size as number) ?? 100;
  const allPages = Boolean(body.all_pages);

  if (!referer || !acao) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: referer + acao" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const startedAt = Date.now();
    let dados: unknown[];
    if (allPages) {
      dados = await centiListAll(referer, acao, { extra, pageSize });
    } else {
      dados = await centiList(referer, acao, { extra, offset, pageSize });
    }

    return new Response(
      JSON.stringify({
        success: true,
        referer,
        acao,
        total: dados.length,
        duration_ms: Date.now() - startedAt,
        dados,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
