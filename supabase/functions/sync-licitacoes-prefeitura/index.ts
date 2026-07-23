// Sync das licitacoes da PREFEITURA de Piracanjuba a partir do portal NucleoGov
// (acessoainformacao.piracanjuba.go.gov.br), que substituiu o Centi em 2026-07.
//
// Mesma plataforma/contrato do portal da Camara: POST /api com
//   multi_request=true&params={"<chave>":{"acao":"licitacoes_cnt/listar","limit":"<off>, <size>"}}
// Só muda o host (leg.br -> gov.br), por isso reusa o centi-client compartilhado.
//
// Idempotente: upsert em lote pela `chave` (id interno do portal). As linhas
// legadas do sync antigo (fonte='legado', chave NULL) nao sao tocadas.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { centiListAll, CENTI_BASE_PREFEITURA } from "../_shared/centi-client.ts";
import { checkCentiAuth } from "../_shared/centi-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret, x-centi-ingest-secret",
};

const REFERER = "/cidadao/informacao/licitacoes_cnt";
const ACAO = "licitacoes_cnt/listar";
const FONTE_URL = `${CENTI_BASE_PREFEITURA}/cidadao/informacao/licitacoes_cnt`;
const CHUNK = 100;

type NucleoLicit = {
  label?: string;
  modalidade?: string;
  modalidade_id?: string | number;
  situacao?: string;
  situacao_id?: string | number;
  orgao?: string;
  orgao_id?: number;
  numero?: string;
  ano?: number;
  data_publicacao?: string | null;
  data_abertura?: string | null;
  data_encerramento?: string | null;
  valor_estimado?: string | null;
  descricao?: string | null;
  chave?: number;
};

/** "20/07/2026" -> "2026-07-20" */
function parseDateBR(s?: string | null): string | null {
  if (!s) return null;
  const m = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/** "21/08/2026 08:00" (segundos opcionais) -> ISO com offset de Brasilia */
function parseDateTimeBR(s?: string | null): string | null {
  if (!s) return null;
  const m = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  const [, d, mo, y, hh, mi, ss] = m;
  if (!hh) return `${y}-${mo}-${d}T00:00:00-03:00`;
  return `${y}-${mo}-${d}T${hh}:${mi}:${ss ?? "00"}-03:00`;
}

/** O portal usa "Sigiloso" quando o valor estimado nao e publico (Lei 14.133 art. 24). */
function isSigiloso(s?: string | null): boolean {
  return !!s && /sigilos/i.test(String(s));
}

/** "1.234.567,89" -> 1234567.89 */
function parseValorBR(s?: string | null): number | null {
  if (!s || isSigiloso(s)) return null;
  const limpo = String(s).replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(limpo);
  return Number.isFinite(n) ? n : null;
}

function toInt(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!checkCentiAuth(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const startedAt = Date.now();

  // O portal serve licitacoes e dispensas/inexigibilidades pela MESMA acao,
  // alternando a flag `dispensas`. Sao ~554 licitacoes e ~5.781 dispensas.
  // A API e lenta (500 registros ~57s), por isso o volume e limitado por body.
  let body: { dispensas?: number; pageSize?: number; maxPages?: number } = {};
  try {
    body = req.method === "POST" ? await req.json() : {};
  } catch {
    // body vazio e valido (cron chama com {})
  }
  const isDispensa = Number(body.dispensas ?? 0) === 1;
  const pageSize = Math.min(Math.max(Number(body.pageSize ?? 100), 10), 500);
  const maxPages = Math.min(Math.max(Number(body.maxPages ?? 30), 1), 60);

  try {
    const licits = await centiListAll<NucleoLicit>(REFERER, ACAO, {
      base: CENTI_BASE_PREFEITURA,
      extra: { dispensas: isDispensa ? "1" : "0" },
      pageSize,
      maxPages,
    });

    // Sem `chave` nao ha como fazer upsert idempotente: descarta e reporta.
    const semChave = licits.filter((l) => toInt(l.chave) === null).length;
    const validas = licits.filter((l) => toInt(l.chave) !== null);

    // Dedup defensivo: se o portal repetir a mesma chave na paginacao, o upsert
    // em lote falharia ("ON CONFLICT ... affect row a second time").
    const porChave = new Map<number, NucleoLicit>();
    for (const l of validas) porChave.set(toInt(l.chave)!, l);

    const rows = [...porChave.values()].map((l) => ({
      chave: toInt(l.chave),
      numero: l.label ?? l.numero ?? null,
      ano: toInt(l.ano),
      modalidade: l.modalidade ?? null,
      modalidade_id: toInt(l.modalidade_id),
      status: l.situacao ?? null,
      situacao_id: toInt(l.situacao_id),
      orgao_id: toInt(l.orgao_id),
      orgao_nome: l.orgao ?? null,
      objeto: l.descricao ?? null,
      data_publicacao: parseDateBR(l.data_publicacao),
      data_abertura: parseDateTimeBR(l.data_abertura),
      data_encerramento: parseDateTimeBR(l.data_encerramento),
      valor_estimado: parseValorBR(l.valor_estimado),
      valor_sigiloso: isSigiloso(l.valor_estimado),
      tipo: isDispensa ? "dispensa" : "licitacao",
      fonte: "nucleogov",
      fonte_url: FONTE_URL,
      raw_payload: l as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    }));

    let upserted = 0;
    const erros: string[] = [];

    for (let i = 0; i < rows.length; i += CHUNK) {
      const lote = rows.slice(i, i + CHUNK);
      const { error } = await supabase
        .from("licitacoes")
        .upsert(lote, { onConflict: "chave" });
      if (error) {
        if (erros.length < 3) erros.push(`lote ${i / CHUNK + 1}: ${error.message}`);
      } else {
        upserted += lote.length;
      }
    }

    const ok = erros.length === 0;
    return new Response(
      JSON.stringify({
        success: ok,
        tipo: isDispensa ? "dispensa" : "licitacao",
        duration_ms: Date.now() - startedAt,
        total_fetched: licits.length,
        duplicadas_ignoradas: validas.length - porChave.size,
        sem_chave_descartadas: semChave,
        upserted,
        erros,
      }),
      {
        status: ok ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err), duration_ms: Date.now() - startedAt }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
