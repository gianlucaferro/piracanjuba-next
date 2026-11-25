/// <reference lib="deno.ns" />
// deno-lint-ignore no-import-prefix
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CENTI_BASE_CAMARA, centiCall } from "../_shared/centi-client.ts";
import { folhaCompetencias } from "../_shared/folha-retroativa.ts";
import {
  mesCorrenteBrasilia,
  planejarCompetencia,
  vereadoresDaFolhaMensal,
  type LinhaRemuneracaoMensal,
  type VereadorCadastro,
} from "../_shared/remuneracao-vereadores.ts";

// Remuneração mensal dos vereadores (tabela remuneracao_mensal), lida da folha
// pública da Câmara no portal NúcleoGov. Até 2026-07 a fonte era o portal Centi
// antigo, que parou de publicar; o coletor seguiu marcando "success" com zero
// linhas e o perfil dos vereadores ficou parado em julho de 2026.
//
// Sem ano/mes, revisa o mês corrente (Brasília) e os 3 anteriores, como os
// demais coletores de folha. Com ano e mes, só aquela competência.
// dry_run=true consulta a fonte e devolve o plano sem gravar nada.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SOURCE_PATH = "/cidadao/transparencia/servidores_cnt";
const SOURCE_URL = `${CENTI_BASE_CAMARA}${SOURCE_PATH}`;
const PAGE_SIZE = 100;
const MAX_PAGES = 30;

type JsonRecord = Record<string, unknown>;

type ResultadoCompetencia = {
  competencia: string;
  status: "success" | "partial" | "sem_publicacao" | "error";
  registros_fonte: number | null;
  vereadores_folha: number;
  gravadas: number;
  novas: number;
  atualizadas: number;
  sem_cadastro: string[];
  linhas?: LinhaRemuneracaoMensal[];
  error?: string;
};

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Folha Câmara: resposta da fonte inválida");
  }
  return value as JsonRecord;
}

// Mesmas travas do sync-camara-servidores: total estável entre páginas e
// coleta completa, senão a competência não é gravada.
async function fetchFolhaCompleta(ano: number, mes: number) {
  const rows: JsonRecord[] = [];
  let total: number | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await centiCall(
      SOURCE_PATH,
      [{
        acao: "servidores_cnt/listar",
        extra: { ano: String(ano), mes: String(mes) },
        limit: { offset: page * PAGE_SIZE, pageSize: PAGE_SIZE },
      }],
      CENTI_BASE_CAMARA,
      { timeoutMs: 20_000 },
    );
    const result = asRecord(Object.values(response)[0]);
    if (result.error || result.erro || result.success === false) {
      throw new Error("Folha Câmara: fonte informou erro na consulta");
    }
    const reported = result.total === null || result.total === undefined ||
        result.total === ""
      ? NaN
      : Number(result.total);
    if (
      !Number.isSafeInteger(reported) || reported < 0 ||
      !Array.isArray(result.dados)
    ) {
      throw new Error("Folha Câmara: resposta sem total ou dados válidos");
    }
    if (total !== null && total !== reported) {
      throw new Error("Folha Câmara: total mudou durante a paginação");
    }
    total = reported;
    for (const value of result.dados) rows.push(asRecord(value));
    if (rows.length > total) {
      throw new Error("Folha Câmara: registros excedem o total informado");
    }
    if (rows.length === total) return { total, rows };
    if (result.dados.length < PAGE_SIZE) break;
  }
  throw new Error(
    `Folha Câmara: paginação incompleta ${rows.length}/${total ?? "?"}`,
  );
}

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

async function gravarCompetencia(
  sb: SupabaseClient,
  competencia: string,
  linhas: LinhaRemuneracaoMensal[],
) {
  const { data: existentes, error } = await sb.from("remuneracao_mensal")
    .select("id, vereador_id")
    .eq("competencia", competencia);
  if (error) throw new Error(`Leitura de ${competencia}: ${error.message}`);
  const porVereador = new Map<string, string>();
  for (const row of existentes || []) {
    if (porVereador.has(row.vereador_id)) {
      throw new Error(
        `remuneracao_mensal tem linha duplicada em ${competencia}; nada gravado`,
      );
    }
    porVereador.set(row.vereador_id, row.id);
  }

  let novas = 0;
  let atualizadas = 0;
  const agora = new Date().toISOString();
  for (const linha of linhas) {
    const valores = {
      subsidio_referencia: linha.subsidio_referencia,
      bruto: linha.bruto,
      liquido: linha.liquido,
      fonte_url: SOURCE_URL,
      updated_at: agora,
    };
    const id = porVereador.get(linha.vereador_id);
    if (id) {
      const { error: updateError } = await sb.from("remuneracao_mensal")
        .update(valores).eq("id", id);
      if (updateError) {
        throw new Error(`Atualização ${competencia}: ${updateError.message}`);
      }
      atualizadas++;
    } else {
      const { error: insertError } = await sb.from("remuneracao_mensal")
        .insert({ vereador_id: linha.vereador_id, competencia, ...valores });
      if (insertError) {
        throw new Error(`Inclusão ${competencia}: ${insertError.message}`);
      }
      novas++;
    }
  }
  return { novas, atualizadas };
}

