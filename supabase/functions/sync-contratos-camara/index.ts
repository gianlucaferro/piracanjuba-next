// Sync mensal de Contratos da Camara via portal LAI Centi

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { centiListAll } from "../_shared/centi-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret, x-centi-ingest-secret",
};

const REFERER = "/cidadao/informacao/contratos_cnt";
const ACAO = "contratos_cnt/listar";

type CentiContrato = {
  id: number;
  label: string;
  orgao: number;
  orgao_nome?: string;
  licitacao_id?: number;
  valor: string;     // "149.900,00"
  numero: string;
  ano: number;
  data_publicacao?: string;
  data_firmatura?: string;
  inicio_vigencia?: string;
  fim_vigencia?: string;
  fornecedor_nome: string;
  fornecedor_cpfcnpj: string;
  fiscal_contrato?: string;
  situacao?: string;
  objeto?: string;
  assunto?: string;
  tipo?: string;
  tipoa_juste?: string;
};

function parseDateBR(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

function parseValorBR(s: string | null | undefined): number | null {
  if (!s) return null;
  // "149.900,00" → 149900.00
  const norm = String(s).replace(/\./g, "").replace(",", ".");
  const n = parseFloat(norm);
  return Number.isFinite(n) ? n : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const CRON_SECRET = Deno.env.get("CRON_SECRET");
  const CENTI_INGEST_SECRET = Deno.env.get("CENTI_INGEST_SECRET");

  const isAuthorized =
    (CRON_SECRET && req.headers.get("x-cron-secret") === CRON_SECRET) ||
    (CENTI_INGEST_SECRET && req.headers.get("x-centi-ingest-secret") === CENTI_INGEST_SECRET) ||
    (req.headers.get("authorization") ?? "").includes(SUPABASE_SERVICE_ROLE_KEY);

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const startedAt = Date.now();

  try {
    // Itera por ano pra garantir paginacao completa
    const allContratos: CentiContrato[] = [];
    for (const ano of [2026, 2025, 2024, 2023]) {
      const batch = await centiListAll<CentiContrato>(REFERER, ACAO, {
        extra: { orgao: "", ano: String(ano) },
        pageSize: 100, maxPages: 10,
      });
      allContratos.push(...batch);
    }

    // Dedupe por centi_id
    const dedupMap = new Map<number, CentiContrato>();
    for (const c of allContratos) dedupMap.set(c.id, c);
    const contratos = Array.from(dedupMap.values());

    let inserted = 0;
    let updated = 0;
    let errors = 0;
    const errorSamples: string[] = [];

    for (const c of contratos) {
      try {
        const payload = {
          centi_id: c.id,
          label: c.label,
          numero: c.numero,
          numero_int: parseInt(c.numero, 10) || null,
          ano: c.ano,
          orgao_id: c.orgao,
          orgao_nome: c.orgao_nome ?? null,
          licitacao_id: c.licitacao_id ?? null,
          valor: parseValorBR(c.valor),
          data_publicacao: parseDateBR(c.data_publicacao),
          data_firmatura: parseDateBR(c.data_firmatura),
          inicio_vigencia: parseDateBR(c.inicio_vigencia),
          fim_vigencia: parseDateBR(c.fim_vigencia),
          fornecedor_nome: c.fornecedor_nome,
          fornecedor_cnpj: c.fornecedor_cpfcnpj,
          fiscal_contrato: c.fiscal_contrato ?? null,
          situacao: c.situacao ?? null,
          objeto: c.objeto ?? null,
          assunto: c.assunto ?? null,
          tipo: c.tipo ?? null,
          tipo_ajuste: c.tipoa_juste ?? null,
          raw_payload: c as unknown as Record<string, unknown>,
        };

        const { data: existing } = await supabase
          .from("contrato_camara")
          .select("id")
          .eq("centi_id", c.id)
          .maybeSingle();

        if (existing) {
          await supabase.from("contrato_camara").update(payload).eq("id", existing.id);
          updated++;
        } else {
          await supabase.from("contrato_camara").insert(payload);
          inserted++;
        }
      } catch (e) {
        errors++;
        if (errorSamples.length < 5) errorSamples.push(`${c.id}: ${e}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        duration_ms: Date.now() - startedAt,
        total_fetched: contratos.length,
        inserted, updated, errors, error_samples: errorSamples,
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
