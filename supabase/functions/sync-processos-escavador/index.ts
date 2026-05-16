// Sync trimestral de processos judiciais dos vereadores via Escavador API v2
// Token reutilizado do projeto Puft.Ai (escopo: acessar_api_paga)
//
// Cron: dia 1 de jan/abr/jul/out as 04:00 BRT (trimestral)
//
// Endpoint: GET /api/v2/envolvido/processos?cpf_cnpj=XXX
// Filtros LGPD aplicados (gravidade segredo de justica, vitima, familia):
// idem ao que ja fazemos com BigData.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkCentiAuth } from "../_shared/centi-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret, x-centi-ingest-secret",
};

const ESCAVADOR_BASE = "https://api.escavador.com/api/v2";

type EscavadorProcesso = {
  numero_cnj: string;
  titulo_polo_ativo?: string;
  titulo_polo_passivo?: string;
  ano_inicio?: number;
  data_inicio?: string;
  data_ultima_movimentacao?: string;
  estado_origem?: { nome: string; sigla: string };
  unidade_origem?: {
    nome?: string;
    cidade?: string;
    classificacao?: string;
    tribunal_sigla?: string;
  };
  fontes?: Array<{
    descricao?: string;
    sigla?: string;
    grau?: number;
    capa?: {
      classe?: string;
      assunto?: string;
      area?: string;
      valor_causa?: { valor: number };
    };
  }>;
  envolvidos?: Array<{
    nome?: string;
    cpf?: string;
    cnpj?: string;
    polo?: string;
    tipo_pessoa?: string;
  }>;
  classe_atual?: string;
  segredo_justica?: boolean;
};

type EscavadorResp = {
  envolvido_encontrado?: {
    nome: string;
    tipo_pessoa: string;
    quantidade_processos: number;
    cpfs_com_esse_nome: number;
  };
  items: EscavadorProcesso[];
  links?: { next?: string };
};

// Mapeamento Escavador → nossos tipos
function mapTipoCategoria(proc: EscavadorProcesso): string {
  const fonte = proc.fontes?.[0]?.capa;
  const area = (fonte?.area ?? "").toLowerCase();
  const classe = (fonte?.classe ?? proc.classe_atual ?? "").toLowerCase();

  if (area.includes("criminal") || classe.includes("penal") || classe.includes("criminal")) return "criminal";
  if (area.includes("eleitoral") || classe.includes("eleitoral")) return "eleitoral";
  if (area.includes("trabalho") || classe.includes("trabalh")) return "trabalhista";
  if (area.includes("tribut") || classe.includes("tribut") || classe.includes("execução fiscal")) return "tributario";
  if (area.includes("família") || area.includes("familia") || classe.includes("família") || classe.includes("alimento") || classe.includes("divorcio")) return "familia";
  if (area.includes("administra")) return "administrativo";
  if (area.includes("cível") || area.includes("civel") || classe.includes("cível") || classe.includes("civel")) return "civel";
  return "outro";
}

function mapPolo(proc: EscavadorProcesso, cpfTarget: string): string {
  // Procura o envolvido que bate com o CPF do vereador
  const matched = proc.envolvidos?.find((e) => {
    const cpfLimpo = (e.cpf ?? "").replace(/\D/g, "");
    return cpfLimpo === cpfTarget;
  });
  const polo = (matched?.polo ?? "").toLowerCase();
  if (polo.includes("ativo") || polo.includes("autor") || polo.includes("requerente")) return "autor";
  if (polo.includes("passivo") || polo.includes("réu") || polo.includes("reu") || polo.includes("requerido")) return "reu";
  if (polo.includes("vítima") || polo.includes("vitima")) return "vitima";
  if (polo.includes("testemunha")) return "testemunha";
  if (polo.includes("terceiro")) return "terceiro";
  return "interessado";
}

