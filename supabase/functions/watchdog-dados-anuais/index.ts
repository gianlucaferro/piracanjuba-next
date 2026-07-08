// Watchdog de atualidade dos dados anuais estáticos do site (PIB, SIH, SNIS).
// NÃO altera dados do site: só CHECA se a fonte publicou um ano mais novo que o
// baseline (o ano mais recente já refletido nos módulos .ts) e, se sim, avisa
// (sync_log sempre + Telegram se os secrets existirem) pra fazermos o refresh.
//
// Detecção auth-free (sem BigQuery/conta de serviço):
//   - PIB: IBGE SIDRA tabela 5938 (ano mais recente com valor).
//   - SIH/SNIS: cobertura temporal do catálogo público da Base dos Dados (GraphQL).
//
// Ao refrescar um módulo, subir o baseline correspondente aqui.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MUNICIPIO = "5217104";
const BD_GRAPHQL = "https://backend.basedosdados.org/api/v1/graphql";

type Dataset = {
  chave: string;
  label: string;
  modulo: string;
  baseline: number; // ano mais recente já no site
  check: () => Promise<number | null>; // ano mais recente disponível na fonte
};

async function latestPibSidra(): Promise<number | null> {
  // Usa servicodados (apisidra.ibge.gov.br é bloqueado do ambiente da edge function).
  // Tabela 5938, variável 37 (PIB a preços correntes), período -1 = mais recente.
  try {
    const r = await fetch(
      `https://servicodados.ibge.gov.br/api/v3/agregados/5938/periodos/-1/variaveis/37?localidades=N6[${MUNICIPIO}]`,
      { headers: { "User-Agent": "piracanjuba-watchdog", "Accept": "application/json" } },
    );
    if (!r.ok) return null;
    const j = await r.json();
    const serie = j?.[0]?.resultados?.[0]?.series?.[0]?.serie as Record<string, string> | undefined;
    if (!serie) return null;
    const anos = Object.keys(serie)
      .filter((a) => serie[a] && serie[a] !== "..." && serie[a] !== "-")
      .map(Number)
      .filter((a) => !isNaN(a));
    return anos.length ? Math.max(...anos) : null;
  } catch {
    return null;
  }
}

async function latestBdCoverage(slugHint: string, tableSlug: string): Promise<number | null> {
  try {
    const q = `{ allDataset(slug_Icontains:"${slugHint}", first:8){ edges{ node{ tables{ edges{ node{ slug coverages{ edges{ node{ datetimeRanges{ edges{ node{ endYear } } } } } } } } } } } } }`;
    const r = await fetch(BD_GRAPHQL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "piracanjuba-watchdog" },
      body: JSON.stringify({ query: q }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const nodes = j?.data?.allDataset?.edges ?? [];
    let maxYear: number | null = null;
    for (const e of nodes) {
      for (const t of e?.node?.tables?.edges ?? []) {
        if (t?.node?.slug !== tableSlug) continue;
        for (const c of t?.node?.coverages?.edges ?? []) {
          for (const dr of c?.node?.datetimeRanges?.edges ?? []) {
            const y = dr?.node?.endYear;
            if (typeof y === "number" && (maxYear === null || y > maxYear)) maxYear = y;
          }
        }
      }
    }
    return maxYear;
  } catch {
    return null;
  }
}

const DATASETS: Dataset[] = [
  {
    chave: "pib",
    label: "PIB dos Municípios (IBGE)",
    modulo: "src/lib/data/pib-historico.ts",
    baseline: 2023,
    check: latestPibSidra,
  },
  {
    chave: "snis",
    label: "Saneamento (SNIS)",
    modulo: "src/lib/data/snis-saneamento.ts",
    baseline: 2022,
    check: () => latestBdCoverage("snis", "municipio_agua_esgoto"),
  },
  {
    // SIH é rolling; a cobertura da BD já marca 2026, então baseline 2026 evita
    // falso alarme e dispara quando a BD avançar (novo ano fechado).
    chave: "sih",
    label: "Internações hospitalares (SIH/SUS)",
    modulo: "src/lib/data/sih-internacoes.ts",
    baseline: 2026,
    check: () => latestBdCoverage("sih", "aihs_reduzidas"),
  },
];

async function sendTelegram(text: string): Promise<boolean> {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
  if (!token || !chatId) return false;
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: logEntry } = await supabase
    .from("sync_log")
    .insert({ tipo: "watchdog_dados_anuais", status: "running" })
    .select("id")
    .single();
  const logId = logEntry?.id;

  const checados: Record<string, string> = {};
  const novidades: string[] = [];

  for (const d of DATASETS) {
    const latest = await d.check();
    if (latest === null) {
      checados[d.chave] = "fonte indisponível";
      continue;
    }
    if (latest > d.baseline) {
      checados[d.chave] = `NOVO: ${latest} (site em ${d.baseline})`;
      novidades.push(`• <b>${d.label}</b>: fonte já tem ${latest} (site está em ${d.baseline}). Refresh: ${d.modulo}`);
    } else {
      checados[d.chave] = `ok: ${latest} (baseline ${d.baseline})`;
    }
  }

  let telegramEnviado = false;
  if (novidades.length > 0) {
    const msg =
      `📊 <b>Piracanjuba.ai — dado novo disponível</b>\n\n` +
      novidades.join("\n") +
      `\n\nPra atualizar: rode as queries documentadas no topo de cada módulo e suba o baseline no watchdog.`;
    telegramEnviado = await sendTelegram(msg);
  }

  const status = novidades.length > 0 ? "partial" : "success";
  if (logId) {
    await supabase.from("sync_log").update({
      status,
      finished_at: new Date().toISOString(),
      detalhes: { checados, novidades: novidades.length, telegram: telegramEnviado },
    }).eq("id", logId);
  }

  return new Response(
    JSON.stringify({ status, checados, novidades, telegram_enviado: telegramEnviado }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
