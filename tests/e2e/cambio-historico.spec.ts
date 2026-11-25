import { expect, test, type Page } from "@playwright/test";

// 2026-11-25 17:40 em Brasília.
const NOW = "2026-11-25T20:40:00.000Z";

function history() {
  return {
    source: "AwesomeAPI",
    currency: "USD",
    days: 30,
    points: [
      { date: "2026-10-27", buy: 5.01, quotedAt: "2026-10-27T22:00:00.000Z" },
      { date: "2026-11-03", buy: 5.2345, quotedAt: "2026-11-03T22:00:00.000Z" },
      { date: "2026-11-12", buy: 5.6789, quotedAt: "2026-11-12T22:00:00.000Z" },
      { date: "2026-11-20", buy: 5.9488, quotedAt: "2026-11-20T18:18:00.000Z" },
      { date: "2026-11-24", buy: 5.9055, quotedAt: "2026-11-24T22:44:00.000Z" },
      { date: "2026-11-25", buy: 5.8168, quotedAt: "2026-11-25T20:35:00.000Z" },
    ],
    fetchedAt: NOW,
  };
}

type FixtureResponse = { status?: number; body: unknown };

async function mockHistory(page: Page, respond: (call: number) => FixtureResponse, fixClock = true) {
  if (fixClock) await page.clock.setFixedTime(new Date(NOW));
  let calls = 0;
  await page.route("**/api/cambio/historico", async (route) => {
    expect(route.request().method()).toBe("GET");
    const response = respond(++calls);
    await route.fulfill({ status: response.status ?? 200, json: response.body });
  });
  return () => calls;
}

async function openHistory(page: Page) {
  await page.goto("/economia");
  const panel = page.getByRole("region", { name: "Dólar comercial nos últimos 30 dias", exact: true });
  await expect(panel).toBeVisible();
  return panel;
}

test("gráfico de 30 dias mostra último valor, variação, extremos e tabela sem ultrapassar a tela", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mockHistory(page, () => ({ body: history() }));
  const panel = await openHistory(page);

  await expect(panel).toContainText(/Último valor\s*R\$\s*5,8168\s*Hoje, às 17:35 \(parcial\)/);
  // (5,8168 - 5,01) / 5,01 = +16,10%
  await expect(panel).toContainText(/Variação no período.*\+16,10%.*Desde 27\/10\/2026/);
  await expect(panel).toContainText(/Mínima\s*R\$\s*5,0100\s*27\/10\/2026/);
  await expect(panel).toContainText(/Máxima\s*R\$\s*5,9488\s*20\/11\/2026/);

  const chart = panel.getByTestId("grafico-dolar-30-dias");
  await expect(chart.locator(".recharts-line-curve")).toHaveCount(1);
  // Eixo com marcas redondas de R$ 0,20 entre R$ 5,00 e R$ 6,00, envolvendo mínima e máxima.
  await expect(chart).toContainText(/R\$\s*5,00/);
  await expect(chart).toContainText(/R\$\s*6,00/);

  const table = panel.getByRole("table");
  await expect(table).toBeHidden();
  await panel.getByText("Ver os valores em tabela", { exact: true }).click();
  await expect(table).toBeVisible();
  const rows = table.locator("tbody tr");
  await expect(rows).toHaveCount(6);
  await expect(rows.first()).toContainText(/Hoje, às 17:35 \(parcial\)\s*R\$\s*5,8168/);
  await expect(rows.last()).toContainText(/27\/10\/2026\s*R\$\s*5,0100/);

  await expect(panel.getByRole("link", { name: /AwesomeAPI/ })).toHaveAttribute("href", /^https:\/\/docs\.awesomeapi\.com\.br\//);
  const box = await panel.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual((page.viewportSize()?.width ?? 0) + 1);
  expect(await panel.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await panel.screenshot({ path: `artifacts/cambio-historico-${testInfo.project.name}.png` });
  expect(errors).toEqual([]);
});

test("passar o ponteiro sobre o gráfico mostra o valor e o dia", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Sem ponteiro no celular; a tabela cobre o mesmo conteúdo.");
  // Este teste dispensa o relógio fixo: o rótulo do último dia é aceito nas duas formas.
  await mockHistory(page, () => ({ body: history() }), false);
  const panel = await openHistory(page);
  const surface = panel.getByTestId("grafico-dolar-30-dias").locator(".recharts-surface");
  // Centraliza o gráfico sem a rolagem suave do site, para o ponteiro não cair fora da tela
  // nem sob o botão flutuante.
  await surface.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
  const tooltip = panel.locator(".recharts-tooltip-wrapper");
  // O gráfico só responde ao ponteiro depois de medir o próprio tamanho: repete o movimento até lá,
  // medindo a posição de novo a cada tentativa.
  await expect(async () => {
    const box = await surface.boundingBox();
    expect(box).not.toBeNull();
    // 95% da largura fica dentro da área do gráfico e na faixa do último dia.
    const x = box!.x + box!.width * 0.95;
    const y = box!.y + box!.height / 2;
    await page.mouse.move(x - 40, y);
    await page.mouse.move(x, y, { steps: 4 });
    await expect(tooltip).toContainText(/R\$\s*5,8168/, { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  // Com o relógio real, o último dia aparece como "hoje" só se o teste rodar em 25/11/2026.
  await expect(tooltip).toContainText(/Hoje, às 17:35 \(parcial\)|25\/11\/2026/);
});

test("falha do histórico oferece nova tentativa sem desenhar valores inventados", async ({ page }) => {
  let fail = true;
  await mockHistory(page, () => fail
    ? { status: 503, body: { error: "Histórico do dólar temporariamente indisponível." } }
    : { body: history() });
  const panel = await openHistory(page);
  await expect(panel).toContainText("Histórico do dólar indisponível no momento.");
  await expect(panel).not.toContainText(/R\$/);
  await expect(panel.getByTestId("grafico-dolar-30-dias")).toHaveCount(0);
  fail = false;
  await panel.getByRole("button", { name: "Tentar novamente", exact: true }).click();
  await expect(panel).toContainText(/Último valor\s*R\$\s*5,8168/);
  await expect(panel).not.toContainText("Histórico do dólar indisponível no momento.");
});

test("resposta fora do contrato não vira gráfico", async ({ page }) => {
  const tampered = history();
  tampered.points.reverse();
  await mockHistory(page, () => ({ body: tampered }));
  const panel = await openHistory(page);
  await expect(panel).toContainText("Histórico do dólar indisponível no momento.");
  await expect(panel.getByTestId("grafico-dolar-30-dias")).toHaveCount(0);
});

test("bloco de câmbio da home leva ao gráfico de 30 dias", async ({ page }) => {
  await page.clock.setFixedTime(new Date(NOW));
  await page.route("**/api/cambio", (route) => route.fulfill({ status: 503, json: { error: "indisponível" } }));
  await page.goto("/");
  const panel = page.getByRole("region", { name: "Cotações de câmbio", exact: true });
  await expect(panel.getByRole("link", { name: "Dólar nos últimos 30 dias", exact: true }))
    .toHaveAttribute("href", "/economia#dolar-30-dias");
});