async function lerParametros(req: Request) {
  const url = new URL(req.url);
  let body: JsonRecord = {};
  if (req.method === "POST") {
    try {
      const parsed = await req.json();
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        body = parsed as JsonRecord;
      }
    } catch {
      body = {};
    }
  }
  const pick = (key: string) => url.searchParams.get(key) ?? body[key];
  const anoRaw = pick("ano");
  const mesRaw = pick("mes");
  const explicit = anoRaw !== undefined && anoRaw !== null && anoRaw !== "" &&
    mesRaw !== undefined && mesRaw !== null && mesRaw !== "";
  if (!explicit && (anoRaw || mesRaw)) {
    throw new Error("Informe ano e mes juntos");
  }
  const padrao = mesCorrenteBrasilia();
  const ano = explicit ? Number(anoRaw) : padrao.ano;
  const mes = explicit ? Number(mesRaw) : padrao.mes;
  const dryRaw = pick("dry_run");
  const dryRun = dryRaw === true || dryRaw === "true";
  return { ano, mes, explicit, dryRun };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let params: Awaited<ReturnType<typeof lerParametros>>;
  let periodos: ReturnType<typeof folhaCompetencias>;
  try {
    params = await lerParametros(req);
    periodos = folhaCompetencias(params.ano, params.mes, params.explicit);
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  let logId: string | undefined;
  if (!params.dryRun) {
    const { data: log } = await sb.from("sync_log")
      .insert({ tipo: "remuneracao_vereadores", status: "running", detalhes: {} })
      .select("id").single();
    logId = log?.id;
  }

  const resultados: ResultadoCompetencia[] = [];
  try {
    const { data: vereadores, error: vereadoresError } = await sb
      .from("vereadores").select("id, nome");
    if (vereadoresError) throw new Error(vereadoresError.message);
    const cadastro = (vereadores || []) as VereadorCadastro[];
    if (cadastro.length === 0) throw new Error("Cadastro de vereadores vazio");

    for (const periodo of periodos) {
      const resultado: ResultadoCompetencia = {
        competencia: periodo.competencia,
        status: "error",
        registros_fonte: null,
        vereadores_folha: 0,
        gravadas: 0,
        novas: 0,
        atualizadas: 0,
        sem_cadastro: [],
      };
      resultados.push(resultado);
      try {
        const fonte = await fetchFolhaCompleta(periodo.ano, periodo.mes);
        resultado.registros_fonte = fonte.total;
        if (fonte.total === 0) {
          resultado.status = "sem_publicacao";
          continue;
        }
        const folha = vereadoresDaFolhaMensal(
          fonte.rows,
          periodo.ano,
          periodo.mes,
        );
        resultado.vereadores_folha = folha.length;
        if (folha.length === 0) {
          // A Câmara publicou a folha, mas sem vereador na folha MENSAL: é o
          // tipo de silêncio que deixou o perfil parado em julho. Vira erro.
          throw new Error("Folha publicada sem vereadores na folha mensal");
        }
        const plano = planejarCompetencia(periodo.competencia, folha, cadastro);
        resultado.sem_cadastro = plano.sem_cadastro;
        if (plano.linhas.length === 0) {
          throw new Error("Nenhum vereador da folha casou com o cadastro");
        }
        if (params.dryRun) {
          resultado.linhas = plano.linhas;
        } else {
          const gravacao = await gravarCompetencia(
            sb,
            periodo.competencia,
            plano.linhas,
          );
          resultado.novas = gravacao.novas;
          resultado.atualizadas = gravacao.atualizadas;
        }
        resultado.gravadas = plano.linhas.length;
        resultado.status = plano.sem_cadastro.length > 0 ? "partial" : "success";
      } catch (error) {
        resultado.status = "error";
        resultado.error = (error as Error).message;
      }
    }

    const erros = resultados.filter((r) => r.status === "error").length;
    const status = erros === resultados.length
      ? "error"
      : erros > 0 || resultados.some((r) => r.status === "partial")
      ? "partial"
      : "success";
    const detalhes = {
      fonte: SOURCE_URL,
      dry_run: params.dryRun,
      competencias: resultados,
    };
    if (logId) {
      await sb.from("sync_log").update({
        status,
        detalhes,
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }
    return new Response(
      JSON.stringify({ success: status !== "error", status, ...detalhes }),
      {
        status: status === "error" ? 500 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = (error as Error).message;
    console.error("sync-remuneracao-vereadores:", message);
    if (logId) {
      await sb.from("sync_log").update({
        status: "error",
        detalhes: { fonte: SOURCE_URL, error: message, competencias: resultados },
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
