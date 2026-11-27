import { expect, test } from "@playwright/test";

const destino = "/advogado";

test("a página do LHS Advocacia mostra o advogado, as cidades, as perguntas e cabe na tela", async ({ page }) => {
  await page.goto(destino);
  const artigo = page.getByRole("article").first();
  await expect(artigo.getByRole("heading", { name: "Advogado tributarista em Piracanjuba, Goiânia e região", level: 1 })).toBeVisible();
  await expect(page).toHaveTitle("Advogado Tributarista em Piracanjuba e Goiânia | LHS");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://piracanjuba.ai" + destino);
  await expect(artigo.getByRole("img", { name: /Retrato do advogado Luiz Henrique Souza/ })).toBeVisible();
  await expect(artigo.getByRole("link", { name: "Falar com o Dr. Luiz" }).first()).toHaveAttribute("href", /^https:\/\/wa\.me\/5562993117614\?text=/);
  for (const cidade of ["Piracanjuba", "Professor Jamil", "Morrinhos", "Caldas Novas", "Goiânia", "Anápolis"]) {
    await expect(artigo.getByRole("heading", { name: `Advogado tributarista em ${cidade}`, level: 3 })).toBeVisible();
  }
  await expect(artigo.getByRole("link", { name: "Direito Tributário em Piracanjuba no site do escritório" })).toHaveAttribute("href", "https://lhs.adv.br/advogado-em-piracanjuba/");
  await expect(artigo.getByText("O que faz um advogado tributarista?", { exact: true })).toBeVisible();

  const tipos = await page.locator('script[type="application/ld+json"]').evaluateAll((nos) =>
    nos.flatMap((no) => (JSON.parse(no.textContent ?? "{}")["@graph"] ?? []).map((item: { "@type": string }) => item["@type"])));
  for (const tipo of ["LegalService", "Person", "FAQPage", "BreadcrumbList"]) expect(tipos).toContain(tipo);

  const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(sobra).toBeLessThanOrEqual(0);
});
