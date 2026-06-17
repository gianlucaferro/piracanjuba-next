import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Despesas (empenhos) da Camara Municipal. A API Centi nao tem endpoint de despesa
// pra camara (404), mas a pagina /despesas/orgao serve a tabela (idorgao=3). Mesmas
// colunas da prefeitura (Nr, Data, Credor, Valor, ...), porem sem <tbody> e com header.
const BASE_URL = "https://camarapiracanjuba.centi.com.br";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const ORGAO = 3; // camara

function parseBRL(str: string): number | null {
  if (!str || str.trim() === "") return null;
  const n = parseFloat(str.replace(/\./g, "").replace(",", ".").trim());
  return isNaN(n) ? null : n;
}

function parseDateBR(str: string): string | null {
  const m = (str || "").match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, "&");
}

interface Despesa {
  nr: string | null;
  data: string;
  credor: string;
  valor: number;
}

function parseDespesasHtml(html: string): Despesa[] {
  const out: Despesa[] = [];
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  for (const row of rows) {
    const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) =>
      decodeEntities(m[1].replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim()
    );
    // Colunas: Nr | Data | Credor | Valor | Anulacao | Vlr Liquidado | Vlr Pago | Saldo
    if (cells.length < 4) continue;
    const data = parseDateBR(cells[1]);
    const credor = cells[2];
    const valor = parseBRL(cells[3]);
    if (data && credor && credor.length > 2 && valor !== null && !/nenhum resultado/i.test(credor)) {
      out.push({ nr: cells[0] || null, data, credor, valor });
    }
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = { ...corsHeaders, "Content-Type": "application/json" };

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: log } = await sb
    .from("sync_log")
    .insert({ tipo: "camara-despesas", status: "running", detalhes: {} })
    .select("id")
    .single();
  const logId = log?.id;

  const body = await req.json().catch(() => ({}));
  const now = new Date();
  const anos: number[] = Array.isArray(body?.years) && body.years.length
    ? body.years.map((y: unknown) => Number(y))
    : [body?.ano ? Number(body.ano) : now.getFullYear()];

  const errors: string[] = [];
  let newCount = 0;

  try {
    for (const ano of anos) {
      const mesFim = ano < now.getFullYear() ? 12 : now.getMonth() + 1;
      for (let mes = 1; mes <= mesFim; mes++) {
        try {
          const lastDay = new Date(ano, mes, 0).getDate();
          const reqBody = new URLSearchParams({
            idorgao: String(ORGAO),
            datainicio: `01/${String(mes).padStart(2, "0")}/${ano}`,
            datafim: `${lastDay}/${String(mes).padStart(2, "0")}/${ano}`,
            ano: String(ano),
            pagina: "1",
            itensporpagina: "500",
          });
          const resp = await fetch(`${BASE_URL}/despesas/orgao`, {
            method: "POST",
            headers: {
              "User-Agent": UA,
              "Content-Type": "application/x-www-form-urlencoded",
              "X-Requested-With": "XMLHttpRequest",
            },
            body: reqBody.toString(),
          });
          if (!resp.ok) continue;
          const scraped = parseDespesasHtml(await resp.text());
          if (!scraped.length) continue;

          const mesStr = `${ano}-${String(mes).padStart(2, "0")}`;
          const { data: existing } = await sb
            .from("camara_despesas")
            .select("credor, data_pagamento, valor")
            .gte("data_pagamento", `${mesStr}-01`)
            .lte("data_pagamento", `${mesStr}-31`);
          const keys = new Set((existing || []).map((e: any) => `${e.credor}|${e.data_pagamento}|${e.valor}`));

          const toInsert = scraped
            .filter((d) => !keys.has(`${d.credor}|${d.data}|${d.valor}`))
            .map((d) => ({
              ano,
              mes,
              credor: d.credor,
              data_pagamento: d.data,
              valor: d.valor,
              descricao: d.nr ? `Empenho ${d.nr}` : null,
              fonte_url: `${BASE_URL}/despesas/orgao`,
            }));

          if (toInsert.length) {
            const { error } = await sb.from("camara_despesas").insert(toInsert);
            if (error) errors.push(`${ano}/${mes}: ${error.message}`);
            else newCount += toInsert.length;
          }
        } catch (e) {
          errors.push(`${ano}/${mes}: ${(e as Error).message?.slice(0, 120)}`);
        }
      }
    }

    const result = { new: newCount, anos, errors: errors.slice(0, 10) };
    if (logId) {
      await sb.from("sync_log").update({
        status: errors.length ? "partial" : "success",
        detalhes: result,
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }
    return new Response(JSON.stringify({ success: true, ...result }), { headers: json });
  } catch (error) {
    if (logId) {
      await sb.from("sync_log").update({
        status: "error",
        detalhes: { error: (error as Error).message },
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 500,
      headers: json,
    });
  }
});
