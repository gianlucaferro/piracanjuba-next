import { expect, test } from "@playwright/test";

const destino = "/as-meninas-multimarcas";

test("a página da As Meninas mostra a loja, os contatos e cabe na tela", async ({ page }) => {
  await page.goto(destino);
  const artigo = page.getByRole("article").first();
  await expect(artigo.getByRole("heading", { name: "Calçados femininos em Piracanjuba.", level: 1 })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://piracanjuba.ai" + destino);
  await expect(artigo.getByRole("img", { name: "As Meninas, calçados e acessórios" })).toBeVisible();
  await expect(artigo.getByRole("link", { name: "Consultar pelo WhatsApp" })).toHaveAttribute("href", /^https:\/\/wa\.me\/5564992176440\?text=/);
  await expect(artigo.getByRole("link", { name: "Como chegar" })).toHaveAttribute("href", /google\.com\/maps\/dir/);
  await expect(artigo.getByText("Sabrina Carvalho", { exact: true })).toBeVisible();
  for (const acao of ["Consultar tênis", "Consultar bolsas", "Consultar carteiras"]) {
    await expect(artigo.getByRole("link", { name: `${acao} pelo WhatsApp` })).toHaveAttribute("href", /^https:\/\/wa\.me\/5564992176440\?text=/);
  }
  await expect(artigo.getByRole("heading", { name: "A loja abre aos sábados?", level: 3 })).toBeVisible();
  await expect(artigo.getByRole("link", { name: "Ver loja no mapa" })).toHaveAttribute("href", "https://www.google.com/maps?cid=6877083417799502373");
  await artigo.getByRole("link", { name: "Instagram", exact: true }).click();
  await expect(page).toHaveURL(destino + "#perfis-instagram");
  const perfis = artigo.getByRole("region", { name: /instagram/i });
  await expect(perfis).toBeInViewport();
  for (const perfil of ["asmeninasmultimarcas", "asmeninasmultimarcasloja"]) {
    const link = perfis.getByRole("link", { name: "@" + perfil, exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", `https://www.instagram.com/${perfil}/`);
  }
  const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(sobra).toBeLessThanOrEqual(0);
});
