import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("favoritos mostram todos os atos retornados, inclusive após o quadragésimo", async ({ page }) => {
  await page.route("**/api/acompanhar", (route) => route.fulfill({ json: {
    items: Array.from({ length: 50 }, (_, index) => ({ id: `camara:${index}`, topic: "camara", title: `Ato parlamentar ${index + 1}`, detail: "Registro de teste", href: "/atuacao-parlamentar", revision: "v1", filter: "Vereador Teste" })),
    unavailable: ["farmacias", "onibus", "contratos"], checkedAt: "2026-11-03T20:00:00Z",
  } }));
  await page.goto("/acompanhar");
  await page.getByRole("checkbox", { name: "Atuação dos vereadores" }).check();
  await page.getByRole("button", { name: "Salvar preferências" }).click();
  await expect(page.getByRole("heading", { name: "Ato parlamentar 50", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Ato parlamentar / })).toHaveCount(50);
});

test("home mantém ônibus ao lado dos grupos e mostra a imprensa no lugar do bloco Hoje", async ({ page }) => {
  await page.goto("/");
  // O bloco "Hoje em Piracanjuba" saiu da home em 2026-11-17 (decisão do operador); a faixa da imprensa ficou no lugar.
  await expect(page.getByRole("region", { name: "Hoje em Piracanjuba" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "O Piracanjuba.ai na imprensa" })).toBeVisible();
  const services = page.getByRole("region", { name: "Mais serviços" });
  const cards = await services.getByRole("link").all();
  const hrefs = await Promise.all(cards.map((card) => card.getAttribute("href")));
  expect(hrefs.indexOf("/horarios-onibus")).toBe(hrefs.indexOf("/grupos-economicos") + 1);
});

test("Favoritos e avisos continua acessível pelo menu Mais", async ({ page }) => {
  await page.goto("/");
  await page.locator('button[aria-label="Mais seções"]:visible').click();
  await page.getByRole("link", { name: /Favoritos e avisos/ }).first().click();
  await expect(page.getByRole("heading", { name: "Favoritos e avisos", level: 1 })).toBeVisible();
});

