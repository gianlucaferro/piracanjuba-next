/// <reference lib="deno.ns" />
// deno-lint-ignore no-import-prefix
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { servidorOriginKey } from "../_shared/servidor-origin.ts";
import { mapIdsByOrigin } from "../_shared/persistence-guards.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-centi-ingest-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Codex 2026-06-03: auth obrigatória. Aceita cron_secret OU centi_ingest_secret OU SR no header.
 * Mesma logica de _shared/centi-auth.ts mas inline pra evitar import dynamic em deploy MCP.
 */
function checkCentiAuth(req: Request): boolean {
  const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
  const INGEST = Deno.env.get("CENTI_INGEST_SECRET") ?? "";
  const cron = req.headers.get("x-cron-secret") ?? "";
  const ingest = req.headers.get("x-centi-ingest-secret") ?? "";
  const auth = req.headers.get("authorization") ?? "";
  return (
    (CRON_SECRET !== "" && cron === CRON_SECRET) ||
    (INGEST !== "" && ingest === INGEST) ||
    (SR !== "" && auth.includes(SR))
  );
}

const BASE_URL = "https://piracanjuba.centi.com.br";
const UA = "piracanjuba.ai/1.0 (transparencia municipal)";

// Câmara é idorgao=23 — fica fora da rotina de Prefeitura
const ORGAOS_PREFEITURA = [22, 55, 67, 66, 44, 71, 68, 70, 72, 56];

// Órgãos com maior volume historico — sempre revalidar quando count=0 nesses (retry 1x).
// 22=Administração, 44=Educação, 55=Saúde, 71=Obras. Cobrem 80%+ do volume.
const ORGAOS_ESSENCIAIS = new Set([22, 44, 55, 71]);

/**
 * Codex 2026-06-03: gate triplo pra evitar competencia prematura quando so um
 * orgao grande publicou (ex: dia 1 com so orgao 22 = 241). Aceita competencia se:
 *  - total >= 500 (publicacao consistente), OU
 *  - total >= 200 E pelo menos 2 dos 4 essenciais com dados, OU
 *  - total >= 50 E pelo menos 3 orgaos quaisquer com dados.
 * Evita falso positivo onde so um orgao publicou parte da folha.
 */
function isCompetenciaPublicada(
  counts: Record<number, number>,
  total: number,
): boolean {
  if (total >= 500) return true;
  const essentialNonZero =
    [...ORGAOS_ESSENCIAIS].filter((id) => (counts[id] ?? 0) > 0).length;
  if (total >= 200 && essentialNonZero >= 2) return true;
  const nonZero = Object.values(counts).filter((v) => v > 0).length;
  if (total >= 50 && nonZero >= 3) return true;
  return false;
}

// Delay entre fetches sequenciais (ms). Centi rate-limit empirico ≥ 200ms entre reqs.
const CENTI_REQ_DELAY_MS = 250;

function parseBRL(str: string): number | null {
  if (!str || str.trim() === "") return null;
  const cleaned = str.replace(/\./g, "").replace(",", ".").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Column mapping from Centi portal (verified via debug):
// 0: Mat. | 1: Nome | 2: Data admissão | 3: Decreto | 4: Tipo admissão
// 5: Estabilidade | 6: Cargo | 7: Função | 8: Carga horária | 9: Lotação
// 10: Movimentação | 11: Tp. pagto | 12: Salário base | 13: Total proventos | 14: Total desc.
const COL = {
  MATRICULA: 0,
  NOME: 1,
  CARGO: 6,
  TIPO_PAGTO: 11,
  TOTAL_PROVENTOS: 13,
  TOTAL_DESCONTOS: 14,
};

interface ParsedServidor {
  matricula: string;
  nome: string;
  cargo: string | null;
  bruto: number | null;
  liquido: number | null;
  tipo_folha: string;
}

interface ScrapedServidor extends ParsedServidor {
  origemChave: string;
}

interface CompetenciaDetectada {
  mes: number;
  ano: number;
  competencia: string;
  totalFonte: number;
  countsPorOrgao: Record<number, number>;
  forced: boolean;
}

function competenciaKey(ano: number, mes: number) {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

function parseDataResult(html: string): number {
  const match = html.match(/data-result="(\d+)"/);
  return match ? Number(match[1]) : 0;
}

function buildCandidateMonths(
  now = new Date(),
): Array<{ mes: number; ano: number }> {
  const candidates: Array<{ mes: number; ano: number }> = [];
  for (let offset = 0; offset < 6; offset++) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1),
    );
    candidates.push({ mes: d.getUTCMonth() + 1, ano: d.getUTCFullYear() });
  }
  return candidates;
}

