import { expect, test } from "@playwright/test";

// Achado LINK-02 da auditoria de SEO de 2026-11-17: os links de navegação
// precisam vir no HTML que o servidor entrega, sem depender de clique nem de JS.
test("HTML inicial da home traz os links do menu Mais, do rodapé e da Câmara", async ({ request }) => {
  const resposta = await request.get("/");
  expect(resposta.status()).toBe(200);
  const html = await resposta.text();
  for (const href of [
    "/vereadores",
    "/atuacao-parlamentar",
    "/camara/projetos",
    "/noticias",
    "/historia-pba",
    "/investigacoes",
    "/acompanhar",
    "/privacidade",
  ]) {
    expect(html, `falta href="${href}" no HTML da home`).toContain(`href="${href}"`);
  }
});

test("menu Mais começa fechado com os links no DOM, abre e fecha com Esc devolvendo o foco", async ({ page }) => {
  await page.goto("/");
  const botao = page.locator('button[aria-label="Mais seções"]:visible');
  await expect(botao).toHaveAttribute("aria-expanded", "false");
  const painelId = await botao.getAttribute("aria-controls");
  expect(painelId).toBeTruthy();
  const painel = page.locator(`[id="${painelId}"]`);

  // Fechado: escondido por CSS, mas com os links presentes no DOM.
  await expect(painel).toBeHidden();
  await expect(painel.locator('a[href="/vereadores"]')).toHaveCount(1);

  await botao.click();
  await expect(botao).toHaveAttribute("aria-expanded", "true");
  await expect(painel).toBeVisible();
  await expect(painel.getByRole("link", { name: "Vereadores" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(botao).toHaveAttribute("aria-expanded", "false");
  await expect(painel).toBeHidden();
  await expect(botao).toBeFocused();
});
