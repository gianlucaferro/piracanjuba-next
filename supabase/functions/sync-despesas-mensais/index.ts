/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkCentiAuth } from "../_shared/centi-auth.ts";
import {
  canonicalizeMonthlyExpense,
  type RelatorioEmpenhos,
} from "../_shared/despesas-mensais.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, content-type, x-cron-secret, x-centi-ingest-secret",
};

const BASE_URL = "https://acessoainformacao.piracanjuba.go.gov.br";
const REPORT_URL = `${BASE_URL}/api`;
const REPORT_REFERER =
  `${BASE_URL}/cidadao/transparencia/cntdespesas`;
const MAX_COMPETENCIAS = 24;

type MultiRequestResponse = Record<string, unknown>;

function recentCompetencias(count = 24, now = new Date()): string[] {
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

function lastDay(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function formatDateBR(day: number, month: number, year: number): string {
  return [
    String(day).padStart(2, "0"),
    String(month).padStart(2, "0"),
    String(year),
  ].join("/");
}

async function fetchExpenseSummary(
  competencia: string,
): Promise<RelatorioEmpenhos | null> {
  const [yearText, monthText] = competencia.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const key = `mes_${year}_${String(month).padStart(2, "0")}`;
  const request = {
    [key]: {
      numero: 0,
      processo: 0,
      credor: "",
      cpf_cnpj: "",
      ano: year,
      valor_inicial: 0,
      valor_final: 0,
      id_orgao: 0,
      id_funcao: 0,
      licitacao: 0,
      elemento: "",
      sub_funcao: "",
      dp_acao: "",
      covid: "",
      data_inicio: formatDateBR(1, month, year),
      data_fim: formatDateBR(lastDay(year, month), month, year),
      acao: "centi/relatorioEmpenhos",
    },
  };
  const body = new URLSearchParams({
    multi_request: "true",
    params: JSON.stringify(request),
  });

  const response = await fetch(REPORT_URL, {
    method: "POST",
    headers: {
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "Accept-Language": "pt-BR,pt;q=0.9",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "Origin": BASE_URL,
      "Referer": REPORT_REFERER,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36 piracanjuba.ai/1.0",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: body.toString(),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    throw new Error(`NucleoGov despesas HTTP ${response.status}`);
  }
  const payload = await response.json() as MultiRequestResponse;
  const summary = payload[key];
  if (Array.isArray(summary) && summary.length === 0) return null;
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new Error("NucleoGov retornou relatório mensal inválido");
  }
  return summary as RelatorioEmpenhos;
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Método não permitido" }, 405);
  }
  if (!checkCentiAuth(request)) {
    return jsonResponse({ error: "Não autorizado" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  let logId: string | null = null;

  try {
    const body = await request.json().catch(() => ({}));
    const competencias = validateCompetencias(body?.competencias);
    const collectedAt = new Date().toISOString();
    const { data: log } = await supabase
      .from("sync_log")
      .insert({
        tipo: "despesas_mensais",
        status: "running",
        detalhes: { competencias },
      })
      .select("id")
      .single();
    logId = log?.id ?? null;

    const updated: Array<{ competencia: string; rows: number }> = [];
    const unavailable: string[] = [];
    const errors: Array<{ competencia: string; error: string }> = [];

    for (const competencia of competencias) {
      try {
        const summary = await fetchExpenseSummary(competencia);
        if (!summary) {
          unavailable.push(competencia);
          continue;
        }
        const row = canonicalizeMonthlyExpense(
          summary,
          competencia,
          collectedAt,
        );
        const { error } = await supabase
          .from("despesas_mensais")
          .upsert(row, { onConflict: "competencia" });
        if (error) throw error;
        updated.push({ competencia, rows: 1 });
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
      source: REPORT_REFERER,
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

    return jsonResponse(
      { success: status !== "error", status, ...details },
      status === "error" ? 502 : errors.length > 0 ? 207 : 200,
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
    return jsonResponse({ error: message }, 500);
  }
});
