import { expect, test, type Page } from "@playwright/test";

const NOW = "2026-11-23T15:00:00.000Z";
const USD_TIME = "2026-11-23T14:59:00.000Z";
const EUR_TIME = "2026-11-23T14:58:00.000Z";

function snapshot() {
  return {
    source: "AwesomeAPI",
    quotes: [
      { currency: "USD", buy: 5.1234, sell: 5.1256, changePercent: 0.25, quotedAt: USD_TIME },
      { currency: "EUR", buy: 6.2345, sell: 6.2399, changePercent: -0.42, quotedAt: EUR_TIME },
    ],
    fetchedAt: NOW,
    pollIntervalSeconds: 60,
  };
}

type FixtureResponse = { status?: number; body: unknown };

async function mockCambio(
  page: Page,
  respond: (call: number) => FixtureResponse,
  controlTimers = false,
) {
  if (controlTimers) await page.clock.install({ time: new Date(NOW) });
  else await page.clock.setFixedTime(new Date(NOW));
  let calls = 0;
  await page.route("**/api/cambio", async (route) => {
    expect(route.request().method()).toBe("GET");
    const response = respond(++calls);
    await route.fulfill({ status: response.status ?? 200, json: response.body });
  });
  return () => calls;
}

async function openCambio(page: Page) {
  await page.goto("/");
  const panel = page.getByRole("region", { name: "Cotações de câmbio", exact: true });
  await expect(panel).toBeVisible();
  return panel;
}

test("câmbio mostra compra, venda e horário próprio de cada moeda sem ultrapassar a tela", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mockCambio(page, () => ({ body: snapshot() }));
  const panel = await openCambio(page);
  const dollar = panel.getByRole("article", { name: "Dólar americano", exact: true });
  const euro = panel.getByRole("article", { name: "Euro", exact: true });
  await expect(dollar).toContainText(/Compra.*R\$\s*5,1234/);
  await expect(dollar).toContainText(/Venda.*R\$\s*5,1256/);
  await expect(euro).toContainText(/Compra.*R\$\s*6,2345/);
  await expect(euro).toContainText(/Venda.*R\$\s*6,2399/);
  await expect(dollar).toContainText(/Variação da compra.*\+0,25%/);
  await expect(euro).toContainText(/Variação da compra.*-0,42%/);
  await expect(dollar.locator(`time[datetime="${USD_TIME}"]`)).toContainText(/2026-11-23.*11:59/);
  await expect(euro.locator(`time[datetime="${EUR_TIME}"]`)).toContainText(/2026-11-23.*11:58/);
  await expect(panel).toContainText("Horário de Brasília");
  await expect(panel.getByRole("link", { name: /AwesomeAPI/ })).toHaveAttribute("href", /^https:\/\/(?:docs\.)?awesomeapi\.com\.br(?:\/|$)/);
  const box = await panel.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual((page.viewportSize()?.width ?? 0) + 1);
  expect(await panel.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await panel.screenshot({ path: `artifacts/cambio-${testInfo.project.name}.png` });
  expect(errors).toEqual([]);
});

test("variação zero permanece diferente de variação não informada", async ({ page }) => {
  const response = snapshot();
  const quotes = response.quotes.map((quote) => ({
    ...quote,
    changePercent: quote.currency === "USD" ? 0 : null,
  }));
  await mockCambio(page, () => ({ body: { ...response, quotes } }));
  const panel = await openCambio(page);
  const dollar = panel.getByRole("article", { name: "Dólar americano", exact: true });
  const euro = panel.getByRole("article", { name: "Euro", exact: true });
  await expect(dollar).toContainText(/Variação da compra.*0,00%/);
  await expect(euro).toContainText(/Variação da compra.*Não informada/);
  await expect(euro).not.toContainText("0,00%");
});

test("falha inicial oferece nova tentativa sem inventar cotações zeradas", async ({ page }) => {
  let fail = true;
  await mockCambio(page, () => fail
    ? { status: 503, body: { error: "Fonte temporariamente indisponível" } }
    : { body: snapshot() });
  const panel = await openCambio(page);
  await expect(panel).toContainText("Cotações indisponíveis no momento.");
  await expect(panel).not.toContainText(/R\$/);
  fail = false;
  await panel.getByRole("button", { name: "Tentar novamente", exact: true }).click();
  await expect(panel.getByRole("article", { name: "Dólar americano", exact: true })).toContainText(/R\$\s*5,1234/);
  await expect(panel).not.toContainText("Cotações indisponíveis no momento.");
});

