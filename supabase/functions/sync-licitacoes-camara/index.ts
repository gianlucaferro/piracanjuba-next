import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { centiListAll } from "../_shared/centi-client.ts";
import { checkCentiAuth } from "../_shared/centi-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret, x-centi-ingest-secret",
};
const REFERER = "/cidadao/informacao/licitacoes_cnt";
const ACAO = "licitacoes_cnt/listar";

type CentiLicit = {
  label: string;
  modalidade: string; modalidade_id: string | number;
  situacao: string; situacao_id: string | number;
  orgao: string; orgao_id: number;
  numero: string; ano: number;
  data_publicacao?: string;
  data_abertura?: string;
  data_encerramento?: string;
  valor_estimado?: string;
  valor_homologado?: string;
  descricao?: string;
};

function parseDateBR(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}
function parseDateTimeBR(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:${m[6]}-03:00` : null;
}
function parseValorBR(s: string | null | undefined): number | null {
  if (!s) return null;
  const n = parseFloat(String(s).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!checkCentiAuth(req)) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const startedAt = Date.now();

  try {
    const licits = await centiListAll<CentiLicit>(REFERER, ACAO, {
      extra: { todas: "true" }, pageSize: 100, maxPages: 20,
    });

    let inserted = 0, updated = 0, errors = 0;
    const errorSamples: string[] = [];

    for (const l of licits) {
      try {
        const payload = {
          centi_label: l.label,
          numero: l.numero, ano: l.ano,
          modalidade: l.modalidade,
          modalidade_id: typeof l.modalidade_id === "string" ? parseInt(l.modalidade_id, 10) : l.modalidade_id,
          situacao: l.situacao,
          situacao_id: typeof l.situacao_id === "string" ? parseInt(l.situacao_id, 10) : l.situacao_id,
          orgao_id: l.orgao_id, orgao_nome: l.orgao,
          data_publicacao: parseDateBR(l.data_publicacao),
          data_abertura: parseDateTimeBR(l.data_abertura),
          data_encerramento: parseDateTimeBR(l.data_encerramento),
          valor_estimado: parseValorBR(l.valor_estimado),
          valor_homologado: parseValorBR(l.valor_homologado),
          descricao: l.descricao ?? null,
          raw_payload: l as unknown as Record<string, unknown>,
        };
        const { data: existing } = await supabase
          .from("licitacao_camara").select("id").eq("centi_label", l.label).maybeSingle();
        if (existing) {
          await supabase.from("licitacao_camara").update(payload).eq("id", existing.id);
          updated++;
        } else {
          await supabase.from("licitacao_camara").insert(payload);
          inserted++;
        }
      } catch (e) {
        errors++;
        if (errorSamples.length < 3) errorSamples.push(`${l.label}: ${e}`);
      }
    }

    return new Response(JSON.stringify({
      success: true, duration_ms: Date.now() - startedAt,
      total_fetched: licits.length, inserted, updated, errors, error_samples: errorSamples,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
