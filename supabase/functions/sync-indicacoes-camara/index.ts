// Sync semanal de Indicacoes da Camara Municipal de Piracanjuba
// Fonte: portal LAI Centi via /api (Caminho J) - tipo INDICAÇÃO
//
// Cron: toda segunda-feira 06:00 UTC

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { centiListAll } from "../_shared/centi-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret",
};

const REFERER = "/atos_adm/mp/id=16";
const ACAO = "sgdocumentos/listar";

type CentiIndicacao = {
  total: string;
  label: string;
  chave: string;
  numero: string; // "INDICAÇÃO Nº 150/2026"
  tipo: string;
  data_publicacao: string; // "2026-03-23"
  ano: string;
  ementa: string;
  autor?: string;
  destinatario?: string;
};

function parseNumeroAno(numero: string): { numero_ano: number | null; ano_real: number | null } {
  // "INDICAÇÃO Nº 150/2026" → { numero_ano: 150, ano_real: 2026 }
  const m = numero.match(/(\d+)\/(\d{4})/);
  if (!m) return { numero_ano: null, ano_real: null };
  return {
    numero_ano: parseInt(m[1], 10),
    ano_real: parseInt(m[2], 10),
  };
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
    const { data: vereadores } = await supabase.from("vereadores").select("id, nome");
    const vereadorByNome = new Map<string, string>();
    for (const v of vereadores ?? []) {
      vereadorByNome.set(normalize(v.nome), v.id);
    }

    function matchVereador(nomeAutor?: string): string | null {
      if (!nomeAutor) return null;
      const norm = normalize(nomeAutor);
      if (vereadorByNome.has(norm)) return vereadorByNome.get(norm)!;
      const parts = norm.split(" ").filter((p) => p.length > 2);
      if (parts.length < 2) return null;
      const first = parts[0];
      const last = parts[parts.length - 1];
      for (const [vNome, vId] of vereadorByNome.entries()) {
        if (vNome.includes(first) && vNome.includes(last)) return vId;
      }
      return null;
    }

    // Pagina ate buscar tudo (filtra por tipo INDICAÇÃO)
    const indicacoes = await centiListAll<CentiIndicacao>(
      REFERER,
      ACAO,
      { extra: { tipo: "INDICAÇÃO" }, pageSize: 100, maxPages: 20 },
    );

    let inserted = 0;
    let updated = 0;
    let errors = 0;
    const errorSamples: string[] = [];

    for (const ind of indicacoes) {
      try {
        const { numero_ano, ano_real } = parseNumeroAno(ind.numero);
        const ano = ano_real || parseInt(ind.ano, 10) || null;
        const dataPub = ind.data_publicacao && /^\d{4}-\d{2}-\d{2}/.test(ind.data_publicacao)
          ? ind.data_publicacao.slice(0, 10)
          : null;

        const payload = {
          centi_chave: ind.chave,
          numero: ind.numero,
          numero_ano,
          ano,
          tipo: ind.tipo,
          data_publicacao: dataPub,
          ementa: ind.ementa,
          autor: ind.autor ?? null,
          destinatario: ind.destinatario ?? null,
          vereador_id: matchVereador(ind.autor),
          raw_payload: ind as unknown as Record<string, unknown>,
        };

        const { data: existing } = await supabase
          .from("indicacao_camara")
          .select("id")
          .eq("centi_chave", ind.chave)
          .maybeSingle();

        if (existing) {
          await supabase.from("indicacao_camara").update(payload).eq("id", existing.id);
          updated++;
        } else {
          await supabase.from("indicacao_camara").insert(payload);
          inserted++;
        }
      } catch (e) {
        errors++;
        if (errorSamples.length < 5) errorSamples.push(`${ind.chave}: ${e}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        duration_ms: Date.now() - startedAt,
        total_fetched: indicacoes.length,
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
