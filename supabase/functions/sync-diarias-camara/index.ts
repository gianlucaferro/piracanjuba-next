// Sync mensal de Diarias da Camara Municipal de Piracanjuba
// Fonte: portal LAI Centi via /api (Caminho J)
//
// Cron: dia 7 de cada mes 07:00 UTC (apos competencia fechar)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { centiListAll } from "../_shared/centi-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret",
};

const REFERER = "/cidadao/transparencia/diarias_cnt";
const ACAO = "diarias_cnt/listar";

type CentiDiaria = {
  id: number;
  id_empenho: number;
  id_orgao: number;
  orgao_nome: string | null;
  favorecido: string;
  cargo: string;
  destino: string;
  cidade: string;
  valor: number | string;
  data_inicio: string; // "DD/MM/YYYY"
  data_fim: string;
  quantidade: number | string;
  descricao: string;
};

function parseDateBR(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function parseNumber(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return v;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const CRON_SECRET = Deno.env.get("CRON_SECRET");
  const CENTI_INGEST_SECRET = Deno.env.get("CENTI_INGEST_SECRET");

  // Auth: cron secret, ingest secret ou service role
  const cronHeader = req.headers.get("x-cron-secret");
  const ingestHeader = req.headers.get("x-centi-ingest-secret");
  const authHeader = req.headers.get("authorization") ?? "";
  const isAuthorized =
    (CRON_SECRET && cronHeader === CRON_SECRET) ||
    (CENTI_INGEST_SECRET && ingestHeader === CENTI_INGEST_SECRET) ||
    authHeader.includes(SUPABASE_SERVICE_ROLE_KEY);

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const startedAt = Date.now();

  try {
    // Busca todos os vereadores pra match
    const { data: vereadores } = await supabase
      .from("vereadores")
      .select("id, nome");

    const vereadorByNome = new Map<string, string>();
    for (const v of vereadores ?? []) {
      vereadorByNome.set(normalize(v.nome), v.id);
    }

    // Helper: tenta matchear favorecido com vereador
    function matchVereador(favorecido: string): string | null {
      const norm = normalize(favorecido);
      // Match exato
      if (vereadorByNome.has(norm)) return vereadorByNome.get(norm)!;
      // Match parcial: primeiro+ultimo nome
      const parts = norm.split(" ").filter((p) => p.length > 2);
      if (parts.length < 2) return null;
      const first = parts[0];
      const last = parts[parts.length - 1];
      for (const [vNome, vId] of vereadorByNome.entries()) {
        if (vNome.includes(first) && vNome.includes(last)) return vId;
      }
      return null;
    }

    // Paginacao completa via Centi
    const diarias = await centiListAll<CentiDiaria>(REFERER, ACAO, { pageSize: 100, maxPages: 30 });

    let inserted = 0;
    let updated = 0;
    let errors = 0;
    const errorSamples: string[] = [];

    for (const d of diarias) {
      try {
        const vereador_id = matchVereador(d.favorecido);
        const payload = {
          centi_id: d.id,
          centi_id_empenho: d.id_empenho,
          favorecido: d.favorecido,
          cargo: d.cargo,
          destino: d.destino,
          cidade: d.cidade,
          valor: parseNumber(d.valor),
          data_inicio: parseDateBR(d.data_inicio),
          data_fim: parseDateBR(d.data_fim),
          quantidade: typeof d.quantidade === "number" ? d.quantidade : parseInt(String(d.quantidade), 10) || null,
          descricao: d.descricao,
          vereador_id,
          raw_payload: d as unknown as Record<string, unknown>,
        };

        const { data: existing } = await supabase
          .from("diaria_camara")
          .select("id")
          .eq("centi_id", d.id)
          .maybeSingle();

        if (existing) {
          await supabase.from("diaria_camara").update(payload).eq("id", existing.id);
          updated++;
        } else {
          await supabase.from("diaria_camara").insert(payload);
          inserted++;
        }
      } catch (e) {
        errors++;
        if (errorSamples.length < 5) errorSamples.push(`${d.id}: ${e}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        duration_ms: Date.now() - startedAt,
        total_fetched: diarias.length,
        inserted,
        updated,
        errors,
        error_samples: errorSamples,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err), duration_ms: Date.now() - startedAt }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
