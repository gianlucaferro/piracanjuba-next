import { expect, test, type Page } from "@playwright/test";

// O servidor de e2e responde o GBIF e o iNaturalist com tests/fixtures/biodiversidade-fixtures.mjs
// (PIRACANJUBA_E2E=1). Os números abaixo são os das fixtures, diferentes dos reais.

const LINK_GBIF =
  "https://www.gbif.org/occurrence/search?gadmGid=BRA.9.183_2&occurrenceStatus=PRESENT&license=CC0_1_0&license=CC_BY_4_0";
const LINK_INATURALIST = "https://www.inaturalist.org/observations?place_id=21162&verifiable=true&view=species";

async function abrirSecao(page: Page) {
  // O navegador fica só no servidor local: nada de anúncio, mapa ou API externa durante o teste.
  await page.route("**/*", (route) => {
    const { hostname } = new URL(route.request().url());
    return hostname === "127.0.0.1" || hostname === "localhost" ? route.continue() : route.abort();
  });
  await page.goto("/meio-ambiente");
  const secao = page.getByRole("region", { name: "Biodiversidade registrada em Piracanjuba", exact: true });
  await expect(secao).toBeVisible();
  await secao.evaluate((elemento) => elemento.scrollIntoView({ block: "start", behavior: "instant" }));
  return secao;
}

test("biodiversidade mostra totais, grupos, espécies e créditos das fixtures sem ultrapassar a tela", async ({ page }, testInfo) => {
  const erros: string[] = [];
  page.on("pageerror", (erro) => erros.push(erro.message));
  const secao = await abrirSecao(page);

  await expect(secao).toContainText(/330\s*espécies identificadas\s*No GBIF, em registros de 1950 a 2026/);
  await expect(secao).toContainText(/1\.234\s*registros de ocorrência\s*904 observações em campo e 300 exemplares de museus e herbários/);
  await expect(secao).toContainText(
    /3\s*espécies ameaçadas ou quase ameaçadas\s*Lista Vermelha da IUCN: 1 vulnerável e 2 quase ameaçadas/,
  );
  await expect(secao).toContainText(/175\s*observações no iNaturalist\s*87 espécies, por 21 pessoas/);

  const tabela = secao.getByRole("table", { name: "Espécies e registros por grande grupo, segundo o GBIF" });
  const linhas = tabela.locator("tbody tr");
  await expect(linhas).toHaveCount(10);
  await expect(linhas.first()).toHaveText(/^\s*Aves\s*150\s*600\s*$/);
  await expect(linhas.nth(2)).toHaveText(/^\s*Peixes\s*33\s*30\s*$/);
  await expect(linhas.last()).toHaveText(/^\s*Outros grupos\s*6\s*156\s*$/);
  await expect(tabela.locator("tfoot")).toHaveText(/Total\s*330\s*1\.234/);

  // Uma barra por grupo, na mesma ordem da tabela.
  const grafico = secao.getByTestId("grafico-biodiversidade-grupos");
  await expect(grafico.locator(".recharts-bar-rectangle")).toHaveCount(10);
  await expect(grafico).toContainText("Aves");
  await expect(grafico).toContainText("150");

  const maisRegistradas = secao.locator("ol").first();
  await expect(maisRegistradas.locator("li")).toHaveCount(7);
  await expect(maisRegistradas.locator("li").first()).toContainText(/Perereca-pequena \(Dendropsophus minutus\)\s*Anfíbios\s*20 registros/);
  await expect(maisRegistradas).toContainText("Scinax fuscomarginatus");
  await expect(maisRegistradas).toContainText(/Urubu \(Coragyps atratus\)/);
  await expect(secao).not.toContainText("Falha simulada");

  await expect(secao).toContainText(/Vulnerável\s*Mutum-de-penacho \(Crax fasciolata\)\s*Aves\s*2 registros/);
  await expect(secao).toContainText(/Quase ameaçada\s*Papagaio-verdadeiro \(Amazona aestiva\)\s*Aves\s*4 registros/);
  await expect(secao).toContainText("Não equivalem à lista oficial brasileira");

  await expect(secao).toContainText("175 observações verificáveis de 87 espécies, feitas por 21 pessoas.");
  await expect(secao).toContainText(/Cobra-cipó \(Philodryas nattereri\)\s*Répteis\s*4 observações/);

  await expect(secao.getByRole("link", { name: "Ver todos os registros no GBIF" })).toHaveAttribute("href", LINK_GBIF);
  await expect(secao.getByRole("link", { name: "Ver as espécies no iNaturalist" })).toHaveAttribute("href", LINK_INATURALIST);
  await expect(secao.getByRole("link", { name: "GBIF.org", exact: true })).toHaveAttribute("href", "https://www.gbif.org");
  await expect(secao.getByRole("link", { name: "iNaturalist", exact: true })).toHaveAttribute("href", "https://www.inaturalist.org");
  await expect(secao.getByRole("link", { name: /Perereca-pequena/ })).toHaveAttribute("href", "https://www.gbif.org/species/2428549");
  await expect(secao.getByRole("link", { name: /Cobra-cipó/ })).toHaveAttribute("href", "https://www.inaturalist.org/taxa/29104");
  for (const link of await secao.getByRole("link").all()) {
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
  }

  await expect(secao).toContainText(/consulta em \d{2}\/\d{2}\/\d{4} aos registros com coordenadas dentro do município/);
  await expect(secao).toContainText("somente os publicados com licença CC0 ou CC BY 4.0");
  await expect(secao).toContainText(/12 conjuntos de dados; os que mais contribuem são:/);
  await expect(secao.getByRole("link", { name: "EOD: eBird Observation Dataset" })).toHaveAttribute(
    "href",
    "https://www.gbif.org/dataset/00000000-0000-4000-8000-000000000001",
  );
  await expect(secao).toContainText("os números das duas fontes não se somam");

  // Sem fotos, sem travessão.
  await expect(secao.locator("img")).toHaveCount(0);
  expect(await secao.innerText()).not.toMatch(/[\u2013\u2014]/);

  const caixa = await secao.boundingBox();
  expect(caixa).not.toBeNull();
  expect(caixa!.x).toBeGreaterThanOrEqual(0);
  expect(caixa!.x + caixa!.width).toBeLessThanOrEqual((page.viewportSize()?.width ?? 0) + 1);
  expect(await secao.evaluate((elemento) => elemento.scrollWidth <= elemento.clientWidth + 1)).toBe(true);
  await secao.screenshot({ path: `artifacts/biodiversidade/secao-${testInfo.project.name}.png` });
  expect(erros).toEqual([]);
});

test("tooltip do gráfico mostra as espécies do grupo", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Sem ponteiro no celular; a tabela cobre o mesmo conteúdo.");
  const secao = await abrirSecao(page);
  const barra = secao.getByTestId("grafico-biodiversidade-grupos").locator(".recharts-bar-rectangle").first();
  await barra.evaluate((elemento) => elemento.scrollIntoView({ block: "center", behavior: "instant" }));
  const tooltip = secao.locator(".recharts-tooltip-wrapper");
  // O gráfico só responde ao ponteiro depois de medir o próprio tamanho: repete até lá.
  await expect(async () => {
    const caixa = await barra.boundingBox();
    expect(caixa).not.toBeNull();
    await page.mouse.move(caixa!.x + 4, caixa!.y + caixa!.height / 2);
    await page.mouse.move(caixa!.x + caixa!.width / 2, caixa!.y + caixa!.height / 2, { steps: 4 });
    await expect(tooltip).toContainText(/Aves[\s\S]*Espécies[\s\S]*150/, { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
});
