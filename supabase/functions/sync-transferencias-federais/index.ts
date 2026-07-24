import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
import { checkCentiAuth } from "../_shared/centi-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-centi-ingest-secret",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

const IBGE_CODE = "5217104";
const API_BASE = "https://api.portaldatransparencia.gov.br/api-de-dados";

interface ConvenioPortal {
  id?: number | string;
  numero?: number | string;
  orgaoSuperior?: { nome?: string };
  orgaoConcedente?: { nome?: string };
  objeto?: string;
  valorConvenio?: number;
  valor?: number;
  valorLiberado?: number;
  valorEmpenhado?: number;
  situacao?: { descricao?: string } | string;
  dataInicioVigencia?: string;
  dataPublicacao?: string;
  dataFimVigencia?: string;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function extractYear(value?: string): number {
  const match = value?.match(/(?:19|20)\d{2}/);
  return match ? Number(match[0]) : new Date().getUTCFullYear();
}

async function fetchPortalPage(
  page: number,
  apiKey: string,
): Promise<ConvenioPortal[]> {
  const url = new URL(`${API_BASE}/convenios`);
  url.searchParams.set("codigoIBGE", IBGE_CODE);
  url.searchParams.set("pagina", String(page));

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "chave-api-dados": apiKey,
    },
  });

  if (response.status !== 200) {
    const body = (await response.text()).slice(0, 500);
    throw new Error(
      `Portal da Transparencia retornou HTTP ${response.status} em convenios${
        body ? `: ${body}` : ""
      }`,
    );
  }

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error("Resposta invalida de convenios: era esperada uma lista");
  }

  return payload as ConvenioPortal[];
}

async function syncConvenios(
  supabase: SupabaseClient,
  apiKey: string,
): Promise<{ upserted: number; pagesFetched: number }> {
  let total = 0;
  let pagesFetched = 0;

  for (let page = 1; page <= 500; page++) {
    const data = await fetchPortalPage(page, apiKey);
    pagesFetched++;
    if (data.length === 0) break;

    const records = data.flatMap((convenio) => {
      const portalId = convenio.id ?? convenio.numero;
      if (portalId == null || String(portalId).trim() === "") return [];

      const inicio = convenio.dataInicioVigencia ?? convenio.dataPublicacao;
      const situacao = typeof convenio.situacao === "string"
        ? convenio.situacao
        : convenio.situacao?.descricao;

      return [{
        tipo: "convenio",
        portal_id: String(portalId),
        numero: convenio.numero == null ? null : String(convenio.numero),
        orgao_concedente: convenio.orgaoSuperior?.nome ??
          convenio.orgaoConcedente?.nome ??
          null,
        objeto: convenio.objeto ?? null,
        valor_total: convenio.valorConvenio ?? convenio.valor ?? null,
        valor_liberado: convenio.valorLiberado ?? null,
        valor_empenhado: convenio.valorEmpenhado ?? null,
        situacao: situacao ?? null,
        data_inicio: inicio ?? null,
        data_fim: convenio.dataFimVigencia ?? null,
        fonte_url: `https://portaldatransparencia.gov.br/convenios/${
          convenio.id ?? ""
        }`,
        fonte_api: "portal_transparencia",
        ano: extractYear(inicio),
      }];
    });

    if (records.length > 0) {
      const { error } = await supabase.from("transferencias_federais").upsert(
        records,
        { onConflict: "portal_id,tipo" },
      );
      if (error) {
        throw new Error(
          `Falha no upsert da pagina ${page} de convenios: ${error.message}`,
        );
      }
      total += records.length;
    }

    if (data.length < 15) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return { upserted: total, pagesFetched };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!checkCentiAuth(req)) {
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers: jsonHeaders },
    );
  }

  const apiKey = Deno.env.get("PORTAL_TRANSPARENCIA_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "PORTAL_TRANSPARENCIA_API_KEY not configured",
      }),
      { status: 500, headers: jsonHeaders },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const logId = crypto.randomUUID();
  const { error: logError } = await supabase.from("sync_log").insert({
    id: logId,
    tipo: "transferencias_federais",
    status: "running",
    detalhes: {
      version: 2,
      escopo: "convenios",
      observacao: "Beneficios sociais sao sincronizados por rotina dedicada",
    },
  });

  if (logError) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Falha ao iniciar log: ${logError.message}`,
      }),
      { status: 500, headers: jsonHeaders },
    );
  }

  try {
    const convenios = await syncConvenios(supabase, apiKey);
    const details = {
      version: 2,
      escopo: "convenios",
      convenios,
      beneficios_escritos: 0,
    };

    const { error: finishError } = await supabase.from("sync_log").update({
      status: "success",
      finished_at: new Date().toISOString(),
      detalhes: details,
    }).eq("id", logId);

    if (finishError) {
      throw new Error(`Falha ao finalizar log: ${finishError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, ...details }),
      { headers: jsonHeaders },
    );
  } catch (error) {
    const errorText = message(error);
    await supabase.from("sync_log").update({
      status: "error",
      finished_at: new Date().toISOString(),
      detalhes: {
        version: 2,
        escopo: "convenios",
        error: errorText,
      },
    }).eq("id", logId);

    return new Response(
      JSON.stringify({ success: false, error: errorText }),
      { status: 500, headers: jsonHeaders },
    );
  }
});
