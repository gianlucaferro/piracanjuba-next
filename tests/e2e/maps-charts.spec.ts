import { expect, test } from "@playwright/test";

test("mapa de classificados abre o anúncio correspondente", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // A posição e a navegação não dependem de rede externa para os tiles do mapa.
  await page.route(/https:\/\/[^/]*tile\.openstreetmap\.org\//, (route) => route.abort());
  await page.goto("/compra-e-venda");
  await page.getByRole("button", { name: /Ver mapa \(1 anúncios com localização\)/ }).click();
  await page.locator(".leaflet-marker-icon").click();
  const link = page.locator(".leaflet-popup-content").getByRole("link", { name: /Bicicleta de teste/ });
  await expect(link).toHaveAttribute("href", "/compra-e-venda/00000000-0000-4000-8000-000000000099");
  await link.click();
  await expect(page).toHaveURL(/\/compra-e-venda\/00000000-0000-4000-8000-000000000099$/);
  await expect(page.getByRole("heading", { name: "Bicicleta de teste", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("clima mantém medição isolada, dados ausentes e gráfico dentro da tela", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/clima");
  await expect(page.getByRole("heading", { level: 1, name: "Previsão do tempo em Piracanjuba" })).toBeVisible();
  // O dado de teste não tem leitura de hoje: o bloco "Tempo agora" (Onda 2, 2026-11-19) não aparece,
  // e nenhum valor ausente vira 0°C na página.
  await expect(page.getByRole("heading", { name: "Tempo agora em Piracanjuba" })).toHaveCount(0);
  expect(await page.locator("body").innerText()).not.toMatch(/(^|[^\d,.])0°C/);
  const temperature = page.locator("section").filter({ has: page.getByRole("heading", { name: /Temperatura diária/ }) });
  await temperature.scrollIntoViewIfNeeded();
  const dots = temperature.locator(".recharts-line-dot");
  await expect(dots).toHaveCount(3);
  for (const dot of await dots.all()) {
    await expect(dot).toBeVisible();
    const box = await dot.boundingBox();
    expect(box?.width).toBeGreaterThan(0);
    expect(box?.height).toBeGreaterThan(0);
  }
  await dots.nth(1).hover();
  await expect(temperature.getByText("25.4°C", { exact: true })).toBeVisible();
  const chart = await temperature.locator(".recharts-wrapper").boundingBox();
  expect(chart).not.toBeNull();
  expect(chart!.x).toBeGreaterThanOrEqual(0);
  expect(chart!.x + chart!.width).toBeLessThanOrEqual((page.viewportSize()?.width ?? 0) + 1);
  expect(errors).toEqual([]);
});
