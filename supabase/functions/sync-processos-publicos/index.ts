// Edge function: sincroniza processos judiciais de pessoas públicas via BigData Corp
// Cron bimestral (ver migration de cron). Custo estimado: ~R$ 0,07 × N pessoas / execução.
//
// Filtros obrigatórios (LGPD + segredo de justiça):
// - segredo_justica = TRUE  → não exibe
// - polo IN ('vitima','testemunha')  → não exibe
// - tipo_categoria = 'familia'  → não exibe

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const BIGDATA_URL = "https://plataforma.bigdatacorp.com.br/pessoas";
const CUSTO_POR_CONSULTA_BRL = 0.07; // People processes

// Mapeamento BigData → nosso enum
function mapTipoCategoria(rawTipo: string | null | undefined): string {
  if (!rawTipo) return "outro";
  const t = rawTipo.toLowerCase();
  if (t.includes("cível") || t.includes("civel")) return "civel";
  if (t.includes("criminal") || t.includes("penal")) return "criminal";
  if (t.includes("trabalh")) return "trabalhista";
  if (t.includes("eleitoral")) return "eleitoral";
  if (t.includes("tribut") || t.includes("fiscal")) return "tributario";
  if (t.includes("administra")) return "administrativo";
  if (t.includes("família") || t.includes("familia")) return "familia";
  return "outro";
}

function mapPolo(rawPolo: string | null | undefined): string {
  if (!rawPolo) return "interessado";
  const p = rawPolo.toLowerCase();
  if (p.includes("autor") || p.includes("requerente") || p.includes("ativo"))
    return "autor";
  if (p.includes("réu") || p.includes("reu") || p.includes("requerido") || p.includes("passivo"))
    return "reu";
  if (p.includes("vítima") || p.includes("vitima")) return "vitima";
  if (p.includes("testemunha")) return "testemunha";
  if (p.includes("terceiro")) return "terceiro";
  return "interessado";
}

function mapStatus(rawStatus: string | null | undefined): string {
  if (!rawStatus) return "ativo";
  const s = rawStatus.toLowerCase();
  if (s.includes("arquivad")) return "arquivado";
  if (s.includes("baixad")) return "baixado";
  if (s.includes("suspens")) return "suspenso";
  if (s.includes("julgad") || s.includes("transitad")) return "julgado";
  return "ativo";
}

function detectSegredo(proc: Record<string, unknown>): boolean {
  const flags = [
    proc.SecrecyLevel,
    proc.IsSegredoJustica,
    proc.SegredoJustica,
    proc.Confidential,
  ];
  return flags.some((f) =>
    f === true || f === "true" || f === 1 || (typeof f === "string" && f.toLowerCase().includes("segredo"))
  );
}

interface ProcessoBigData {
  Number?: string;
  CourtName?: string;
  CourtType?: string;
  State?: string;
  City?: string;
  Subject?: string;
  CourtDistrict?: string;
  Type?: string;
  PartyType?: string;
  Polarity?: string;
  PublicationDate?: string;
  LastUpdate?: string;
  Status?: string;
  Result?: string;
  Value?: number;
  [k: string]: unknown;
}

