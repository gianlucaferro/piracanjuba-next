import { checkCentiAuth } from "../_shared/centi-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, content-type, x-cron-secret, x-centi-ingest-secret",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

// Compatibilidade operacional: o endpoint antigo permanece publicado para
// informar a desativacao, mas nunca mais escreve na tabela paralela
// bolsa_familia_municipio.
Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!checkCentiAuth(req)) {
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers: jsonHeaders },
    );
  }

  return new Response(
    JSON.stringify({
      success: false,
      status: "deprecated",
      replacement: "sync-beneficios-sociais",
      message:
        "Sincronizador legado desativado. Use a camada canonica de beneficios sociais.",
    }),
    { status: 410, headers: jsonHeaders },
  );
});
