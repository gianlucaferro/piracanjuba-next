import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkCentiAuth } from "../_shared/centi-auth.ts";
import {
  fetchPortalBenefitData,
  PIRACANJUBA_IBGE,
  PORTAL_BENEFIT_PROGRAMS,
  PortalApiError,
  sha256Json,
  summarizePortalBenefitItems,
} from "../_shared/portal-transparencia-beneficios.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-centi-ingest-secret",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

interface ProgramRun {
  programa: string;
  endpoint: string;
  upserted: string[];
  noData: string[];
  errors: Array<{
    competencia: string;
    status: number | null;
    message: string;
  }>;
}

function lastMonths(total: number): string[] {
  const now = new Date();
  return Array.from({ length: total }, (_, index) => {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1),
    );
    return `${date.getUTCFullYear()}${
      String(date.getUTCMonth() + 1).padStart(2, "0")
    }`;
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

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

  const apiKey = Deno.env.get("PORTAL_TRANSPARENCIA_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "PORTAL_TRANSPARENCIA_API_KEY not configured",
      }),
      { status: 500, headers: jsonHeaders },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const logId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const { error: logStartError } = await supabase.from("sync_log").insert({
    id: logId,
    tipo: "beneficios_sociais",
    status: "running",
    detalhes: {
      version: 2,
      started_at: startedAt,
      fonte: "portal_transparencia",
    },
  });

  if (logStartError) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Falha ao iniciar log: ${logStartError.message}`,
      }),
      { status: 500, headers: jsonHeaders },
    );
  }

  try {
    const months = lastMonths(6);
    const runs: ProgramRun[] = [];
    let totalUpserted = 0;
    let totalNoData = 0;
    let totalErrors = 0;

    for (const program of PORTAL_BENEFIT_PROGRAMS) {
      const run: ProgramRun = {
        programa: program.codigo,
        endpoint: program.endpoint,
        upserted: [],
        noData: [],
        errors: [],
      };

      for (const mesAno of months) {
        const competencia = `${mesAno.slice(0, 4)}-${mesAno.slice(4)}`;

        try {
          const result = await fetchPortalBenefitData(
            program,
            mesAno,
            apiKey,
          );

          if (result.status === "no_data") {
            run.noData.push(competencia);
            totalNoData++;
          } else {
            const summary = summarizePortalBenefitItems(result.items);
            const sourceHash = await sha256Json(result.items);
            const collectedAt = new Date().toISOString();
            const { error: upsertError } = await supabase
              .from("beneficios_sociais_v2")
              .upsert(
                {
                  municipio: "Piracanjuba-GO",
                  municipio_ibge: PIRACANJUBA_IBGE,
                  programa_codigo: program.codigo,
                  competencia,
                  beneficiarios: summary.beneficiarios,
                  valor_pago: summary.valorPago,
                  unidade_medida: program.unidade,
                  fonte_codigo: "portal_transparencia",
                  fonte_nome: "Portal da Transparência do Governo Federal",
                  fonte_url:
                    `https://portaldatransparencia.gov.br/beneficios/${program.fonteSlug}?mesAno=${mesAno}&codigoIbge=${PIRACANJUBA_IBGE}`,
                  natureza_dado: "oficial",
                  raw_payload: result.items,
                  source_hash: sourceHash,
                  data_coleta: collectedAt,
                  observacoes: null,
                },
                {
                  onConflict:
                    "municipio_ibge,programa_codigo,competencia,fonte_codigo,natureza_dado",
                },
              );

            if (upsertError) {
              throw new Error(
                `Falha no upsert de ${program.codigo} ${competencia}: ${upsertError.message}`,
              );
            }

            run.upserted.push(competencia);
            totalUpserted++;
          }
        } catch (error) {
          const portalError = error instanceof PortalApiError ? error : null;
          run.errors.push({
            competencia,
            status: portalError?.status ?? null,
            message: errorMessage(error),
          });
          totalErrors++;

          if (
            portalError?.status === 401 ||
            portalError?.status === 403 ||
            portalError?.status === 404
          ) {
            break;
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      runs.push(run);
    }

    const status = totalErrors > 0 ? "partial" : "success";
    const details = {
      version: 2,
      source: "portal_transparencia",
      months,
      total_upserted: totalUpserted,
      total_no_data: totalNoData,
      total_errors: totalErrors,
      programs: runs,
    };

    const { error: logFinishError } = await supabase.from("sync_log").update({
      status,
      finished_at: new Date().toISOString(),
      detalhes: details,
    }).eq("id", logId);

    if (logFinishError) {
      throw new Error(`Falha ao finalizar log: ${logFinishError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: totalErrors === 0,
        status,
        ...details,
      }),
      {
        status: totalErrors > 0 ? 207 : 200,
        headers: jsonHeaders,
      },
    );
  } catch (error) {
    const message = errorMessage(error);

    await supabase.from("sync_log").update({
      status: "error",
      finished_at: new Date().toISOString(),
      detalhes: {
        version: 2,
        source: "portal_transparencia",
        error: message,
      },
    }).eq("id", logId);

    return new Response(
      JSON.stringify({ success: false, status: "error", error: message }),
      { status: 500, headers: jsonHeaders },
    );
  }
});
