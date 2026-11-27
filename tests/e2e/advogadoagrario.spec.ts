import { expect, test } from "@playwright/test";

test("página agrária informa a atuação, contato e cidades sem criar sedes", async ({ page }, testInfo) => {
  await page.goto("/advogadoagrario");
  const artigo = page.getByRole("article").first();
  await expect(artigo.getByRole("heading", { level: 1 })).toHaveText("Advogado agrário em Piracanjuba e região");
  await expect(artigo.getByRole("navigation", { name: "Navegação estrutural" })).toContainText("Guia Zap PBA");
  await expect.poll(() => artigo.getByRole("img", { name: "Paulo de Tarso Giolo Filho" }).evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await artigo.getByRole("img", { name: "Paulo de Tarso Giolo Filho" }).scrollIntoViewIfNeeded();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://piracanjuba.ai/advogadoagrario");
  await expect(artigo.getByRole("link", { name: "Falar com o escritório" }).first()).toHaveAttribute("href", /^https:\/\/wa\.me\/5562992728816\?text=/);
  for (const cidade of ["Piracanjuba", "Professor Jamil", "Goiânia", "Morrinhos", "Caldas Novas"]) {
    await expect(artigo.locator("li").filter({ hasText: cidade })).toBeVisible();
  }
  await expect(artigo.getByRole("link", { name: "(62) 99272-8816", exact: true })).toHaveAttribute("href", "tel:+5562992728816");
  await expect(artigo.getByText(/Rua Dom Pedro II, 942, Centro/).first()).toBeVisible();
  const dados = await page.locator('script[type="application/ld+json"]').evaluateAll((nos) => nos.flatMap((no) => JSON.parse(no.textContent ?? "{}")["@graph"] ?? []));
  const escritorio = dados.find((item) => item["@type"] === "LegalService");
  expect(escritorio.address.addressLocality).toBe("Piracanjuba");
  expect(escritorio.areaServed.map((item: { name: string }) => item.name)).toEqual(["Piracanjuba", "Professor Jamil", "Goiânia", "Morrinhos", "Caldas Novas"]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  const imagem = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(imagem).toContain("/advogadoagrario/opengraph-image");
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute("content", /\/advogadoagrario\/opengraph-image/);
  const respostaImagem = await page.request.get(new URL(imagem!).pathname);
  expect(respostaImagem.ok()).toBeTruthy();
  expect(respostaImagem.headers()["content-type"]).toContain("image/png");
  await page.screenshot({ path: `artifacts/advogadoagrario-${testInfo.project.name}.png`, fullPage: true });
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  }
});
