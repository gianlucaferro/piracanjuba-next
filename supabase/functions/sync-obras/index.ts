/// <reference lib="deno.ns" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  fetchObrasOficiais,
  type ObraExistente,
  OBRAS_FONTE_URL,
  parseObrasRequest,
  planejarObras,
} from "../_shared/obras-nucleogov.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};
function message(error: unknown): string {
  return error && typeof error === "object" && "message" in error
    ? String(error.message)
    : String(error);
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  let logId: string | null = null;
  const started = Date.now();
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  try {
    let dryRun: boolean;
    try {
      ({ dryRun } = parseObrasRequest(
        req.method === "POST" ? await req.text() : "",
      ));
    } catch (error) {
      return json({ success: false, error: message(error) }, 400);
    }
    if (!dryRun) {
      const { data, error } = await sb.from("sync_log")
        .insert({
          tipo: "obras",
          status: "running",
          detalhes: { fonte_url: OBRAS_FONTE_URL },
        })
        .select("id").single();
      if (error) throw error;
      logId = data.id;
    }
    const { obras, by_orgao } = await fetchObrasOficiais();
    const existentes: ObraExistente[] = [];
    let expectedTotal: number | null = null;
    for (let offset = 0;; offset += 1000) {
      // select(*) funciona também no ensaio anterior à migration aditiva.
      const { data, count, error } = await sb.from("obras").select("*", {
        count: "exact",
      })
        .order("id").range(offset, offset + 999);
      if (error) throw error;
      if (
        count === null || (expectedTotal !== null && count !== expectedTotal)
      ) throw new Error("Obras: cadastro mudou durante leitura");
      expectedTotal = count;
      existentes.push(...(data || []));
      if (existentes.length === expectedTotal) break;
      if (!data?.length || data.length < 1000) {
        throw new Error("Obras: leitura incompleta do cadastro existente");
      }
    }
    const plan = planejarObras(existentes, obras);
    if (!dryRun) {
      // Uma chamada mantém a importação inteira em uma transação PostgREST.
      if (plan.upserts.length) {
        const updated_at = new Date().toISOString();
        const { error } = await sb.from("obras").upsert(
          plan.upserts.map((obra) => ({ ...obra, updated_at })),
          { onConflict: "origem_chave" },
        );
        if (error) throw error;
      }
    }
    const result = {
      success: true,
      dry_run: dryRun,
      fonte_url: OBRAS_FONTE_URL,
      fetched: obras.length,
      source_total: null,
      source_mode: "catalogo_integral_sem_paginacao_http",
      by_orgao,
      inserts: plan.inserts,
      updates: plan.updates,
      unchanged: plan.unchanged,
      legacy_preserved: plan.legacy_preserved,
      conflicts: plan.conflicts,
      duration_ms: Date.now() - started,
    };
    if (logId) {
      const { error } = await sb.from("sync_log").update({
        status: "success",
        detalhes: result,
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
      if (error) throw error;
    }
    return json(result);
  } catch (error) {
    const detail = message(error);
    if (logId) {
      const { error: logError } = await sb.from("sync_log").update({
        status: "error",
        detalhes: { error: detail },
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
      if (logError) {
        console.error("Falha ao concluir sync_log:", message(logError));
      }
    }
    return json({ success: false, error: detail }, 500);
  }
});
