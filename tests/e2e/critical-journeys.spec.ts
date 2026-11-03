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

test("home destaca serviços atuais e mantém ônibus ao lado dos grupos", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-03T15:00:00-03:00"));
  await page.goto("/");
  const today = page.getByRole("region", { name: "Hoje em Piracanjuba" });
  await expect(today).toContainText("2026-11-03");
  await expect(today.getByRole("link", { name: /Farmácia de plantão/ })).toBeVisible();
  const departure = today.getByRole("link", { name: /Próxima saída conferida/ });
  await expect(departure).toContainText("2026-11-04");
  await departure.click();
  await expect(page.locator("#bus-date")).toHaveValue("2026-11-04");
  await page.goto("/");
  const services = page.getByRole("region", { name: "Mais serviços" });
  const cards = await services.getByRole("link").all();
  const hrefs = await Promise.all(cards.map((card) => card.getAttribute("href")));
  expect(hrefs.indexOf("/horarios-onibus")).toBe(hrefs.indexOf("/grupos-economicos") + 1);
  await today.getByRole("link", { name: "Favoritos e avisos" }).click();
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

test("ônibus exige consulta para a data escolhida e preserva a data no canal externo", async ({ page }) => {
  await page.goto("/horarios-onibus");
  await page.locator("#bus-date").fill("2028-12-24");
  await expect(page.getByText(/Ainda não.*horários|Nenhum horário|Sem horários|não há.*conferid/i).first()).toBeVisible();
  const external = page.locator('a[href*="clickbus.com.br"][href*="departureDate=2028-12-24"]').first();
  await expect(external).toBeVisible();
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
