import { expect, test } from "@playwright/test";

test("a prévia da Claro leva à página da loja e seus contatos locais", async ({ page, request }) => {
  const destino = "/claro-piracanjuba";
  const anterior = await request.get("/zap-pba/claro", { maxRedirects: 0 });
  expect(anterior.status()).toBe(308);
  expect(new URL(anterior.headers().location, anterior.url()).pathname).toBe(destino);

  await page.goto(destino);
  const artigo = page.getByRole("article");
  await expect(artigo.getByRole("heading", { name: "Claro Piracanjuba", level: 1 })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://piracanjuba.ai" + destino);
  await expect(artigo.getByRole("link", { name: "Falar com a loja" })).toHaveAttribute("href", /^https:\/\/wa\.me\/5564992834030\?text=/);
  await expect(artigo.getByRole("link", { name: "(64) 99283-4030" })).toHaveAttribute("href", "tel:+5564992834030");
  await expect(artigo.getByRole("link", { name: "Ver no Google Maps" })).toHaveAttribute("href", "https://www.google.com/maps?cid=15981786211909156690");
  await expect(artigo.getByText("Rua Dom Pedro II, 620", { exact: false })).toBeVisible();
});
