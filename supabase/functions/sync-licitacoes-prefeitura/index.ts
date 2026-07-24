/// <reference lib="deno.ns" />

// Sync das licitacoes da PREFEITURA de Piracanjuba a partir do portal NucleoGov
// (acessoainformacao.piracanjuba.go.gov.br), que substituiu o Centi em 2026-07.
//
// Mesma plataforma/contrato do portal da Camara: POST /api com
//   multi_request=true&params={"<chave>":{"acao":"licitacoes_cnt/listar","limit":"<off>, <size>"}}
// Só muda o host (leg.br -> gov.br), por isso reusa o centi-client compartilhado.
//
// Idempotente: upsert em lote pela `chave` (id interno do portal). As linhas
// legadas do sync antigo (fonte='legado', chave NULL) nao sao tocadas.

// deno-lint-ignore no-import-prefix
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  CENTI_BASE_PREFEITURA,
  centiListAllWithMeta,
} from "../_shared/centi-client.ts";
import { checkCentiAuth } from "../_shared/centi-auth.ts";
import { assertPersistenceSucceeded } from "../_shared/persistence-guards.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, content-type, x-cron-secret, x-centi-ingest-secret",
};

const REFERER = "/cidadao/transparencia/licitacoes_cnt";
const ACAO = "licitacoes_cnt/listar";
const FONTE_URL =
  `${CENTI_BASE_PREFEITURA}/cidadao/transparencia/licitacoes_cnt`;
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
  const m = String(s).match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/,
  );
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
  const limpo = String(s).replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(
    ",",
    ".",
  );
  const n = parseFloat(limpo);
  return Number.isFinite(n) ? n : null;
}

function toInt(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
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
  let body: {
    dispensas?: number;
    year?: number;
    pageSize?: number;
    maxPages?: number;
    allYears?: boolean;
  } = {};
  try {
    const parsed = req.method === "POST" ? await req.json() : {};
    body = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    // body vazio e valido (cron chama com {})
  }
  const isDispensa = Number(body.dispensas ?? 0) === 1;
  const parseBounded = (
    value: unknown,
    fallback: number,
    min: number,
    max: number,
  ) => {
    if (value === null || value === undefined || value === "") return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
      throw new Error(`Parametro inteiro invalido: ${String(value)}`);
    }
    return parsed;
  };
  let pageSize: number;
  let maxPages: number;
  let year: number | null;
  try {
    pageSize = parseBounded(body.pageSize, 100, 10, 500);
    maxPages = parseBounded(body.maxPages, 30, 1, 60);
    year = (isDispensa && body.allYears !== true) ||
        body.year !== undefined
      ? parseBounded(
        body.year,
        new Date().getUTCFullYear(),
        2000,
        new Date().getUTCFullYear(),
      )
      : null;
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
  const tipo = isDispensa ? "dispensa" : "licitacao";
  const scope = year === null ? tipo : `${tipo}:${year}`;
  const { data: logEntry, error: logError } = await supabase
    .from("sync_log")
    .insert({
      tipo: "sync-licitacoes-prefeitura",
      status: "running",
      detalhes: { tipo, scope, source: "nucleogov" },
    })
    .select("id")
    .single();
  if (logError) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `sync_log: ${logError.message}`,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
  const logId = logEntry?.id;

  try {
    const result = await centiListAllWithMeta<NucleoLicit>(REFERER, ACAO, {
      base: CENTI_BASE_PREFEITURA,
      extra: {
        dispensas: isDispensa ? "1" : "0",
        ...(year === null ? {} : { ano: String(year) }),
      },
      pageSize,
      maxPages,
    });
    const licits = result.dados;
    if (licits.length === 0 && result.total !== 0) {
      throw new Error("Fonte retornou vazio sem total zero");
    }

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
        if (erros.length < 3) {
          erros.push(`lote ${i / CHUNK + 1}: ${error.message}`);
        }
      } else {
        upserted += lote.length;
      }
    }

    const persistedAll = result.total === 0 ||
      (rows.length > 0 && upserted === rows.length);
    const complete = result.complete && semChave === 0 &&
      erros.length === 0 && persistedAll;
    const ok = erros.length === 0 && complete;
    const status = erros.length > 0
      ? "error"
      : complete
      ? "success"
      : "partial";
    const details = {
      tipo,
      scope,
      source: "nucleogov",
      source_total: result.total,
      total_fetched: licits.length,
      pages_fetched: result.pagesFetched,
      max_pages_reached: result.maxPagesReached,
      source_complete: result.complete,
      complete,
      duplicadas_ignoradas: validas.length - porChave.size,
      sem_chave_descartadas: semChave,
      upserted,
      erros,
      duration_ms: Date.now() - startedAt,
    };
    const { error: stateError } = await supabase.from("prefeitura_sync_state")
      .upsert({
        dataset: tipo,
        scope,
        fetched: licits.length,
        source_total: result.total,
        complete,
        checked_at: new Date().toISOString(),
      }, { onConflict: "dataset,scope" });
    assertPersistenceSucceeded("prefeitura_sync_state", stateError);
    if (logId) {
      const { error: finishError } = await supabase.from("sync_log").update({
        status,
        detalhes: details,
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
      assertPersistenceSucceeded("sync_log finish", finishError);
    }
    return new Response(
      JSON.stringify({
        success: ok,
        status,
        ...details,
      }),
      {
        status: erros.length > 0 ? 500 : complete ? 200 : 206,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    if (logId) {
      await supabase.from("sync_log").update({
        status: "error",
        detalhes: {
          tipo,
          scope,
          source: "nucleogov",
          error,
          duration_ms: Date.now() - startedAt,
        },
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }
    return new Response(
      JSON.stringify({
        success: false,
        error,
        duration_ms: Date.now() - startedAt,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
