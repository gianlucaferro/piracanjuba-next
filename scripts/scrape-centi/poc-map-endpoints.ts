// POC: descobrir o (referer, action, params) correto pra cada endpoint do
// portal LAI Centi captando os XHRs feitos pela SPA na carga inicial.
//
// Output: scripts/scrape-centi/endpoints.json com mapping pronto pra usar
// em edge function genérica `centi-fetch`.

import fs from "node:fs/promises";
import path from "node:path";
import { openCentiSession, attachNetworkRecorder, CENTI_BASE } from "./util/centi-session.js";

const OUT_DIR = process.env.OUT_DIR ?? "out";

// Páginas a explorar
const TARGETS = [
  { tag: "gastos_parlamentares", path: "/cidadao/transparencia/gastosparlamentares" },
  { tag: "diarias", path: "/cidadao/transparencia/diarias_cnt" },
  { tag: "folha_pagamento", path: "/cidadao/transparencia/servidores_cnt" },
  { tag: "padrao_remuneratorio", path: "/cidadao/transparencia/padraoremuneratorio" },
  { tag: "despesas", path: "/cidadao/transparencia/cntdespesas" },
  { tag: "duodecimo", path: "/cidadao/transparencia/sgduodecimo" },
  { tag: "contratos", path: "/cidadao/informacao/contratos_cnt" },
  { tag: "licitacoes", path: "/cidadao/informacao/licitacoes_cnt" },
  { tag: "dispensas", path: "/cidadao/informacao/dispensas_cnt" },
  { tag: "obras", path: "/cidadao/informacao/obras" },
  { tag: "obras_paralisadas", path: "/cidadao/informacao/obras_paralisadas" },
  { tag: "sancoes", path: "/cidadao/informacao/sancoes_administrativas" },
  { tag: "lista_estagiarios", path: "/cidadao/outras_informacoes/lista_estagiarios" },
  { tag: "lista_terceirizados", path: "/cidadao/outras_informacoes/lista_terceirizados" },
  { tag: "leis", path: "/cidadao/legislacao/leis_cnt" },
  { tag: "decretos_legislativos", path: "/cidadao/legislacao/decretos_cnt" },
  { tag: "portarias", path: "/cidadao/legislacao/portarias_cnt" },
  { tag: "resolucoes", path: "/cidadao/legislacao/resolucoes" },
  { tag: "atividades_legislativas", path: "/cidadao/legislacao/atividades_legislativas" },
  { tag: "atos_id_2", path: "/cidadao/atos_adm/mp/id=2" },     // PL Legislativo
  { tag: "atos_id_3", path: "/cidadao/atos_adm/mp/id=3" },     // PL Executivo
  { tag: "atos_id_4", path: "/cidadao/atos_adm/mp/id=4" },     // Decretos
  { tag: "atos_id_5", path: "/cidadao/atos_adm/mp/id=5" },     // Resolucoes
  { tag: "atos_id_6", path: "/atos_adm/mp/id=6" },             // Pautas Sessoes
  { tag: "atos_id_7", path: "/atos_adm/mp/id=7" },             // Pautas Comissoes
  { tag: "atos_id_9", path: "/atos_adm/mp/id=9" },             // Atas
  { tag: "atos_id_10", path: "/atos_adm/mp/id=10" },           // Votacoes
  { tag: "atos_id_11", path: "/atos_adm/mp/id=11" },           // Presenca
  { tag: "atos_id_14", path: "/atos_adm/mp/id=14" },           // Requerimentos
  { tag: "atos_id_15", path: "/atos_adm/mp/id=15" },           // Pareceres
  { tag: "atos_id_16", path: "/atos_adm/mp/id=16" },           // Indicacoes
  { tag: "atos_id_19", path: "/cidadao/atos_adm/mp/id=19" },   // Emendas LO
  { tag: "atos_id_20", path: "/cidadao/atos_adm/mp/id=20" },   // Emendas
  { tag: "atos_id_21", path: "/atos_adm/mp/id=21" },           // Mocoes
];

type ApiCall = {
  referer: string;
  request_body: string;
  response_status: number;
  response_size: number;
  response_preview: string;
};

type EndpointMap = {
  tag: string;
  url_pagina: string;
  status_pagina: number;
  api_calls: ApiCall[];
  duration_ms: number;
};

async function probeOne(tag: string, pageUrl: string): Promise<EndpointMap> {
  const session = await openCentiSession({ headless: true, recordHar: null });
  const apiCalls: ApiCall[] = [];

  // Intercepta POST /api requests
  session.page.on("response", async (resp) => {
    try {
      const req = resp.request();
      const url = resp.url();
      if (req.method() !== "POST" || !url.includes("/api")) return;

      const reqBody = req.postData() ?? "";
      const respText = (await resp.text().catch(() => "")) ?? "";
      const refHeaders = req.headers();
      apiCalls.push({
        referer: refHeaders["referer"] ?? "",
        request_body: reqBody.slice(0, 500),
        response_status: resp.status(),
        response_size: respText.length,
        response_preview: respText.slice(0, 300),
      });
    } catch {
      // ignore
    }
  });

  const fullUrl = `${CENTI_BASE}${pageUrl}`;
  const started = Date.now();
  let status = 0;

  try {
    const resp = await session.page.goto(fullUrl, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    status = resp?.status() ?? 0;
    await session.page.waitForTimeout(5_000);
  } catch (e) {
    console.error(`[${tag}] erro:`, e);
  } finally {
    await session.close();
  }

  return {
    tag,
    url_pagina: fullUrl,
    status_pagina: status,
    api_calls: apiCalls,
    duration_ms: Date.now() - started,
  };
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const startedAt = Date.now();

  const results: EndpointMap[] = [];
  for (const t of TARGETS) {
    const startMs = Date.now();
    process.stdout.write(`[${t.tag}] probing... `);
    const r = await probeOne(t.tag, t.path);
    results.push(r);
    process.stdout.write(
      `HTTP ${r.status_pagina} | ${r.api_calls.length} api calls | ${Date.now() - startMs}ms\n`,
    );
  }

  // Salvar manifest
  const outPath = path.join(OUT_DIR, `endpoints-map-${new Date().toISOString().slice(0, 10)}.json`);
  await fs.writeFile(outPath, JSON.stringify(results, null, 2), "utf-8");
  console.log(`\n[done] ${results.length} endpoints em ${Date.now() - startedAt}ms`);
  console.log(`[done] manifest salvo: ${outPath}`);

  // Resumo legível
  console.log("\n=== Resumo (endpoint → calls) ===");
  for (const r of results) {
    const successCalls = r.api_calls.filter((c) => c.response_status === 200);
    console.log(
      `  ${r.tag.padEnd(28)} status=${r.status_pagina} calls=${r.api_calls.length} ok=${successCalls.length}`,
    );
  }
}

main();
