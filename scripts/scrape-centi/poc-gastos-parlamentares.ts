// POC: coleta por browser renderizado da pagina de Gastos Parlamentares
// do portal LAI Centi/NucleoGov da Camara Municipal de Piracanjuba.
//
// Objetivo (definido pelo Codex em 2026-05-15):
//   - Abrir a URL alvo
//   - Salvar screenshot full page
//   - Salvar HTML final renderizado
//   - Salvar HAR (network) com XHR/fetch capturados
//   - Salvar innerText do body
//   - Listar todos os endpoints internos que a SPA chama
//
// Criterio de sucesso: screenshot OU lista XHR mostra dados reais de gastos.
// Se so aparecer shell da SPA, estrategia ainda nao esta validada.

import fs from "node:fs/promises";
import path from "node:path";
import { openCentiSession, attachNetworkRecorder, CENTI_BASE } from "./util/centi-session.js";

const OUT_DIR = process.env.OUT_DIR ?? "out";
const TARGET_URL = `${CENTI_BASE}/cidadao/transparencia/gastosparlamentares`;

async function ensureOutDir() {
  await fs.mkdir(OUT_DIR, { recursive: true });
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

async function main() {
  await ensureOutDir();
  const ts = timestamp();
  const harPath = path.join(OUT_DIR, `gastos-${ts}.har`);

  console.log(`[poc] target: ${TARGET_URL}`);
  console.log(`[poc] out: ${OUT_DIR}`);

  const session = await openCentiSession({ headless: true, recordHar: harPath });
  const records = attachNetworkRecorder(session.page);

  try {
    console.log("[poc] navigating...");
    const startedAt = Date.now();
    const resp = await session.page.goto(TARGET_URL, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });

    const status = resp?.status() ?? 0;
    console.log(`[poc] initial HTTP ${status}`);

    // Espera adicional defensiva: SPA do Centi pode demorar a hidratar
    await session.page.waitForTimeout(8_000);

    // Tira screenshot full page
    const screenshotPath = path.join(OUT_DIR, `gastos-${ts}.png`);
    await session.page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`[poc] screenshot saved: ${screenshotPath}`);

    // Salva HTML final renderizado
    const html = await session.page.content();
    const htmlPath = path.join(OUT_DIR, `gastos-${ts}.html`);
    await fs.writeFile(htmlPath, html, "utf-8");
    console.log(`[poc] html saved: ${htmlPath} (${html.length} bytes)`);

    // Salva innerText do body (pra rapidamente ver se ha dados reais)
    const innerText = await session.page.evaluate(() => document.body.innerText);
    const innerPath = path.join(OUT_DIR, `gastos-${ts}.txt`);
    await fs.writeFile(innerPath, innerText, "utf-8");
    console.log(
      `[poc] innerText saved: ${innerPath} (${innerText.length} chars, ${innerText.split("\n").length} lines)`,
    );

    // Lista todos os XHR/fetch capturados (ordenados por relevancia)
    const xhrJsonPath = path.join(OUT_DIR, `gastos-${ts}.network.json`);
    await fs.writeFile(xhrJsonPath, JSON.stringify(records, null, 2), "utf-8");

    // Filtra apenas XHR/JSON que NAO sao assets estaticos
    const interestingXhr = records.filter(
      (r) =>
        !r.url.match(/\.(css|js|png|jpg|jpeg|svg|woff2?|ico|ttf|gif|webp)(\?|$)/i) &&
        r.url !== TARGET_URL &&
        !r.url.startsWith("https://static.nucleogov.com.br/"),
    );

    console.log(`\n[poc] === XHR/fetch capturados (${records.length} total, ${interestingXhr.length} interessantes) ===`);
    for (const r of interestingXhr) {
      console.log(`  ${r.method} ${r.status} ${r.contentType.slice(0, 40)} ${r.size}B  ${r.url}`);
    }

    // Pesquisa simples por dados reais no innerText
    const hasMoneyMarkers = /R\$\s*[\d.,]+/g.test(innerText);
    const moneyMatches = innerText.match(/R\$\s*[\d.,]+/g)?.slice(0, 5) ?? [];
    const hasCategoriaMarkers = /(combustivel|alimentacao|divulgacao|telefonia|locacao)/i.test(innerText);

    console.log(`\n[poc] === Validacao de dados ===`);
    console.log(`  hasMoneyMarkers (R$ X,XX): ${hasMoneyMarkers ? "✓" : "✗"}`);
    if (moneyMatches.length > 0) {
      console.log(`  samples R$: ${moneyMatches.join(", ")}`);
    }
    console.log(`  hasCategoriaMarkers: ${hasCategoriaMarkers ? "✓" : "✗"}`);
    console.log(`  innerText preview:\n${"-".repeat(60)}`);
    console.log(innerText.slice(0, 400));
    console.log(`${"-".repeat(60)}\n`);

    // Resumo em JSON pra automacao
    const summary = {
      target_url: TARGET_URL,
      timestamp: new Date().toISOString(),
      initial_http_status: status,
      duration_ms: Date.now() - startedAt,
      html_size: html.length,
      innertext_chars: innerText.length,
      innertext_lines: innerText.split("\n").length,
      total_network_records: records.length,
      interesting_xhr_count: interestingXhr.length,
      has_money_markers: hasMoneyMarkers,
      has_categoria_markers: hasCategoriaMarkers,
      money_samples: moneyMatches,
      success_criteria:
        hasMoneyMarkers || interestingXhr.some((r) => r.contentType.includes("json")),
    };
    const summaryPath = path.join(OUT_DIR, `gastos-${ts}.summary.json`);
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), "utf-8");
    console.log(`[poc] summary: ${summaryPath}`);
    console.log(`[poc] criterio de sucesso atingido: ${summary.success_criteria ? "SIM" : "NAO"}`);
  } catch (err) {
    console.error("[poc] ERROR:", err);
    process.exitCode = 1;
  } finally {
    await session.close();
    console.log(`[poc] har: ${harPath}`);
    console.log("[poc] done.");
  }
}

main();
