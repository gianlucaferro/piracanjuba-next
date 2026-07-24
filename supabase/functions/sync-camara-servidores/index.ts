/// <reference lib="deno.ns" />
// deno-lint-ignore no-import-prefix
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkCentiAuth } from "../_shared/centi-auth.ts";
import {
  planLegacyOriginAdoptions,
  servidorOriginKey,
} from "../_shared/servidor-origin.ts";
import {
  assertPersistenceSucceeded,
  mapIdsByOrigin,
} from "../_shared/persistence-guards.ts";
import {
  CENTI_BASE_CAMARA,
  centiListAllWithMeta,
} from "../_shared/centi-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-cron-secret, x-centi-ingest-secret, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL = CENTI_BASE_CAMARA;
const SOURCE_URL = `${BASE_URL}/cidadao/transparencia/servidores_cnt`;

function parseBRL(str: string): number | null {
  if (!str || str.trim() === "") return null;
  const cleaned = str.replace("R$", "").replace(/\./g, "").replace(",", ".")
    .trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

type JsonRecord = Record<string, unknown>;

interface ScrapedServidor {
  portalId: number;
  matricula: string;
  nome: string;
  cargo: string | null;
  bruto: number | null;
  liquido: number | null;
  tipoFolha: string;
  lotacao: string | null;
  dataAdmissao: string | null;
  tipoAdmissao: string | null;
  decreto: string | null;
  cargaHoraria: string | null;
  situacao: string | null;
  origemChave: string;
}

function optionalText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function parsePortalDate(value: unknown): string | null {
  const text = optionalText(value);
  if (!text) return null;
  const br = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) {
    const [, day, month, year] = br;
    const iso = `${year}-${month}-${day}`;
    const date = new Date(`${iso}T00:00:00Z`);
    if (
      date.getUTCFullYear() === Number(year) &&
      date.getUTCMonth() + 1 === Number(month) &&
      date.getUTCDate() === Number(day)
    ) {
      return iso;
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  throw new Error(`Data de admissão inválida na Câmara: ${text}`);
}

function parsePortalRow(row: JsonRecord): ScrapedServidor | null {
  const portalId = Number(row.id);
  const matricula = optionalText(row.matricula);
  const nome = optionalText(row.nome);
  if (!Number.isInteger(portalId) || portalId <= 0 || !matricula || !nome) {
    return null;
  }

  const bruto = parseBRL(String(row.total_proventos ?? ""));
  const descontos = parseBRL(String(row.total_descontos ?? ""));
  const liquidoFonte = parseBRL(String(row.total_liquido ?? ""));
  const liquido = liquidoFonte ??
    (bruto !== null && descontos !== null
      ? Math.round((bruto - descontos) * 100) / 100
      : null);

  return {
    portalId,
    matricula,
    nome,
    cargo: optionalText(row.cargo),
    bruto,
    liquido,
    tipoFolha: optionalText(row.tipo_folha)?.toUpperCase() || "MENSAL",
    lotacao: optionalText(row.lotacao),
    dataAdmissao: parsePortalDate(row.data_admissao),
    tipoAdmissao: optionalText(row.tipo_admissao),
    decreto: optionalText(row.decreto),
    cargaHoraria: optionalText(row.carga_horaria),
    situacao: optionalText(row.situacao),
    origemChave: servidorOriginKey("camara", "nucleogov", portalId),
  };
}

async function fetchFolha(
  mes: number,
  ano: number,
): Promise<{
  dados: ScrapedServidor[];
  total: number | null;
  complete: boolean;
}> {
  const result = await centiListAllWithMeta<JsonRecord>(
    "/cidadao/transparencia/servidores_cnt",
    "servidores_cnt/listar",
    {
      base: CENTI_BASE_CAMARA,
      extra: { ano: String(ano), mes: String(mes) },
      pageSize: 100,
      maxPages: 30,
    },
  );
  const dados = result.dados
    .map(parsePortalRow)
    .filter((row): row is ScrapedServidor => row !== null);
  if (result.dados.length > 0 && dados.length !== result.dados.length) {
    throw new Error(
      `Folha Câmara descartou ${
        result.dados.length - dados.length
      } registros sem identidade`,
    );
  }
  return {
    dados,
    total: result.total,
    complete: result.complete,
  };
}

function previousMonth(now = new Date()) {
  const date = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  );
  return {
    ano: date.getUTCFullYear(),
    mes: date.getUTCMonth() + 1,
  };
}

async function fetchMostRecentFolha(
  requestedYear: number,
  requestedMonth: number,
  forced: boolean,
) {
  const attempts = forced ? 1 : 4;
  for (let fallback = 0; fallback < attempts; fallback++) {
    const date = new Date(Date.UTC(
      requestedYear,
      requestedMonth - 1 - fallback,
      1,
    ));
    const ano = date.getUTCFullYear();
    const mes = date.getUTCMonth() + 1;
    const result = await fetchFolha(mes, ano);
    if (result.dados.length > 0 || forced && result.total === 0) {
      return {
        ...result,
        ano,
        mes,
        competencia: `${ano}-${String(mes).padStart(2, "0")}`,
      };
    }
  }
  throw new Error("Nenhuma competência recente da Câmara encontrada");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (!checkCentiAuth(req)) {
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const url = new URL(req.url);
  const mesParam = url.searchParams.get("mes");
  const anoParam = url.searchParams.get("ano");
  if ((mesParam && !anoParam) || (!mesParam && anoParam)) {
    return new Response(
      JSON.stringify({ success: false, error: "Informe mes e ano juntos" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
  const fallback = previousMonth();
  const requestedMonth = mesParam
    ? Number.parseInt(mesParam, 10)
    : fallback.mes;
  const requestedYear = anoParam ? Number.parseInt(anoParam, 10) : fallback.ano;
  if (
    !Number.isInteger(requestedMonth) || requestedMonth < 1 ||
    requestedMonth > 12 || !Number.isInteger(requestedYear) ||
    requestedYear < 2000 || requestedYear > new Date().getUTCFullYear()
  ) {
    return new Response(
      JSON.stringify({ success: false, error: "Competência inválida" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
  const forced = Boolean(mesParam && anoParam);
  const requestedCompetencia = `${requestedYear}-${
    String(requestedMonth).padStart(2, "0")
  }`;

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: log, error: logStartError } = await sb.from("sync_log")
    .insert({
      tipo: "camara_servidores",
      status: "running",
      detalhes: { requestedCompetencia, forced },
    })
    .select("id").single();
  if (logStartError) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `sync_log start: ${logStartError.message}`,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
  const logId = log?.id;

  try {
    const source = await fetchMostRecentFolha(
      requestedYear,
      requestedMonth,
      forced,
    );
    const { ano, mes, competencia } = source;
    if (!source.complete) {
      throw new Error(
        `Folha Câmara incompleta: ${source.dados.length}/${
          source.total ?? "?"
        }`,
      );
    }

    // Deduplicate pelo vínculo e tipo de folha. Nome não identifica pessoa.
    const seen = new Map<string, number>();
    const all: ScrapedServidor[] = [];
    for (const servidor of source.dados) {
      const remunerationKey =
        `${servidor.origemChave}\u0000${servidor.tipoFolha}`;
      const existingIdx = seen.get(remunerationKey);
      if (existingIdx === undefined) {
        seen.set(remunerationKey, all.length);
        all.push(servidor);
      } else if (
        servidor.bruto !== null && all[existingIdx].bruto === null
      ) {
        all[existingIdx] = servidor;
      }
    }
    console.log(`Total unique Câmara: ${all.length}`);

    const servidoresPorOrigem = new Map<string, ScrapedServidor>();
    for (const servidor of all) {
      const existing = servidoresPorOrigem.get(servidor.origemChave);
      if (!existing || (!existing.cargo && servidor.cargo)) {
        servidoresPorOrigem.set(servidor.origemChave, servidor);
      }
    }
    const serverEntries = [...servidoresPorOrigem.values()];

    // Adota o ID historico apenas quando nome e origem formam uma
    // correspondencia 1 para 1. Homonimos permanecem separados.
    const { data: storedCamara, error: storedCamaraError } = await sb
      .from("servidores")
      .select("id, nome, origem_chave")
      .eq("orgao_tipo", "camara")
      .limit(1000);
    if (storedCamaraError) {
      throw new Error(`Busca identidades Câmara: ${storedCamaraError.message}`);
    }
    const adoptions = planLegacyOriginAdoptions(
      serverEntries,
      storedCamara || [],
      "camara:nome:",
    );
    for (const adoption of adoptions) {
      const { error } = await sb.from("servidores")
        .update({
          origem_chave: adoption.nextOrigin,
          fonte_url: SOURCE_URL,
          updated_at: new Date().toISOString(),
        })
        .eq("id", adoption.id)
        .eq("origem_chave", adoption.previousOrigin)
        .select("id")
        .single();
      if (error) {
        throw new Error(
          `Adoção de identidade ${adoption.id}: ${error.message}`,
        );
      }
    }
    console.log(`Identidades históricas adotadas: ${adoptions.length}`);

    // Batch upsert servidores with orgao_tipo = 'camara'
    const BATCH = 200;
    const srvBatches: PromiseLike<void>[] = [];
    for (let i = 0; i < serverEntries.length; i += BATCH) {
      const batch = serverEntries.slice(i, i + BATCH).map((s) => ({
        nucleogov_portal_id: s.portalId,
        nome: s.nome,
        cargo: s.cargo,
        matricula: s.matricula,
        lotacao: s.lotacao,
        data_admissao: s.dataAdmissao,
        tipo_admissao: s.tipoAdmissao,
        decreto_admissao: s.decreto,
        carga_horaria: s.cargaHoraria,
        situacao_funcional: s.situacao,
        fonte_url: SOURCE_URL,
        orgao_tipo: "camara",
        origem_chave: s.origemChave,
      }));
      srvBatches.push(
        sb.from("servidores").upsert(batch, { onConflict: "origem_chave" })
          .then(({ error }) => {
            if (error) throw new Error(`Srv batch ${i}: ${error.message}`);
          }),
      );
    }
    await Promise.all(srvBatches);

    // Resolve IDs somente pelas mesmas chaves usadas no upsert.
    const dbSrvs: { id: string; origem_chave: string }[] = [];
    const originKeys = serverEntries.map((row) => row.origemChave);
    for (let i = 0; i < originKeys.length; i += BATCH) {
      const { data, error } = await sb.from("servidores")
        .select("id, origem_chave")
        .in("origem_chave", originKeys.slice(i, i + BATCH));
      if (error) throw new Error(`Busca servidores ${i}: ${error.message}`);
      dbSrvs.push(...(data || []));
    }
    const originMap = mapIdsByOrigin(dbSrvs, originKeys);
    console.log(`originMap Câmara: ${originMap.size}`);

    // Build remunerações and upsert
    const rems = all
      .filter((s) => s.bruto !== null && originMap.has(s.origemChave))
      .map((s) => ({
        servidor_id: originMap.get(s.origemChave)!,
        competencia,
        bruto: s.bruto,
        liquido: s.liquido,
        tipo_folha: s.tipoFolha,
        fonte_url: SOURCE_URL,
      }));

    let remCriadas = 0;
    const remBatches: PromiseLike<number>[] = [];
    for (let i = 0; i < rems.length; i += BATCH) {
      const batch = rems.slice(i, i + BATCH);
      remBatches.push(
        sb.from("remuneracao_servidores").upsert(batch, {
          onConflict: "servidor_id,competencia,tipo_folha",
        }).select("id").then(({ data, error }) => {
          if (error) throw new Error(`Rem batch ${i}: ${error.message}`);
          return (data || []).length;
        }),
      );
    }
    const remResults = await Promise.all(remBatches);
    remCriadas = remResults.reduce((a, b) => a + b, 0);

    const result = {
      competencia,
      ano,
      mes,
      source_total: source.total,
      source_complete: source.complete,
      servidores: serverEntries.length,
      registros_folha: all.length,
      remuneracoes: remCriadas,
      identidades_historicas_adotadas: adoptions.length,
      status: "success",
    };

    if (logId) {
      const { error: logFinishError } = await sb.from("sync_log").update({
        status: "success",
        detalhes: result,
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
      assertPersistenceSucceeded("sync_log finish", logFinishError);
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Erro:", message);
    if (logId) {
      await sb.from("sync_log").update({
        status: "error",
        detalhes: { error: message },
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