async function fetchFolhaCount(
  idorgao: number,
  mes: number,
  ano: number,
): Promise<number> {
  const body = new URLSearchParams({
    idorgao: String(idorgao),
    mes: String(mes),
    ano: String(ano),
    nome: "",
    cargo: "",
    decreto: "",
    admissao: "",
    pagina: "1",
    itensporpagina: "5",
  });
  const ctl = new AbortController();
  const tid = setTimeout(() => ctl.abort(), 15_000);
  try {
    const r = await fetch(`${BASE_URL}/servidor/remuneracao`, {
      method: "POST",
      headers: {
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: body.toString(),
      signal: ctl.signal,
    });
    if (!r.ok) return 0;
    return parseDataResult(await r.text());
  } catch (e) {
    console.error(
      `Count orgao=${idorgao} ${mes}/${ano}: ${(e as Error).message}`,
    );
    return 0;
  } finally {
    clearTimeout(tid);
  }
}

/**
 * Conta servidores com retry 1x para órgãos essenciais quando count=0.
 * Mitiga race condition do Centi que silenciosamente retorna 0 sob carga.
 */
async function fetchFolhaCountWithRetry(
  idorgao: number,
  mes: number,
  ano: number,
): Promise<number> {
  const c1 = await fetchFolhaCount(idorgao, mes, ano);
  if (c1 > 0 || !ORGAOS_ESSENCIAIS.has(idorgao)) return c1;
  // Órgão essencial retornou 0: tenta de novo depois de 500ms (provável race condition)
  await new Promise((r) => setTimeout(r, 500));
  const c2 = await fetchFolhaCount(idorgao, mes, ano);
  if (c2 > 0) {
    console.log(`[retry-success] orgao=${idorgao} ${mes}/${ano}: 0 → ${c2}`);
  }
  return c2;
}

async function descobrirCompetenciaMaisRecente(
  orgaos: number[],
  forcedMes?: number,
  forcedAno?: number,
): Promise<CompetenciaDetectada> {
  const candidates = forcedMes && forcedAno
    ? [{ mes: forcedMes, ano: forcedAno }]
    : buildCandidateMonths();

  for (const candidate of candidates) {
    // SEQUENCIAL com delay (NAO Promise.all): Centi nao suporta paralelismo.
    // Em paralelo, 9 de 10 orgaos retornavam 0 silenciosamente — bug que causou
    // 2 ciclos consecutivos de detecao de competencia errada (2026-04 ao inves
    // de 2026-05 mesmo com maio publicado). Ver Pesquisas/2026-06-03 Codex.
    const countsPorOrgao: Record<number, number> = {};
    for (const orgao of orgaos) {
      countsPorOrgao[orgao] = await fetchFolhaCountWithRetry(
        orgao,
        candidate.mes,
        candidate.ano,
      );
      await new Promise((r) => setTimeout(r, CENTI_REQ_DELAY_MS));
    }
    const totalFonte = Object.values(countsPorOrgao).reduce(
      (sum, count) => sum + count,
      0,
    );

    console.log(
      `[discover] ${candidate.ano}-${
        String(candidate.mes).padStart(2, "0")
      }: total=${totalFonte}`,
      countsPorOrgao,
    );

    if (forcedMes && forcedAno) {
      return {
        ...candidate,
        competencia: competenciaKey(candidate.ano, candidate.mes),
        totalFonte,
        countsPorOrgao,
        forced: true,
      };
    }

    if (isCompetenciaPublicada(countsPorOrgao, totalFonte)) {
      return {
        ...candidate,
        competencia: competenciaKey(candidate.ano, candidate.mes),
        totalFonte,
        countsPorOrgao,
        forced: false,
      };
    }
  }

  throw new Error(
    "Nenhuma competência recente da Prefeitura encontrada no Centi",
  );
}

function parseServidoresHtml(html: string): ParsedServidor[] {
  const servidores: ParsedServidor[] = [];
  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
  if (!tbodyMatch) return servidores;

  const rows = tbodyMatch[1].split("</tr>").filter((r) => r.includes("<td"));
  for (const row of rows) {
    const cells: string[] = [];
    const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/g;
    let m;
    while ((m = cellPattern.exec(row)) !== null) {
      cells.push(m[1].replace(/<[^>]*>/g, "").trim());
    }
    if (cells.length <= COL.CARGO) continue;

    const matricula = cells[COL.MATRICULA];
    const nome = cells[COL.NOME];
    const cargo = cells[COL.CARGO] || null;
    const tipoPagto = cells.length > COL.TIPO_PAGTO
      ? (cells[COL.TIPO_PAGTO] || "").trim().toUpperCase()
      : "";
    const bruto = cells.length > COL.TOTAL_PROVENTOS
      ? parseBRL(cells[COL.TOTAL_PROVENTOS])
      : null;
    const descontos = cells.length > COL.TOTAL_DESCONTOS
      ? parseBRL(cells[COL.TOTAL_DESCONTOS])
      : null;
    const liquido = bruto !== null && descontos !== null
      ? Math.round((bruto - descontos) * 100) / 100
      : null;

    let tipo_folha = "NORMAL";
    if (tipoPagto.includes("RESCIS")) tipo_folha = "RESCISÃO";
    else if (tipoPagto.includes("13")) tipo_folha = "13º SALÁRIO";
    else if (tipoPagto.includes("FÉRIAS") || tipoPagto.includes("FERIAS")) {
      tipo_folha = "FÉRIAS";
    }

    if (nome && nome.length > 2 && !nome.includes("Nenhum resultado")) {
      if (!matricula) {
        throw new Error(`Matrícula ausente para ${nome}`);
      }
      servidores.push({
        matricula,
        nome,
        cargo,
        bruto,
        liquido,
        tipo_folha,
      });
    }
  }
  return servidores;
}

async function fetchFolha(
  idorgao: number,
  mes: number,
  ano: number,
): Promise<ScrapedServidor[]> {
  const body = new URLSearchParams({
    idorgao: String(idorgao),
    mes: String(mes),
    ano: String(ano),
    nome: "",
    cargo: "",
    decreto: "",
    admissao: "",
    pagina: "1",
    itensporpagina: "2000",
  });
  const ctl = new AbortController();
  const tid = setTimeout(() => ctl.abort(), 30_000);
  try {
    const r = await fetch(`${BASE_URL}/servidor/remuneracao`, {
      method: "POST",
      headers: {
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: body.toString(),
      signal: ctl.signal,
    });
    if (!r.ok) {
      throw new Error(`HTTP ${r.status}`);
    }
    return parseServidoresHtml(await r.text()).map((servidor) => ({
      ...servidor,
      origemChave: servidorOriginKey(
        "prefeitura",
        `centi-${idorgao}`,
        servidor.matricula,
      ),
    }));
  } catch (e) {
    throw new Error(`Fetch orgao=${idorgao}: ${(e as Error).message}`);
  } finally {
    clearTimeout(tid);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Codex 2026-06-03: auth obrigatoria (function estava aberta apesar de verify_jwt=false).
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
  const orgaoFilter = url.searchParams.get("orgao");
  const forcedMes = url.searchParams.get("mes");
  const forcedAno = url.searchParams.get("ano");
  const dryRun = url.searchParams.get("dry_run") === "1";

  const orgaos = orgaoFilter ? [parseInt(orgaoFilter)] : ORGAOS_PREFEITURA;

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let detected: CompetenciaDetectada;
  try {
    detected = await descobrirCompetenciaMaisRecente(
      orgaos,
      forcedMes ? parseInt(forcedMes) : undefined,
      forcedAno ? parseInt(forcedAno) : undefined,
    );
  } catch (error) {
    const msg = (error as Error).message;
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const { mes, ano, competencia, totalFonte, countsPorOrgao, forced } =
    detected;
  console.log(
    `Competência detectada: ${competencia} (forced=${forced}, totalFonte=${totalFonte})`,
  );

  if (dryRun) {
    return new Response(
      JSON.stringify({
        success: true,
        dry_run: true,
        detected,
        orgaos_consultados: orgaos,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { data: log } = await sb.from("sync_log")
    .insert({
      tipo: "prefeitura_mensal",
      status: "running",
      detalhes: { competencia, totalFonte, countsPorOrgao, forced, orgaos },
    })
    .select("id").single();
  const logId = log?.id;

  try {
    // Fetch sequencial com delay entre orgaos. Centi nao suporta paralelismo:
    // mesmo CONCURRENCY=3 perde respostas. Sequencial leva ~30s pra 10 orgaos
    // (trade-off aceitavel pra cron mensal).
    const allResults: ScrapedServidor[][] = new Array(orgaos.length);
    for (let i = 0; i < orgaos.length; i++) {
      let result = await fetchFolha(orgaos[i], mes, ano);
      // Retry 1x para orgaos essenciais que retornaram vazio (race condition Centi)
      if (result.length === 0 && ORGAOS_ESSENCIAIS.has(orgaos[i])) {
        await new Promise((r) => setTimeout(r, 500));
        const retry = await fetchFolha(orgaos[i], mes, ano);
        if (retry.length > 0) {
          console.log(
            `[retry-success] orgao=${
              orgaos[i]
            }: 0 → ${retry.length} servidores`,
          );
          result = retry;
        }
      }
      allResults[i] = result;
      console.log(`Orgao ${orgaos[i]}: ${result.length}`);
      await new Promise((r) => setTimeout(r, CENTI_REQ_DELAY_MS));
    }

    const fetchedTotal = allResults.reduce((sum, rows) => sum + rows.length, 0);
    if (fetchedTotal < totalFonte) {
      throw new Error(
        `Folha incompleta: ${fetchedTotal}/${totalFonte} registros`,
      );
    }

    // Deduplicate por vínculo e tipo de folha. Nome não identifica pessoa.
    const seen = new Map<string, number>();
    const all: ScrapedServidor[] = [];
    for (const srvs of allResults) {
      for (const s of srvs) {
        const remunerationKey = `${s.origemChave}\u0000${s.tipo_folha}`;
        const existingIdx = seen.get(remunerationKey);
        if (existingIdx === undefined) {
          seen.set(remunerationKey, all.length);
          all.push(s);
        } else if (s.bruto !== null && all[existingIdx].bruto === null) {
          all[existingIdx] = s;
        }
      }
    }
    console.log(`Total unique: ${all.length}`);

    const servidoresPorOrigem = new Map<string, ScrapedServidor>();
    for (const servidor of all) {
      const existing = servidoresPorOrigem.get(servidor.origemChave);
      if (!existing || (!existing.cargo && servidor.cargo)) {
        servidoresPorOrigem.set(servidor.origemChave, servidor);
      }
    }
    const serverEntries = [...servidoresPorOrigem.values()];

    // Batch upsert usando a matrícula e o órgão do portal legado.
    const BATCH = 200;
    const srvBatches: PromiseLike<void>[] = [];
    for (let i = 0; i < serverEntries.length; i += BATCH) {
      const batch = serverEntries.slice(i, i + BATCH).map((s) => ({
        nome: s.nome,
        cargo: s.cargo,
        fonte_url: `${BASE_URL}/servidor/remuneracao`,
        orgao_tipo: "prefeitura",
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

    // Buscar IDs somente pelas chaves persistidas.
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
    console.log(`originMap (prefeitura): ${originMap.size}`);

    // Build remunerações e upsert em batches
    const rems = all
      .filter((s) => s.bruto !== null && originMap.has(s.origemChave))
      .map((s) => ({
        servidor_id: originMap.get(s.origemChave)!,
        competencia,
        bruto: s.bruto,
        liquido: s.liquido,
        tipo_folha: s.tipo_folha || "NORMAL",
        fonte_url: `${BASE_URL}/servidor/remuneracao`,
      }));

    let remCriadas = 0;
    const remBatches: PromiseLike<number>[] = [];
    for (let i = 0; i < rems.length; i += BATCH) {
      const batch = rems.slice(i, i + BATCH);
      remBatches.push(
        // Codex 2026-06-03: chave inclui tipo_folha pra preservar NORMAL + 13º + RESCISÃO + FÉRIAS
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
      forced,
      totalFonte,
      countsPorOrgao,
      orgaos,
      servidores: serverEntries.length,
      registros_folha: all.length,
      remuneracoes: remCriadas,
      status: "success",
    };

    if (logId) {
      await sb.from("sync_log").update({
        status: "success",
        detalhes: result,
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }

    // Push notification for new payroll
    if (remCriadas > 0) {
      const meses = [
        "",
        "Janeiro",
        "Fevereiro",
        "Março",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro",
      ];
      const mesNome = meses[mes] || competencia;
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({
            title: `💰 Folha de ${mesNome}/${ano} disponível`,
            body:
              `A folha de pagamento de ${mesNome} já está disponível com ${remCriadas} registros.`,
            topic: "geral",
            url: "/prefeitura",
            dedup_key: `folha_${competencia}`,
          }),
        });
      } catch (e) {
        console.error("Push notification error:", (e as Error).message);
      }
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro:", error);
    if (logId) {
      await sb.from("sync_log").update({
        status: "error",
        detalhes: {
          error: (error as Error).message,
          competencia,
          countsPorOrgao,
        },
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
