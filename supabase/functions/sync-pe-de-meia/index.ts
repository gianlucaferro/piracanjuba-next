import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkCentiAuth } from "../_shared/centi-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-centi-ingest-secret",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

// O Swagger atual do Portal da Transparencia nao publica um endpoint municipal
// do Pe-de-Meia. A rotina anterior interpretava 404 como ausencia de registros
// e terminava com sucesso, o que escondia a indisponibilidade da fonte.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!checkCentiAuth(req)) {
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers: jsonHeaders },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const details = {
    source_status: "unavailable",
    reason:
      "O endpoint municipal pe-de-meia-por-municipio nao existe na API oficial atual.",
    action:
      "Sincronizacao suspensa. Os registros historicos foram preservados sem alteracao.",
  };

  await supabase.from("sync_log").insert({
    tipo: "pe_de_meia",
    status: "error",
    detalhes: details,
    finished_at: new Date().toISOString(),
  });

  return new Response(
    JSON.stringify({ success: false, ...details }),
    { status: 410, headers: jsonHeaders },
  );
});
