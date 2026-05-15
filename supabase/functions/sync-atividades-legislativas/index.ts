// Sync semanal de Atividades Legislativas (consolidado) via portal LAI Centi
// Cobre TODOS os tipos: PL Legislativo, PL Executivo, Decretos, Resolucoes, Emendas LO, Emendas

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { centiListAll } from "../_shared/centi-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret, x-centi-ingest-secret",
};

const REFERER = "/cidadao/legislacao/atividades_legislativas";
const ACAO = "atividades_legislativas/listar";

type CentiAtividade = {
  linha_id: string | number;
  modulo_id: string | number;
  modulo_nome: string;
  ato_tipo: string;
  numero: string;
  data_registro: string;   // "<b>Publicação:</b> 15/04/2026"
  parlamentar: string;     // "PODER EXECUTIVO" ou "Adriana Dias, Douglas Miranda..."
  descricao: string;       // HTML
  relator: string;
  tramitacao: string;
  situacao: string;
  ano: string | number | null;
  ato: string;             // "Projeto de Lei do Executivo 15/2026"
};

function stripHtml(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#8220;/gi, '"')
    .replace(/&#8221;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function extractDateBR(raw: string): string | null {
  if (!raw) return null;
  const m = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function extractYearFromAto(ato: string): number | null {
  const m = ato.match(/\/(\d{4})\b/);
  return m ? parseInt(m[1], 10) : null;
}

function parseAutores(raw: string): { autores: string[]; executivo: boolean } {
  if (!raw) return { autores: [], executivo: false };
  const norm = raw.trim();
  if (/^poder\s+executivo$/i.test(norm) || /executivo/i.test(norm) && norm.length < 30) {
    return { autores: [norm], executivo: true };
  }
  // Split por vírgula
  const parts = norm.split(/,\s*/).map((p) => p.trim()).filter((p) => p.length > 0);
  // Remover duplicatas
  const unique = [...new Set(parts)];
  return { autores: unique, executivo: false };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const CRON_SECRET = Deno.env.get("CRON_SECRET");
  const CENTI_INGEST_SECRET = Deno.env.get("CENTI_INGEST_SECRET");

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
    const atividades = await centiListAll<CentiAtividade>(REFERER, ACAO, { pageSize: 100, maxPages: 20 });

    let inserted = 0;
    let updated = 0;
    let errors = 0;
    const errorSamples: string[] = [];

    for (const a of atividades) {
      try {
        const linha_id = typeof a.linha_id === "string" ? parseInt(a.linha_id, 10) : a.linha_id;
        const modulo_id = typeof a.modulo_id === "string" ? parseInt(a.modulo_id, 10) : a.modulo_id;
        const numero_int = parseInt(String(a.numero), 10) || null;
        const ano = a.ano ? Number(a.ano) : extractYearFromAto(a.ato);
        const data_publicacao = extractDateBR(a.data_registro);
        const { autores, executivo } = parseAutores(a.parlamentar);

        const payload = {
          centi_linha_id: linha_id,
          modulo_id: modulo_id,
          modulo_nome: a.modulo_nome,
          ato_tipo: a.ato_tipo,
          numero: a.numero,
          numero_int,
          ano,
          ato_completo: a.ato,
          data_publicacao,
          parlamentar_raw: a.parlamentar,
          autores,
          autoria_executivo: executivo,
          descricao_html: a.descricao,
          descricao_texto: stripHtml(a.descricao),
          relator: a.relator === "." ? null : a.relator,
          tramitacao_html: a.tramitacao,
          situacao: a.situacao,
          raw_payload: a as unknown as Record<string, unknown>,
        };

        const { data: existing } = await supabase
          .from("atividade_legislativa")
          .select("id")
          .eq("centi_linha_id", linha_id)
          .maybeSingle();

        if (existing) {
          await supabase.from("atividade_legislativa").update(payload).eq("id", existing.id);
          updated++;
        } else {
          await supabase.from("atividade_legislativa").insert(payload);
          inserted++;
        }
      } catch (e) {
        errors++;
        if (errorSamples.length < 5) errorSamples.push(`${a.linha_id}: ${e}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        duration_ms: Date.now() - startedAt,
        total_fetched: atividades.length,
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
