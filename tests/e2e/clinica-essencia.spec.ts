import { expect, test } from "@playwright/test";

test("a página de quiropraxia identifica a cidade do consultório e o contato de Juan", async ({ page }) => {
  await page.goto("/quiropraxia");
  const artigo = page.getByRole("article");
  await expect(artigo.getByRole("heading", { level: 1 })).toContainText(/quiropraxia/i);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://piracanjuba.ai/quiropraxia");
  await expect(artigo.locator('a[href="https://www.instagram.com/juancmesquita/"]').first()).toBeVisible();
  for (const cidade of ["Piracanjuba", "Professor Jamil", "Cristianópolis", "Morrinhos", "Caldas Novas"]) {
    await expect(artigo).toContainText(cidade);
  }
  await expect(artigo.locator('a[href="/estetica"]').first()).toBeVisible();
});

test("a página de estética liga cada agendamento ao contato indicado pela clínica", async ({ page }) => {
  await page.goto("/estetica");
  const artigo = page.getByRole("article");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://piracanjuba.ai/estetica");
  for (const telefone of ["5564992802081", "5564992888444", "5564992554074"]) {
    await expect(artigo.locator(`a[href^="https://wa.me/${telefone}"]`).first()).toBeVisible();
  }
  const rota = new URL((await artigo.getByRole("link", { name: /waze/i }).first().getAttribute("href"))!);
  expect(rota.origin).toBe("https://www.waze.com");
  expect(rota.searchParams.get("ll")).toBe("-17.3121852,-49.0332367");
  expect(rota.searchParams.get("navigate")).toBe("yes");
  await expect(artigo.locator('a[href*="instagram.com/essenciaclinicaestetica_"]').first()).toBeVisible();
  await expect(artigo.locator('a[href="/quiropraxia"]').first()).toBeVisible();
});
