import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL = "https://piracanjuba.centi.com.br";
const UA = "piracanjuba.ai/1.0 (transparencia municipal)";

// Câmara é idorgao=23 — fica fora da rotina de Prefeitura
const ORGAOS_PREFEITURA = [22, 55, 67, 66, 44, 71, 68, 70, 72, 56];

// Órgãos com maior volume historico — sempre revalidar quando count=0 nesses (retry 1x).
// 22=Administração, 44=Educação, 55=Saúde, 71=Obras. Cobrem 80%+ do volume.
const ORGAOS_ESSENCIAIS = new Set([22, 44, 55, 71]);

// Volume mínimo para considerar uma competência "publicada" pela Prefeitura.
// Reduzido de 100 → 50 (2026-06-03) porque o Centi nao suporta 10 reqs simultaneas;
// mesmo com retry serializado as vezes só 1-2 orgaos respondem por race condition.
// Threshold conservador: mes inicial costuma ter so o orgao 22 (~241 rows), passa folgado.
const MIN_PREFEITURA_ROWS = 50;

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
const COL = { NOME: 1, CARGO: 6, TIPO_PAGTO: 11, TOTAL_PROVENTOS: 13, TOTAL_DESCONTOS: 14 };

interface ScrapedServidor {
  nome: string;
  cargo: string | null;
  bruto: number | null;
  liquido: number | null;
  tipo_folha: string;
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

function buildCandidateMonths(now = new Date()): Array<{ mes: number; ano: number }> {
  const candidates: Array<{ mes: number; ano: number }> = [];
  for (let offset = 0; offset < 6; offset++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    candidates.push({ mes: d.getUTCMonth() + 1, ano: d.getUTCFullYear() });
  }
  return candidates;
}

async function fetchFolhaCount(idorgao: number, mes: number, ano: number): Promise<number> {
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
    console.error(`Count orgao=${idorgao} ${mes}/${ano}: ${(e as Error).message}`);
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
  const candidates =
    forcedMes && forcedAno
      ? [{ mes: forcedMes, ano: forcedAno }]
      : buildCandidateMonths();

  for (const candidate of candidates) {
    // SEQUENCIAL com delay (NAO Promise.all): Centi nao suporta paralelismo.
    // Em paralelo, 9 de 10 orgaos retornavam 0 silenciosamente — bug que causou
    // 2 ciclos consecutivos de detecao de competencia errada (2026-04 ao inves
    // de 2026-05 mesmo com maio publicado). Ver Pesquisas/2026-06-03 Codex.
    const countsPorOrgao: Record<number, number> = {};
    for (const orgao of orgaos) {
      countsPorOrgao[orgao] = await fetchFolhaCountWithRetry(orgao, candidate.mes, candidate.ano);
      await new Promise((r) => setTimeout(r, CENTI_REQ_DELAY_MS));
    }
    const totalFonte = Object.values(countsPorOrgao).reduce((sum, count) => sum + count, 0);

    console.log(`[discover] ${candidate.ano}-${String(candidate.mes).padStart(2, "0")}: total=${totalFonte}`, countsPorOrgao);

    if (forcedMes && forcedAno) {
      return {
        ...candidate,
        competencia: competenciaKey(candidate.ano, candidate.mes),
        totalFonte,
        countsPorOrgao,
        forced: true,
      };
    }

    if (totalFonte >= MIN_PREFEITURA_ROWS) {
      return {
        ...candidate,
        competencia: competenciaKey(candidate.ano, candidate.mes),
        totalFonte,
        countsPorOrgao,
        forced: false,
      };
    }
  }

  throw new Error("Nenhuma competência recente da Prefeitura encontrada no Centi");
}

function parseServidoresHtml(html: string): ScrapedServidor[] {
  const servidores: ScrapedServidor[] = [];
  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
  if (!tbodyMatch) return servidores;

  const rows = tbodyMatch[1].split("</tr>").filter(r => r.includes("<td"));
  for (const row of rows) {
    const cells: string[] = [];
    const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/g;
    let m;
    while ((m = cellPattern.exec(row)) !== null) {
      cells.push(m[1].replace(/<[^>]*>/g, "").trim());
    }
    if (cells.length <= COL.CARGO) continue;

    const nome = cells[COL.NOME];
    const cargo = cells[COL.CARGO] || null;
    const tipoPagto = cells.length > COL.TIPO_PAGTO ? (cells[COL.TIPO_PAGTO] || "").trim().toUpperCase() : "";
    const bruto = cells.length > COL.TOTAL_PROVENTOS ? parseBRL(cells[COL.TOTAL_PROVENTOS]) : null;
    const descontos = cells.length > COL.TOTAL_DESCONTOS ? parseBRL(cells[COL.TOTAL_DESCONTOS]) : null;
    const liquido = bruto !== null && descontos !== null ? Math.round((bruto - descontos) * 100) / 100 : null;

    let tipo_folha = "NORMAL";
    if (tipoPagto.includes("RESCIS")) tipo_folha = "RESCISÃO";
    else if (tipoPagto.includes("13")) tipo_folha = "13º SALÁRIO";
    else if (tipoPagto.includes("FÉRIAS") || tipoPagto.includes("FERIAS")) tipo_folha = "FÉRIAS";

    if (nome && nome.length > 2 && !nome.includes("Nenhum resultado")) {
      servidores.push({ nome, cargo, bruto, liquido, tipo_folha });
    }
  }
  return servidores;
}

async function fetchFolha(idorgao: number, mes: number, ano: number): Promise<ScrapedServidor[]> {
  const body = new URLSearchParams({
    idorgao: String(idorgao), mes: String(mes), ano: String(ano),
    nome: "", cargo: "", decreto: "", admissao: "",
    pagina: "1", itensporpagina: "2000",
  });
  const ctl = new AbortController();
  const tid = setTimeout(() => ctl.abort(), 30_000);
  try {
    const r = await fetch(`${BASE_URL}/servidor/remuneracao`, {
      method: "POST",
      headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded", "X-Requested-With": "XMLHttpRequest" },
      body: body.toString(),
      signal: ctl.signal,
    });
    if (!r.ok) return [];
    return parseServidoresHtml(await r.text());
  } catch (e) {
    console.error(`Fetch orgao=${idorgao}: ${(e as Error).message}`);
    return [];
  } finally {
    clearTimeout(tid);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const orgaoFilter = url.searchParams.get("orgao");
  const forcedMes = url.searchParams.get("mes");
  const forcedAno = url.searchParams.get("ano");
  const dryRun = url.searchParams.get("dry_run") === "1";

  const orgaos = orgaoFilter ? [parseInt(orgaoFilter)] : ORGAOS_PREFEITURA;

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

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
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { mes, ano, competencia, totalFonte, countsPorOrgao, forced } = detected;
  console.log(`Competência detectada: ${competencia} (forced=${forced}, totalFonte=${totalFonte})`);

  if (dryRun) {
    return new Response(
      JSON.stringify({ success: true, dry_run: true, detected, orgaos_consultados: orgaos }),
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
          console.log(`[retry-success] orgao=${orgaos[i]}: 0 → ${retry.length} servidores`);
          result = retry;
        }
      }
      allResults[i] = result;
      console.log(`Orgao ${orgaos[i]}: ${result.length}`);
      await new Promise((r) => setTimeout(r, CENTI_REQ_DELAY_MS));
    }

    // Deduplicate: prefer entries WITH salary data
    const seen = new Map<string, number>();
    const all: ScrapedServidor[] = [];
    for (const srvs of allResults) {
      for (const s of srvs) {
        const existingIdx = seen.get(s.nome);
        if (existingIdx === undefined) {
          seen.set(s.nome, all.length);
          all.push(s);
        } else if (s.bruto !== null && all[existingIdx].bruto === null) {
          all[existingIdx] = s;
        }
      }
    }
    console.log(`Total unique: ${all.length}`);

    // Batch upsert servidores marcando orgao_tipo='prefeitura' explicitamente
    // e usando chave composta (nome,orgao_tipo) para permitir homônimo na Câmara
    const BATCH = 200;
    const srvBatches: Promise<void>[] = [];
    for (let i = 0; i < all.length; i += BATCH) {
      const batch = all.slice(i, i + BATCH).map(s => ({
        nome: s.nome,
        cargo: s.cargo,
        fonte_url: `${BASE_URL}/servidor/remuneracao`,
        orgao_tipo: "prefeitura",
      }));
      srvBatches.push(
        sb.from("servidores").upsert(batch, { onConflict: "nome,orgao_tipo" }).then(({ error }) => {
          if (error) console.error(`Srv batch ${i}: ${error.message}`);
        })
      );
    }
    await Promise.all(srvBatches);

    // Buscar IDs de servidores SOMENTE da Prefeitura (nameMap não pode pegar Câmara homônimo)
    const dbSrvs: { id: string; nome: string }[] = [];
    let offset = 0;
    const PAGE = 1000;
    while (true) {
      const { data: page } = await sb
        .from("servidores")
        .select("id, nome")
        .eq("orgao_tipo", "prefeitura")
        .range(offset, offset + PAGE - 1);
      if (!page || page.length === 0) break;
      dbSrvs.push(...page);
      if (page.length < PAGE) break;
      offset += PAGE;
    }
    const nameMap = new Map(dbSrvs.map(s => [s.nome, s.id]));
    console.log(`nameMap (prefeitura): ${nameMap.size}`);

    // Build remunerações e upsert em batches
    const rems = all
      .filter(s => s.bruto !== null && nameMap.has(s.nome))
      .map(s => ({
        servidor_id: nameMap.get(s.nome)!,
        competencia,
        bruto: s.bruto,
        liquido: s.liquido,
        tipo_folha: s.tipo_folha || "NORMAL",
        fonte_url: `${BASE_URL}/servidor/remuneracao`,
      }));

    let remCriadas = 0;
    const remBatches: Promise<number>[] = [];
    for (let i = 0; i < rems.length; i += BATCH) {
      const batch = rems.slice(i, i + BATCH);
      remBatches.push(
        sb.from("remuneracao_servidores").upsert(batch, {
          onConflict: "servidor_id,competencia",
        }).select("id").then(({ data, error }) => {
          if (error) console.error(`Rem batch ${i}: ${error.message}`);
          return (data || []).length;
        })
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
      servidores: all.length,
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
      const meses = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
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
            body: `A folha de pagamento de ${mesNome} já está disponível com ${remCriadas} registros.`,
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
        detalhes: { error: (error as Error).message, competencia, countsPorOrgao },
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