for (const [orgao, marker, count] of [["prefeitura", "PREF", 1002], ["camara", "CAM", 32]] as const) {
  test(`servidores ${orgao}: busca, paginação e exportação completa sem misturar órgãos`, async ({ page }) => {
    await page.goto(`/${orgao}/servidores`);
    await expect(page.getByText(`${count} servidores encontrados`, { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Próxima", exact: false }).click();
    await expect(page.getByText(`${marker} Servidor 0031`, { exact: true })).toBeVisible();
    const search = page.getByPlaceholder("Buscar servidor por nome...");
    await search.fill("0001");
    await expect(page.getByText(`${marker} Servidor 0001`, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: new RegExp(marker === "PREF" ? "CAM Servidor" : "PREF Servidor") })).toHaveCount(0);
    await search.fill("");
    await expect(page.getByText(`${count} servidores encontrados`, { exact: false })).toBeVisible();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar CSV" }).click();
    const download = await downloadPromise;
    const file = await download.path();
    expect(file).toBeTruthy();
    const csv = await readFile(file!, "utf8");
    expect(csv.trim().split("\n")).toHaveLength(count + 1);
    expect(csv).not.toContain(marker === "PREF" ? "CAM Servidor" : "PREF Servidor");
  });
}

test("ônibus mostra o quadro regular da data escolhida e preserva a data no canal externo", async ({ page }, testInfo) => {
  await page.goto("/horarios-onibus");
  // 2028-12-24 é domingo: Real Expresso pela BR-153 às 15:50 para Goiânia.
  await page.locator("#bus-date").fill("2028-12-24");
  await expect(page.getByRole("heading", { name: "Horários para 2028-12-24" })).toBeVisible();
  await expect(page.getByText(/horários previstos/).first()).toBeVisible();
  await expect(page.getByText("Horários regulares de", { exact: false })).toBeVisible();
  const realGoiania = page.locator("article").filter({ hasText: "Real Expresso" }).filter({ hasText: "Goiânia, GO" });
  await expect(realGoiania.locator('time[datetime="2028-12-24T15:50:00-03:00"]')).toBeVisible();
  await expect(realGoiania.getByText("Quadro AGR · previsão")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: `artifacts/onibus-saida-${testInfo.project.name}.png`, fullPage: true });
  await page.locator("#bus-destination").selectOption("uberlandia");
  await expect(page.getByRole("heading", { name: "Sem linha direta: troca de ônibus em Goiânia" })).toBeVisible();
  await page.getByRole("button", { name: "Ver horários para Goiânia" }).click();
  await expect(page.locator("#bus-destination")).toHaveValue("goiania");
  const external = page.locator('a[href*="clickbus.com.br/onibus/piracanjuba-go/goiania-go"][href*="departureDate=2028-12-24"]').first();
  await expect(external).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Application error");
});

test("ônibus chegando em Piracanjuba mostra a saída na origem e a chegada prevista", async ({ page }, testInfo) => {
  // 2028-12-27 é quarta-feira: a Real vem pela GO-020 e chega às 15:30 vinda de Caldas Novas.
  await page.goto("/horarios-onibus?sentido=chegada&data=2028-12-27&destino=caldas-novas");
  await expect(page.getByRole("button", { name: "Chegando em Piracanjuba" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Origem", { exact: true })).toHaveValue("caldas-novas");
  await expect(page.getByText("6 horários previstos")).toBeVisible();
  const real = page.locator("article").filter({ hasText: "Real Expresso" });
  await expect(real.locator('time[datetime="2028-12-27T14:30:00-03:00"]')).toBeVisible();
  await expect(real.locator('time[datetime="2028-12-27T15:30:00-03:00"]')).toBeVisible();
  await expect(real).toContainText("Piracanjuba, GO");
  await expect(page.locator('a[href="https://www.clickbus.com.br/onibus/caldas-novas-go/piracanjuba-go?departureDate=2028-12-27"]').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: `artifacts/onibus-chegada-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "Saindo de Piracanjuba" }).click();
  await expect(page.getByLabel("Destino", { exact: true })).toHaveValue("caldas-novas");
  await expect(page.locator("article").filter({ hasText: "Real Expresso" }).locator('time[datetime="2028-12-27T12:10:00-03:00"]')).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Application error");
});

test("ônibus mostra o valor das passagens nos cartões e no resumo", async ({ page }, testInfo) => {
  await page.clock.setFixedTime(new Date("2026-11-27T12:00:00-03:00"));
  await page.goto("/horarios-onibus?data=2026-11-28&destino=goiania");
  const marly = page.locator("article").filter({ hasText: "Expresso Marly" }).filter({ has: page.locator('time[datetime="2026-11-28T08:00:00-03:00"]') });
  await expect(marly).toContainText(/Convencional\s*R\$\s*47,99/);
  await expect(marly).toContainText(/Leito\s*R\$\s*60,00/);
  const resumo = page.getByRole("region", { name: "Valor das passagens" });
  await expect(resumo).toContainText(/Piracanjuba a Goiânia\s*R\$\s*40,86 a R\$\s*60,00/);
  await expect(resumo).toContainText(/Caldas Novas a Piracanjuba\s*R\$\s*30,99 a R\$\s*50,00/);
  await page.getByRole("button", { name: "Chegando em Piracanjuba" }).click();
  await page.locator("#bus-destination").selectOption("caldas-novas");
  await expect(page.locator("article").filter({ hasText: "Expresso União" })).toContainText(/R\$\s*32,70/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: `artifacts/onibus-precos-${testInfo.project.name}.png`, fullPage: true });
});

test("ônibus esconde valores com mais de 120 dias sem conferência", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2027-06-01T12:00:00-03:00"));
  await page.goto("/horarios-onibus?data=2027-06-02&destino=goiania");
  await expect(page.getByRole("heading", { name: "Horários para 2027-06-02" })).toBeVisible();
  await expect(page.locator("article").first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Valor das passagens" })).toHaveCount(0);
  await expect(page.locator("article").first()).not.toContainText("Passagem:");
});

test("ônibus em data anterior ao quadro mostra o arquivo sem inventar horários", async ({ page }) => {
  await page.goto("/horarios-onibus?data=2026-10-15");
  await expect(page.getByText("Ainda não conferimos os horários para esta data")).toBeVisible();
  await expect(page.getByText("Consulta arquivada", { exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Application error");
});

test("plantão navega para semana específica e oferece contato e compartilhamento", async ({ page }) => {
  await page.goto("/plantao-farmacias#2026-11-07");
  const week = page.locator('[id="2026-11-07"]');
  await expect(week).toBeVisible();
  await expect(week.getByRole("link", { name: "Compartilhar", exact: false })).toHaveAttribute("href", /wa.me/);
  expect(await week.locator('a[href^="tel:"], a[href*="wa.me"]').count()).toBeGreaterThan(1);
});

test("favoritos persistem, permitem cancelar avisos e apagar preferências", async ({ page }) => {
  await page.goto("/acompanhar");
  await page.getByLabel("Plantão de farmácias", { exact: true }).check();
  await page.getByLabel("Frequência dos avisos ao voltar").selectOption("daily");
  await page.getByRole("button", { name: "Salvar preferências" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Preferências salvas" })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Plantão de farmácias", { exact: true })).toBeChecked();
  await page.route("**/api/acompanhar", (route) => route.abort());
  await page.getByLabel("Frequência dos avisos ao voltar").selectOption("off");
  await page.getByRole("button", { name: "Salvar preferências" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Preferências salvas" })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Frequência dos avisos ao voltar")).toHaveValue("off");
  await page.getByRole("button", { name: "Apagar preferências" }).click();
  await expect(page.getByLabel("Plantão de farmácias", { exact: true })).not.toBeChecked();
});
