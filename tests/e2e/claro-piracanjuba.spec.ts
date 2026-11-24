import { expect, test } from "@playwright/test";

test("os endereços anteriores da Claro levam à página da loja e aos contatos locais", async ({ page, request }) => {
  const destino = "/claro";
  for (const origem of ["/zap-pba/claro", "/claro-piracanjuba"]) {
    const anterior = await request.get(origem + "?utm_source=teste", { maxRedirects: 0 });
    expect(anterior.status()).toBe(308);
    const redirecionamento = new URL(anterior.headers().location, anterior.url());
    expect(redirecionamento.pathname + redirecionamento.search).toBe(destino + "?utm_source=teste");
  }

  await page.goto(destino);
  const artigo = page.getByRole("article");
  await expect(artigo.getByRole("heading", { name: "Claro Piracanjuba", level: 1 })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://piracanjuba.ai" + destino);
  await expect(artigo.getByRole("link", { name: "Falar com a loja" })).toHaveAttribute("href", /^https:\/\/wa\.me\/5564992834030\?text=/);
  await expect(artigo.getByRole("link", { name: "(64) 99283-4030" })).toHaveAttribute("href", "tel:+5564992834030");
  await expect(artigo.getByRole("link", { name: "Ver no Google Maps" })).toHaveAttribute("href", "https://www.google.com/maps?cid=15981786211909156690");
  await expect(artigo.getByText("Rua Dom Pedro II, 620", { exact: false })).toBeVisible();
});
