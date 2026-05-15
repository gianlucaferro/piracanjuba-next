// Sync mensal de Folha de Pagamento da Camara via portal LAI Centi
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { centiListAll } from "../_shared/centi-client.ts";
import { checkCentiAuth, normalizeName } from "../_shared/centi-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret, x-centi-ingest-secret",
};

const REFERER = "/cidadao/transparencia/servidores_cnt";
const ACAO = "servidores_cnt/listar";

function parseDateBR(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

type CentiServidor = {
  id: number;
  orgao_id: string | number;
  orgao: string;
  ano: string | number;
  mes: string | number;
  referencia: string;
  matricula: string;
  nome: string;
  cargo: string;
  data_admissao?: string;
  tipo_admissao?: string;
  lotacao?: string;
  tipo_folha?: string;
  tipo_movimentacao?: string;
  carga_horaria?: string;
  possui_estabilidade?: string;
  situacao?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!checkCentiAuth(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const startedAt = Date.now();

  try {
    const { data: vereadores } = await supabase.from("vereadores").select("id, nome");
    const vNomeMap = new Map<string, string>();
    for (const v of vereadores ?? []) vNomeMap.set(normalizeName(v.nome), v.id);

    function matchVereador(nome: string): string | null {
      const n = normalizeName(nome);
      if (vNomeMap.has(n)) return vNomeMap.get(n)!;
      const parts = n.split(" ").filter((p) => p.length > 2);
      if (parts.length < 2) return null;
      const first = parts[0], last = parts[parts.length - 1];
      for (const [vn, vid] of vNomeMap.entries()) {
        if (vn.includes(first) && vn.includes(last)) return vid;
      }
      return null;
    }

    // Pega ultimos 12 meses
    const all: CentiServidor[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ano = d.getFullYear();
      const mes = d.getMonth() + 1;
      const batch = await centiListAll<CentiServidor>(REFERER, ACAO, {
        extra: { ano: String(ano), mes: String(mes), orgao: "3" },
        pageSize: 100, maxPages: 5,
      });
      all.push(...batch);
    }

    let inserted = 0, updated = 0, errors = 0;
    const errorSamples: string[] = [];

    for (const s of all) {
      try {
        const ano = Number(s.ano);
        const mes = Number(s.mes);
        const payload = {
          centi_id: s.id, ano, mes,
          referencia: s.referencia,
          matricula: s.matricula,
          nome: s.nome,
          cargo: s.cargo,
          lotacao: s.lotacao ?? null,
          data_admissao: parseDateBR(s.data_admissao),
          tipo_admissao: s.tipo_admissao ?? null,
          tipo_folha: s.tipo_folha ?? null,
          tipo_movimentacao: s.tipo_movimentacao ?? null,
          situacao: s.situacao ?? null,
          carga_horaria: s.carga_horaria ?? null,
          possui_estabilidade: s.possui_estabilidade ?? null,
          vereador_id: matchVereador(s.nome),
          raw_payload: s as unknown as Record<string, unknown>,
        };

        const { data: existing } = await supabase
          .from("folha_servidor")
          .select("id")
          .eq("centi_id", s.id).eq("ano", ano).eq("mes", mes)
          .maybeSingle();

        if (existing) {
          await supabase.from("folha_servidor").update(payload).eq("id", existing.id);
          updated++;
        } else {
          await supabase.from("folha_servidor").insert(payload);
          inserted++;
        }
      } catch (e) {
        errors++;
        if (errorSamples.length < 3) errorSamples.push(`${s.id}: ${e}`);
      }
    }

    return new Response(JSON.stringify({
      success: true, duration_ms: Date.now() - startedAt,
      total_fetched: all.length, inserted, updated, errors, error_samples: errorSamples,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
