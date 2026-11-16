import { expect, test } from "@playwright/test";

const EMPRESAS = [
  { slug: "vitorinoperfumes", nome: "Vitorino Perfumes", whatsapp: "https://wa.me/5564992472510?text=" },
  { slug: "apareca", nome: "Apareça Ai", whatsapp: "https://wa.me/5564992638815?text=" },
];

// A barra inferior do celular (MobileBottomNav); o menu "Mais" do cabeçalho
// do computador usa o mesmo rótulo e continua nas páginas de empresa.
const BARRA_INFERIOR = 'nav.fixed[aria-label="Navegação principal"]';
const CHAT = '[aria-label="Abrir assistente do Piracanjuba.ai"]';

for (const empresa of EMPRESAS) {
  test(`página da ${empresa.nome} mostra a vitrine com WhatsApp, selo e moldura enxuta`, async ({ page, isMobile }) => {
    const resposta = await page.goto(`/${empresa.slug}`);
    expect(resposta?.status()).toBe(200);
    await expect(page).toHaveTitle(/\| Piracanjuba\.ai$/);
    await expect(page.getByRole("heading", { level: 1, name: empresa.nome })).toBeVisible();
    await expect(page.getByText("Página patrocinada", { exact: true })).toBeVisible();

    const links = page.getByRole("link", { name: /WhatsApp/ });
    const hrefs = await links.evaluateAll((itens) => itens.map((item) => item.getAttribute("href")));
    expect(hrefs.length).toBeGreaterThanOrEqual(3);
    for (const href of hrefs) expect(href).toContain(empresa.whatsapp);

    // Moldura enxuta: sem barra inferior nem chat do portal.
    await expect(page.locator(BARRA_INFERIOR)).toHaveCount(0);
    await expect(page.locator(CHAT)).toHaveCount(0);
    // O cabeçalho do portal continua, com o link para a home.
    await expect(page.getByRole("link", { name: "Início" }).first()).toBeVisible();

    if (isMobile) {
      await expect(page.getByRole("link", { name: /Chamar no WhatsApp/ }).last()).toBeInViewport();
    }
  });
}

test("nome que não é de empresa responde 404 e as seções mantêm a navegação do portal", async ({ page, isMobile }) => {
  const inexistente = await page.goto("/empresa-que-nao-existe");
  expect(inexistente?.status()).toBe(404);

  const sobre = await page.goto("/sobre");
  expect(sobre?.status()).toBe(200);
  await expect(page.locator(BARRA_INFERIOR)).toHaveCount(1);
  if (isMobile) await expect(page.locator(BARRA_INFERIOR)).toBeVisible();
});