async function fetchProcessosEscavador(token: string, cpf: string, maxPages = 10): Promise<EscavadorProcesso[]> {
  const all: EscavadorProcesso[] = [];
  let url: string | null = `${ESCAVADOR_BASE}/envolvido/processos?cpf_cnpj=${cpf}&limit=50`;

  for (let page = 0; page < maxPages && url; page++) {
    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
    if (!resp.ok) {
      throw new Error(`Escavador HTTP ${resp.status}: ${await resp.text().catch(() => "")}`);
    }
    const data: EscavadorResp = await resp.json();
    if (data.items?.length) all.push(...data.items);
    url = data.links?.next ?? null;
  }
  return all;
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
  const ESCAVADOR_TOKEN = Deno.env.get("ESCAVADOR_TOKEN");

  if (!ESCAVADOR_TOKEN) {
    return new Response(JSON.stringify({ error: "ESCAVADOR_TOKEN não configurado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const startedAt = Date.now();

  // Filtros via query param (?cargo=vereador ou ?pessoa_id=UUID)
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
    return new Response(JSON.stringify({ error: pessoasErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const summary = {
    total_pessoas: pessoas?.length ?? 0,
    sucessos: 0,
    erros: 0,
    processos_total: 0,
    processos_novos: 0,
    processos_atualizados: 0,
    processos_filtrados: 0,
    detalhes: [] as Array<Record<string, unknown>>,
  };

  for (const pessoa of pessoas ?? []) {
    const cpfDigits = (pessoa.cpf || "").replace(/\D/g, "");
    if (cpfDigits.length !== 11) {
      summary.erros++;
      continue;
    }

    try {
      const processos = await fetchProcessosEscavador(ESCAVADOR_TOKEN, cpfDigits, 10);
      let novos = 0;
      let atualizados = 0;
      let filtrados = 0;

      for (const proc of processos) {
        const tipoCategoria = mapTipoCategoria(proc);
        const polo = mapPolo(proc, cpfDigits);
        const segredo = Boolean(proc.segredo_justica);
        const visivelEsperado = !segredo && polo !== "vitima" && polo !== "testemunha" && tipoCategoria !== "familia";
        if (!visivelEsperado) filtrados++;

        const dataDist = proc.data_inicio ?? null;
        const dataMov = proc.data_ultima_movimentacao ?? null;
        const fonte = proc.fontes?.[0];
        const capa = fonte?.capa;
        const numero = proc.numero_cnj;
        if (!numero) continue;

        const payload = {
          pessoa_publica_id: pessoa.id,
          numero_processo: numero,
          tribunal: proc.unidade_origem?.tribunal_sigla ?? null,
          comarca: proc.unidade_origem?.cidade ?? null,
          uf: proc.estado_origem?.sigla ?? null,
          classe: capa?.classe ?? proc.classe_atual ?? null,
          assunto: capa?.assunto ?? null,
          tipo_categoria: tipoCategoria,
          polo,
          data_distribuicao: dataDist,
          data_ultima_movimentacao: dataMov,
          status: "ativo",
          objeto_resumo: capa?.assunto ?? null,
          valor_causa: capa?.valor_causa?.valor ?? null,
          segredo_justica: segredo,
          source: "escavador",
          raw_payload: proc as unknown as Record<string, unknown>,
          atualizado_em: new Date().toISOString(),
        };

        const { data: existing } = await supabase
          .from("processo_judicial")
          .select("id")
          .eq("pessoa_publica_id", pessoa.id)
          .eq("numero_processo", numero)
          .maybeSingle();

        if (existing) {
          await supabase.from("processo_judicial").update(payload).eq("id", existing.id);
          atualizados++;
        } else {
          await supabase.from("processo_judicial").insert(payload);
          novos++;
        }
      }

      summary.sucessos++;
      summary.processos_total += processos.length;
      summary.processos_novos += novos;
      summary.processos_atualizados += atualizados;
      summary.processos_filtrados += filtrados;
      summary.detalhes.push({
        pessoa: pessoa.nome,
        total: processos.length,
        novos,
        atualizados,
        filtrados,
      });

      await supabase.from("processo_sync_log").insert({
        pessoa_publica_id: pessoa.id,
        status: "success",
        processos_encontrados: processos.length,
        processos_novos: novos,
        processos_atualizados: atualizados,
        processos_filtrados: filtrados,
        custo_brl: null, // Escavador tem plano ilimitado, nao cobra por consulta
      });
    } catch (err) {
      summary.erros++;
      summary.detalhes.push({ pessoa: pessoa.nome, erro: String(err) });
      await supabase.from("processo_sync_log").insert({
        pessoa_publica_id: pessoa.id,
        status: "error",
        erro: String(err),
      });
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      duration_ms: Date.now() - startedAt,
      ...summary,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
