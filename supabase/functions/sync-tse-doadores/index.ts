// Sync de doadores de campanha (TSE Dados Abertos).
//
// O TSE distribui CSVs grandes por estado (~600MB descompactado pra GO).
// Esta funcao recebe o CSV ja filtrado por NM_UE=PIRACANJUBA via POST e
// faz insert idempotente em tse_doador_campanha + casa pessoa_publica_id
// por similaridade de nome (normalizado).
//
// Invocacao tipica (depois de baixar e filtrar o CSV localmente):
//
//   curl -X POST "$URL/functions/v1/sync-tse-doadores" \
//     -H "x-centi-ingest-secret: $INGEST" \
//     -H "Content-Type: text/csv" \
//     --data-binary @receitas_piracanjuba_2024.csv

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkCentiAuth } from "../_shared/centi-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret, x-centi-ingest-secret",
};

type DoadorRow = {
  ano_eleicao: number;
  cpf_candidato: string | null;
  nome_candidato: string;
  ds_cargo: string;
  sg_partido: string | null;
  cpf_cnpj_doador: string;
  nome_doador: string;
  tipo_doador: string | null;
  vr_receita: number;
  ds_recurso: string | null;
  dt_receita: string | null;
  raw_payload: Record<string, string>;
};

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parser CSV mínimo (separador ";", aspas duplas opcionais). */
function parseCsv(texto: string): { headers: string[]; rows: string[][] } {
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (linhas.length === 0) return { headers: [], rows: [] };
  const parse = (l: string): string[] => {
    const out: string[] = [];
    let buf = "";
    let aspas = false;
    for (const ch of l) {
      if (ch === '"') { aspas = !aspas; continue; }
      if (ch === ";" && !aspas) { out.push(buf); buf = ""; continue; }
      buf += ch;
    }
    out.push(buf);
    return out.map((c) => c.trim());
  };
  const headers = parse(linhas[0]);
  const rows = linhas.slice(1).map(parse);
  return { headers, rows };
}

function pickRow(headers: string[], linha: string[], rawAll: Record<string, string>): DoadorRow | null {
  const idx = (col: string) => headers.indexOf(col);
  const get = (col: string) => {
    const i = idx(col);
    return i >= 0 ? (linha[i] ?? "").trim() : "";
  };
  const cpfDoador = get("NR_CPF_CNPJ_DOADOR");
  const nomeDoador = get("NM_DOADOR") || get("NM_DOADOR_ORIGINARIO");
  const nomeCandidato = get("NM_CANDIDATO");
  const valor = Number((get("VR_RECEITA") || "0").replace(",", "."));
  if (!cpfDoador || !nomeDoador || !nomeCandidato || !Number.isFinite(valor)) return null;
  return {
    ano_eleicao: Number(get("ANO_ELEICAO")) || new Date().getFullYear(),
    cpf_candidato: get("NR_CPF_CANDIDATO") || null,
    nome_candidato: nomeCandidato,
    ds_cargo: get("DS_CARGO"),
    sg_partido: get("SG_PARTIDO") || null,
    cpf_cnpj_doador: cpfDoador,
    nome_doador: nomeDoador,
    tipo_doador:
      get("DS_TIPO_DOADOR") ||
      (cpfDoador.replace(/\D/g, "").length > 11 ? "Pessoa Jurídica" : "Pessoa Física"),
    vr_receita: valor,
    ds_recurso: get("DS_ORIGEM_RECEITA") || get("DS_NATUREZA_RECEITA") || null,
    dt_receita: (() => {
      const d = get("DT_RECEITA");
      if (!d) return null;
      // formatos comuns: DD/MM/YYYY ou YYYY-MM-DD
      const ddmmyyyy = d.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
      if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
      return d;
    })(),
    raw_payload: rawAll,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!checkCentiAuth(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const ctype = req.headers.get("content-type") ?? "";
  if (!ctype.includes("text/csv") && !ctype.includes("text/plain")) {
    return new Response(
      JSON.stringify({
        error: "Esperado Content-Type: text/csv (envie o CSV filtrado por --data-binary).",
        exemplo:
          "curl -X POST $URL -H 'Content-Type: text/csv' --data-binary @piracanjuba_2024.csv",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const texto = await req.text();
  const { headers, rows } = parseCsv(texto);
  if (headers.length === 0) {
    return new Response(JSON.stringify({ error: "CSV vazio ou invalido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const doadores: DoadorRow[] = [];
  for (const linha of rows) {
    const raw: Record<string, string> = {};
    headers.forEach((h, i) => (raw[h] = linha[i] ?? ""));
    const row = pickRow(headers, linha, raw);
    if (row) doadores.push(row);
  }

  // Casar pessoa_publica_id por nome normalizado
  const { data: pessoas } = await supabase
    .from("pessoa_publica")
    .select("id, nome, cpf");
  const nomeToId = new Map<string, string>();
  const cpfToId = new Map<string, string>();
  for (const p of pessoas ?? []) {
    nomeToId.set(normalizar(p.nome), p.id);
    if (p.cpf) cpfToId.set(p.cpf.replace(/\D/g, ""), p.id);
  }

  let inseridos = 0;
  let erros = 0;
  const batchSize = 200;
  for (let i = 0; i < doadores.length; i += batchSize) {
    const batch = doadores.slice(i, i + batchSize).map((d) => ({
      ...d,
      pessoa_publica_id:
        (d.cpf_candidato && cpfToId.get(d.cpf_candidato.replace(/\D/g, ""))) ||
        nomeToId.get(normalizar(d.nome_candidato)) ||
        null,
    }));
    const { error } = await supabase
      .from("tse_doador_campanha")
      .upsert(batch, {
        onConflict: "ano_eleicao,cpf_candidato,cpf_cnpj_doador,vr_receita,dt_receita",
        ignoreDuplicates: true,
      });
    if (error) erros++;
    else inseridos += batch.length;
  }

  return new Response(
    JSON.stringify({
      success: true,
      total_linhas_recebidas: rows.length,
      total_doadores_parseados: doadores.length,
      inseridos_aprox: inseridos,
      erros_batch: erros,
      candidatos_unicos: new Set(doadores.map((d) => d.cpf_candidato || d.nome_candidato)).size,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
