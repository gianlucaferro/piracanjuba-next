import { expect, test } from "@playwright/test";

test("anuncie vende a página de empresa com preço, exemplos e WhatsApp", async ({ page }) => {
  const resposta = await page.goto("/anuncie");
  expect(resposta?.status()).toBe(200);
  await expect(page).toHaveTitle(/R\$ 600/);
  await expect(
    page.getByRole("heading", { level: 1, name: /Sua empresa com página própria no Piracanjuba/ }),
  ).toBeVisible();
  await expect(page.getByText("R$ 600 em pagamento único, sem mensalidade.", { exact: true })).toBeVisible();

  // Os exemplos levam às páginas de empresa publicadas.
  const exemplos = page.getByRole("region", { name: "Veja como fica" });
  await expect(exemplos.getByRole("link", { name: /Vitorino Perfumes/ })).toHaveAttribute("href", "/vitorinoperfumes");
  await expect(exemplos.getByRole("link", { name: /Apareça Ai/ })).toHaveAttribute("href", "/apareca");

  const whatsapp = page.getByRole("link", { name: /WhatsApp|Quero a página/ });
  const hrefs = await whatsapp.evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(hrefs.length).toBeGreaterThanOrEqual(3);
  for (const href of hrefs) expect(href).toContain("https://wa.me/5564992375458?text=");

  // Os antigos planos de banner e os números de audiência não conferidos saíram,
  // inclusive das respostas fechadas do FAQ (textContent) e da descrição da página.
  const antigos = /visitas por dia|R\$ 200|R\$ 400|Destaque|centenas de moradores/;
  expect(await page.locator("main").textContent()).not.toMatch(antigos);
  await expect(page.locator('meta[name="description"]')).not.toHaveAttribute("content", antigos);
  await expect(page.locator('meta[property="og:description"]')).not.toHaveAttribute("content", antigos);
});

test("perguntas frequentes abrem e mostram a resposta", async ({ page }) => {
  await page.goto("/anuncie");
  await page.getByText("Por quanto tempo a página fica no ar?").click();
  await expect(page.getByText("Sem prazo: a página fica no ar enquanto o Piracanjuba.ai existir.")).toBeVisible();
});
