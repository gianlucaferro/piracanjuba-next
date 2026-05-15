// Helper de sessao Playwright pro portal LAI Centi de Piracanjuba.
// Aplicacao: browser real renderizado, locale pt-BR, timezone Sao_Paulo,
// viewport estavel, sem stealth plugin (conforme orientacao Codex 2026-05-15).

import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

export type CentiSession = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  close: () => Promise<void>;
};

export const CENTI_BASE = "https://acessoainformacao.piracanjuba.go.leg.br";

/**
 * Inicia uma sessao Playwright com parametros pt-BR estaveis.
 * Conforme Codex: NAO usar stealth-plugin no POC. Browser real basta.
 */
export async function openCentiSession(opts?: {
  headless?: boolean;
  recordHar?: string | null;
}): Promise<CentiSession> {
  const browser = await chromium.launch({
    headless: opts?.headless ?? true,
  });

  const context = await browser.newContext({
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    viewport: { width: 1366, height: 768 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    extraHTTPHeaders: {
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.5,en;q=0.4",
    },
    recordHar: opts?.recordHar
      ? { path: opts.recordHar, mode: "minimal", content: "embed" }
      : undefined,
  });

  const page = await context.newPage();

  return {
    browser,
    context,
    page,
    close: async () => {
      await context.close();
      await browser.close();
    },
  };
}

/**
 * Captura todos os XHR/fetch responses durante o carregamento.
 * Util pra descobrir endpoints internos do Centi sem ler DOM.
 */
export function attachNetworkRecorder(page: Page) {
  const records: Array<{
    url: string;
    method: string;
    status: number;
    contentType: string;
    size: number;
    timestamp: string;
  }> = [];

  page.on("response", async (resp) => {
    try {
      const req = resp.request();
      const ct = resp.headers()["content-type"] ?? "";
      const body = await resp.body().catch(() => Buffer.alloc(0));
      records.push({
        url: resp.url(),
        method: req.method(),
        status: resp.status(),
        contentType: ct,
        size: body.length,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // ignore
    }
  });

  return records;
}