test("cotações recebem a atualização automática depois de um minuto", async ({ page }) => {
  let publishUpdate = false;
  const updated = snapshot();
  updated.quotes[0] = { ...updated.quotes[0], buy: 5.4321, sell: 5.4356, quotedAt: "2026-11-23T15:01:00.000Z" };
  updated.fetchedAt = "2026-11-23T15:01:00.000Z";
  const calls = await mockCambio(page, () => ({ body: publishUpdate ? updated : snapshot() }), true);
  const panel = await openCambio(page);
  const dollar = panel.getByRole("article", { name: "Dólar americano", exact: true });
  await expect(dollar).toContainText(/R\$\s*5,1234/);
  // A remontagem do React em desenvolvimento pode abortar e repetir a primeira consulta.
  const initialCalls = calls();
  publishUpdate = true;
  await page.clock.fastForward(30_000);
  expect(calls()).toBe(initialCalls);
  await expect(dollar).toContainText(/R\$\s*5,1234/);
  await page.clock.fastForward(30_000);
  await expect(dollar).toContainText(/R\$\s*5,4321/);
  await expect(dollar.locator('time[datetime="2026-11-23T15:01:00.000Z"]')).toContainText(/2026-11-23.*12:01/);
  expect(calls()).toBe(initialCalls + 1);
});

test("falha na atualização preserva os últimos valores e seus horários", async ({ page }) => {
  let fail = false;
  const calls = await mockCambio(page, () => fail
    ? { status: 503, body: { error: "Fonte temporariamente indisponível" } }
    : { body: snapshot() }, true);
  const panel = await openCambio(page);
  const dollar = panel.getByRole("article", { name: "Dólar americano", exact: true });
  await expect(dollar).toContainText(/R\$\s*5,1234/);
  const initialCalls = calls();
  fail = true;
  await page.clock.fastForward(60_000);
  await expect(panel).toContainText("Não foi possível atualizar. Exibindo as últimas cotações disponíveis.");
  await expect(dollar).toContainText(/R\$\s*5,1234/);
  await expect(dollar.locator(`time[datetime="${USD_TIME}"]`)).toBeVisible();
  await expect(panel.getByRole("article", { name: "Euro", exact: true })).toContainText(/R\$\s*6,2345/);
  expect(calls()).toBe(initialCalls + 1);
});

test("aviso de cotação antiga acompanha a moeda atrasada", async ({ page }) => {
  const response = snapshot();
  response.quotes[0].quotedAt = "2026-11-23T14:40:00.000Z";
  await mockCambio(page, () => ({ body: response }));
  const panel = await openCambio(page);
  const dollar = panel.getByRole("article", { name: "Dólar americano", exact: true });
  const euro = panel.getByRole("article", { name: "Euro", exact: true });
  await expect(dollar).toContainText("Cotação sem atualização recente.");
  await expect(euro).not.toContainText("Cotação sem atualização recente.");
  await expect(dollar.locator('time[datetime="2026-11-23T14:40:00.000Z"]')).toContainText(/2026-11-23.*11:40/);
  await expect(panel).not.toContainText(/mercado fechado|PTAX/i);
});

test("consulta antiga é sinalizada mesmo com horários de preço inferiores a quinze minutos", async ({ page }) => {
  const response = snapshot();
  response.fetchedAt = "2026-11-23T14:55:00.000Z";
  response.quotes[0].quotedAt = "2026-11-23T14:54:00.000Z";
  response.quotes[1].quotedAt = "2026-11-23T14:53:00.000Z";
  await mockCambio(page, () => ({ body: response }));
  const panel = await openCambio(page);
  await expect(panel.getByRole("article", { name: "Dólar americano", exact: true })).toContainText("Cotação sem atualização recente.");
  await expect(panel.getByRole("article", { name: "Euro", exact: true })).toContainText("Cotação sem atualização recente.");
});

test("aba oculta pausa consultas periódicas e volta a atualizar quando visível", async ({ page }) => {
  let publishUpdate = false;
  const updated = snapshot();
  updated.quotes[0] = { ...updated.quotes[0], buy: 5.4321, sell: 5.4356, quotedAt: "2026-11-23T15:02:00.000Z" };
  updated.fetchedAt = "2026-11-23T15:02:00.000Z";
  const calls = await mockCambio(page, () => ({ body: publishUpdate ? updated : snapshot() }), true);
  const panel = await openCambio(page);
  const dollar = panel.getByRole("article", { name: "Dólar americano", exact: true });
  await expect(dollar).toContainText(/R\$\s*5,1234/);
  const initialCalls = calls();
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange", { bubbles: true }));
  });
  await page.clock.fastForward(120_000);
  expect(calls()).toBe(initialCalls);
  publishUpdate = true;
  const refreshed = page.waitForResponse((response) => response.url().endsWith("/api/cambio") && response.ok());
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
    document.dispatchEvent(new Event("visibilitychange", { bubbles: true }));
  });
  await refreshed;
  // Executa as notificações agendadas após a resposta com o relógio controlado.
  await page.clock.runFor(100);
  await expect(dollar).toContainText(/R\$\s*5,4321/);
  expect(calls()).toBe(initialCalls + 1);
  await page.clock.fastForward(60_000);
  await expect.poll(calls).toBe(initialCalls + 2);
});
