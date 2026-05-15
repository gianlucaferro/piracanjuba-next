// Sync unificado de Mocoes (id=21) + Requerimentos (id=14)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { centiListAll } from "../_shared/centi-client.ts";
import { checkCentiAuth, normalizeName } from "../_shared/centi-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret, x-centi-ingest-secret",
};

type CentiAto = {
  total: string;
  label: string;
  chave: string;
  numero: string;
  tipo: string;
  data_publicacao: string;
  ano: string;
  ementa: string;
  autor?: string;
};

const SOURCES = [
  { referer: "/atos_adm/mp/id=21", filtroTipo: "MOÇÃO", dbTipo: "MOCAO" },
  { referer: "/atos_adm/mp/id=14", filtroTipo: "REQUERIMENTO", dbTipo: "REQUERIMENTO" },
];

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
    function matchVereador(nome?: string): string | null {
      if (!nome) return null;
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

    let inserted = 0, updated = 0, errors = 0;
    const breakdown: Record<string, number> = {};

    for (const src of SOURCES) {
      const atos = await centiListAll<CentiAto>(src.referer, "sgdocumentos/listar", {
        extra: { tipo: src.filtroTipo }, pageSize: 100, maxPages: 10,
      });
      breakdown[src.dbTipo] = atos.length;

      for (const a of atos) {
        try {
          const ano = a.ano ? parseInt(a.ano, 10) : null;
          const dataPub = /^\d{4}-\d{2}-\d{2}/.test(a.data_publicacao) ? a.data_publicacao.slice(0, 10) : null;
          const payload = {
            centi_chave: a.chave,
            numero: a.numero, ano, tipo: src.dbTipo,
            tipo_centi: a.tipo,
            data_publicacao: dataPub,
            ementa: a.ementa,
            autor: a.autor ?? null,
            vereador_id: matchVereador(a.autor),
            raw_payload: a as unknown as Record<string, unknown>,
          };
          const { data: existing } = await supabase
            .from("ato_camara").select("id").eq("centi_chave", a.chave).maybeSingle();
          if (existing) {
            await supabase.from("ato_camara").update(payload).eq("id", existing.id);
            updated++;
          } else {
            await supabase.from("ato_camara").insert(payload);
            inserted++;
          }
        } catch (e) {
          errors++;
        }
      }
    }

    return new Response(JSON.stringify({
      success: true, duration_ms: Date.now() - startedAt,
      breakdown, inserted, updated, errors,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