async function fetchProcessosBigData(
  cpf: string,
  accessToken: string,
  tokenId: string,
): Promise<{ processes: ProcessoBigData[]; requestId: string | null; error?: string }> {
  const body = {
    Datasets: "processes",
    q: `doc{${cpf}}`,
  };

  try {
    const resp = await fetch(BIGDATA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        AccessToken: accessToken,
        TokenId: tokenId,
      },
      body: JSON.stringify(body),
    });

    const data = await resp.json();
    const requestId = data?.RequestId ?? null;

    if (!resp.ok) {
      return { processes: [], requestId, error: data?.Message || `HTTP ${resp.status}` };
    }

    const result = data?.Result?.[0];
    const processesNode = result?.Processes;
    // BigData pode retornar como array direto ou como objeto com .Lawsuits
    const list: ProcessoBigData[] = Array.isArray(processesNode)
      ? processesNode
      : Array.isArray(processesNode?.Lawsuits)
        ? processesNode.Lawsuits
        : [];

    return { processes: list, requestId };
  } catch (err) {
    return { processes: [], requestId: null, error: String(err) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const BIGDATA_ACCESS_TOKEN = Deno.env.get("BIGDATA_ACCESS_TOKEN");
  const BIGDATA_TOKEN_ID = Deno.env.get("BIGDATA_TOKEN_ID");
  const CRON_SECRET = Deno.env.get("CRON_SECRET");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!BIGDATA_ACCESS_TOKEN || !BIGDATA_TOKEN_ID) {
    return new Response(
      JSON.stringify({ error: "BIGDATA_ACCESS_TOKEN/BIGDATA_TOKEN_ID não configurados nos secrets" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Authorize: cron secret OU service role (admin)
  const cronHeader = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("authorization") ?? "";
  const isAuthorized =
    (CRON_SECRET && cronHeader === CRON_SECRET) ||
    authHeader.includes(SUPABASE_SERVICE_ROLE_KEY);

  if (!isAuthorized) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Permite filtrar por cargo via query param (?cargo=vereador) pra testar incrementalmente
  const url = new URL(req.url);
  const cargoFilter = url.searchParams.get("cargo");
  const pessoaIdFilter = url.searchParams.get("pessoa_id");

  let query = supabase
    .from("pessoa_publica")
    .select("id, cpf, nome, cargo_categoria")
    .eq("ativo", true);

  if (cargoFilter) query = query.eq("cargo_categoria", cargoFilter);
  if (pessoaIdFilter) query = query.eq("id", pessoaIdFilter);

  const { data: pessoas, error: pessoasErr } = await query;

  if (pessoasErr) {
    return new Response(
      JSON.stringify({ error: pessoasErr.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!pessoas || pessoas.length === 0) {
    return new Response(
      JSON.stringify({ message: "Nenhuma pessoa pública ativa encontrada com os filtros." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const summary = {
    total_pessoas: pessoas.length,
    sucessos: 0,
    erros: 0,
    processos_encontrados: 0,
    processos_novos: 0,
    processos_atualizados: 0,
    processos_filtrados: 0,
    custo_total_brl: 0,
    detalhes: [] as Array<Record<string, unknown>>,
  };

  for (const pessoa of pessoas) {
    const cpfDigits = (pessoa.cpf || "").replace(/\D/g, "");
    if (cpfDigits.length !== 11) {
      summary.erros++;
      summary.detalhes.push({ pessoa_id: pessoa.id, erro: "CPF inválido" });
      continue;
    }

    const { processes, requestId, error: bdError } = await fetchProcessosBigData(
      cpfDigits,
      BIGDATA_ACCESS_TOKEN,
      BIGDATA_TOKEN_ID,
    );

    if (bdError) {
      summary.erros++;
      summary.detalhes.push({ pessoa_id: pessoa.id, nome: pessoa.nome, erro: bdError });
      await supabase.from("processo_sync_log").insert({
        pessoa_publica_id: pessoa.id,
        status: "error",
        erro: bdError,
        bigdata_request_id: requestId,
      });
      continue;
    }

    const encontrados = processes.length;
    let novos = 0;
    let atualizados = 0;
    let filtrados = 0;

    for (const proc of processes) {
      const segredo = detectSegredo(proc);
      const tipoCategoria = mapTipoCategoria(proc.Type || proc.CourtType);
      const polo = mapPolo(proc.Polarity || proc.PartyType);

      // Mesmo se for filtrar exibição, gravar como segredo_justica TRUE (auditoria)
      const willBeVisible = !segredo && polo !== "vitima" && polo !== "testemunha" && tipoCategoria !== "familia";
      if (!willBeVisible) filtrados++;

      const dataDistribuicao = proc.PublicationDate ? proc.PublicationDate.slice(0, 10) : null;
      const dataUltimaMov = proc.LastUpdate ? proc.LastUpdate.slice(0, 10) : null;
      const numero = proc.Number || null;

      if (!numero) continue; // skip se sem número de identificação

      const upsertPayload = {
        pessoa_publica_id: pessoa.id,
        numero_processo: numero,
        tribunal: proc.CourtName || proc.CourtType || null,
        comarca: proc.CourtDistrict || proc.City || null,
        uf: proc.State || null,
        classe: proc.Type || null,
        assunto: proc.Subject || null,
        tipo_categoria: tipoCategoria,
        polo,
        data_distribuicao: dataDistribuicao,
        data_ultima_movimentacao: dataUltimaMov,
        status: mapStatus(proc.Status as string),
        resultado: proc.Result || null,
        objeto_resumo: proc.Subject || null,
        valor_causa: proc.Value || null,
        segredo_justica: segredo,
        source: "bigdatacorp",
        raw_payload: proc,
        atualizado_em: new Date().toISOString(),
      };

      // Verifica se já existe
      const { data: existing } = await supabase
        .from("processo_judicial")
        .select("id")
        .eq("pessoa_publica_id", pessoa.id)
        .eq("numero_processo", numero)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("processo_judicial")
          .update(upsertPayload)
          .eq("id", existing.id);
        atualizados++;
      } else {
        await supabase.from("processo_judicial").insert(upsertPayload);
        novos++;
      }
    }

    summary.sucessos++;
    summary.processos_encontrados += encontrados;
    summary.processos_novos += novos;
    summary.processos_atualizados += atualizados;
    summary.processos_filtrados += filtrados;
    summary.custo_total_brl += CUSTO_POR_CONSULTA_BRL;
    summary.detalhes.push({
      pessoa_id: pessoa.id,
      nome: pessoa.nome,
      encontrados,
      novos,
      atualizados,
      filtrados,
    });

    await supabase.from("processo_sync_log").insert({
      pessoa_publica_id: pessoa.id,
      status: "success",
      processos_encontrados: encontrados,
      processos_novos: novos,
      processos_atualizados: atualizados,
      processos_filtrados: filtrados,
      bigdata_request_id: requestId,
      custo_brl: CUSTO_POR_CONSULTA_BRL,
    });
  }

  return new Response(JSON.stringify(summary, null, 2), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
