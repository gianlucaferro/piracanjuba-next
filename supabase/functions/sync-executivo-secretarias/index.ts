/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ESTRUTURA_API_URL,
  fetchSecretariasOficiais,
  planejarSecretarias,
} from "../_shared/executivo-estrutura.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// O subsídio é fixado anualmente. Esta coleta atualiza somente nome e fonte.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: log } = await sb.from("sync_log")
    .insert({ tipo: "executivo_secretarias", status: "running", detalhes: {} })
    .select("id").single();
  const logId = log?.id;
  const errors: string[] = [];

  try {
    const { count: executivos, error: executivoError } = await sb.from(
      "executivo",
    )
      .select("id", { count: "exact", head: true });
    if (executivoError) throw executivoError;
    const { data: secretarias, error: secretariaError } = await sb.from(
      "secretarias",
    )
      .select("id, nome, secretario_nome, fonte_url");
    if (secretariaError) throw secretariaError;

    // Completa e valida todas as páginas antes de alterar qualquer secretaria.
    const oficiais = await fetchSecretariasOficiais();
    const plan = planejarSecretarias(secretarias || [], oficiais);
    errors.push(...plan.errors);
    let updated = 0;
    for (const update of plan.updates) {
      const { error } = await sb.from("secretarias").update(update.patch)
        .eq("id", update.id);
      if (error) errors.push(`Atualização de secretaria: ${error.message}`);
      else updated++;
    }

    const result = {
      executivos: executivos ?? 0,
      secretarias: (secretarias || []).length,
      fonte_url: ESTRUTURA_API_URL,
      source_count: oficiais.length,
      matched: plan.matched,
      unchanged: plan.unchanged,
      updated,
      errors: errors.slice(0, 10),
    };
    const success = errors.length === 0;
    if (logId) {
      await sb.from("sync_log").update({
        status: success ? "success" : "partial",
        detalhes: result,
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }
    return new Response(JSON.stringify({ success, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (logId) {
      await sb.from("sync_log").update({
        status: "error",
        detalhes: { error: message, errors },
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
