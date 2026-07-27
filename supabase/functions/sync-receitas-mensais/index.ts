/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkCentiAuth } from "../_shared/centi-auth.ts";
import {
  canonicalizeMonthlyRevenue,
  type ReceitaCentiItem,
} from "../_shared/receitas-mensais.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, content-type, x-cron-secret, x-centi-ingest-secret",
};

const BASE_URL = "https://acessoainformacao.piracanjuba.go.gov.br";
const RECEITAS_URL = `${BASE_URL}/api/centi`;
const RECEITAS_REFERER =
  `${BASE_URL}/cidadao/transparencia/cntreceitas`;
const ORGAO_EXECUTIVO = "22";
const MAX_COMPETENCIAS = 24;

type CentiReceitasResponse = {
  dados?: ReceitaCentiItem[];
  mes?: string;
  ano?: string;
  error?: string | null;
};

function recentCompetencias(count = 6, now = new Date()): string[] {
  const competencias: string[] = [];
  for (let offset = 0; offset < count; offset++) {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1),
    );
    competencias.push(
      `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
    );
  }
  return competencias;
}

function validateCompetencias(value: unknown): string[] {
  const raw = Array.isArray(value) && value.length > 0
    ? value
    : recentCompetencias();
  if (raw.length > MAX_COMPETENCIAS) {
    throw new Error(`Máximo de ${MAX_COMPETENCIAS} competências por execução`);
  }

  const competencias = [...new Set(raw.map(String))];
  for (const competencia of competencias) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia)) {
      throw new Error(`Competência inválida: ${competencia}`);
    }
  }
  return competencias.sort().reverse();
}

async function fetchReceitas(
  competencia: string,
): Promise<ReceitaCentiItem[]> {
  const [ano, mes] = competencia.split("-");
  const body = new URLSearchParams({
    acao: "receitas",
    ano,
    mes,
    orgao: ORGAO_EXECUTIVO,
  });

  const response = await fetch(RECEITAS_URL, {
    method: "POST",
    headers: {
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "Accept-Language": "pt-BR,pt;q=0.9",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "Origin": BASE_URL,
      "Referer": RECEITAS_REFERER,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36 piracanjuba.ai/1.0",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: body.toString(),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    throw new Error(`NucleoGov HTTP ${response.status}`);
  }

  const payload = await response.json() as CentiReceitasResponse;
  if (payload.error) {
    throw new Error(`NucleoGov: ${payload.error.slice(0, 300)}`);
  }
  if (!Array.isArray(payload.dados)) {
    throw new Error("NucleoGov retornou schema de receitas inválido");
  }
  return payload.dados;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método não permitido" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
  if (!checkCentiAuth(request)) {
    return new Response(
      JSON.stringify({ error: "Não autorizado" }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRole);

  let logId: string | null = null;
  try {
    const body = await request.json().catch(() => ({}));
    const competencias = validateCompetencias(body?.competencias);
    const { data: log } = await supabase
      .from("sync_log")
      .insert({
        tipo: "receitas_mensais",
        status: "running",
        detalhes: { competencias },
      })
      .select("id")
      .single();
    logId = log?.id ?? null;

    const updated: Array<{ competencia: string; rows: number }> = [];
    const unavailable: string[] = [];
    const errors: Array<{ competencia: string; error: string }> = [];
    const collectedAt = new Date().toISOString();

    for (const competencia of competencias) {
      try {
        const sourceRows = await fetchReceitas(competencia);
        if (sourceRows.length === 0) {
          unavailable.push(competencia);
          continue;
        }

        const canonicalRows = canonicalizeMonthlyRevenue(
          sourceRows,
          competencia,
        ).map((row) => ({ ...row, data_coleta: collectedAt }));
        if (canonicalRows.length === 0) {
          throw new Error("Nenhuma categoria canônica foi produzida");
        }

        const { error } = await supabase
          .from("receitas_mensais")
          .upsert(canonicalRows, {
            onConflict: "competencia,esfera,categoria",
          });
        if (error) throw error;
        updated.push({ competencia, rows: canonicalRows.length });
      } catch (error) {
        errors.push({
          competencia,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const status = errors.length === 0
      ? "success"
      : updated.length > 0
      ? "partial"
      : "error";
    const details = {
      source: RECEITAS_REFERER,
      requested: competencias.length,
      updated,
      unavailable,
      errors,
    };

    if (logId) {
      await supabase.from("sync_log").update({
        status,
        detalhes: details,
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }

    return new Response(
      JSON.stringify({ success: status !== "error", status, ...details }),
      {
        status: status === "error" ? 502 : errors.length > 0 ? 207 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (logId) {
      await supabase.from("sync_log").update({
        status: "error",
        detalhes: { error: message },
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
