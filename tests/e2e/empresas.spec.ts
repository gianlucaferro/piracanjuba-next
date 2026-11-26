import { expect, test } from "@playwright/test";

const EMPRESAS = [
  {
    slug: "vitorinoperfumes",
    nome: "Vitorino Perfumes",
    titulo: "Loja de perfumes importados e decants em Piracanjuba",
    rotulo: "Falar com a Isabella",
    whatsapp: "https://wa.me/5564992472510?text=",
  },
  {
    slug: "apareca",
    nome: "Apareça Ai",
    titulo: "Criação de sites e presença no Google em Piracanjuba",
    rotulo: "Pedir diagnóstico gratuito",
    whatsapp: "https://wa.me/5564992638815?text=",
  },
];
const LINK_WHATSAPP = 'a[href^="https://wa.me/"]';
const BARRA_EMPRESA = "[data-barra-empresa]";

// A barra inferior do celular (MobileBottomNav); o menu "Mais" do cabeçalho
// do computador usa o mesmo rótulo e continua nas páginas de empresa.
const BARRA_INFERIOR = 'nav.fixed[aria-label="Navegação principal"]';
const CHAT = '[aria-label="Abrir assistente do Piracanjuba.ai"]';

for (const empresa of EMPRESAS) {
  test(`página da ${empresa.nome} mostra a vitrine com WhatsApp, selo e moldura enxuta`, async ({ page, isMobile }) => {
    const resposta = await page.goto(`/${empresa.slug}`);
    expect(resposta?.status()).toBe(200);
    await expect(page).toHaveTitle(/\| Piracanjuba\.ai$/);
    // O h1 traz a proposta com a palavra-chave; o nome fica no logotipo, no rótulo e no title.
    await expect(page.getByRole("heading", { level: 1, name: empresa.titulo })).toBeVisible();
    await expect(page.getByText(empresa.nome, { exact: false }).first()).toBeVisible();
    await expect(page.getByText("Página patrocinada", { exact: true })).toBeVisible();

    const links = page.locator(LINK_WHATSAPP);
    const hrefs = await links.evaluateAll((itens) => itens.map((item) => item.getAttribute("href")));
    expect(hrefs.length).toBeGreaterThanOrEqual(3);
    for (const href of hrefs) expect(href).toContain(empresa.whatsapp);

    // Moldura enxuta: sem barra inferior nem chat do portal.
    await expect(page.locator(BARRA_INFERIOR)).toHaveCount(0);
    await expect(page.locator(CHAT)).toHaveCount(0);
    // O cabeçalho do portal continua, com o link para a home.
    await expect(page.getByRole("link", { name: "Início" }).first()).toBeVisible();

    // Botão principal do topo com o rótulo da marca.
    await expect(page.getByRole("link", { name: empresa.rotulo }).first()).toBeInViewport();

    if (isMobile) {
      // A barra fixa fica fora da tela enquanto o botão do topo aparece e entra depois de rolar.
      await expect(page.locator(BARRA_EMPRESA)).not.toBeInViewport();
      await page.mouse.wheel(0, 2400);
      await expect(page.locator(`${BARRA_EMPRESA} ${LINK_WHATSAPP}`)).toBeInViewport();
    }
  });
}

test("nome que não é de empresa responde 404 e as seções mantêm a navegação do portal", async ({ page, isMobile }) => {
  const inexistente = await page.goto("/empresa-que-nao-existe");
  expect(inexistente?.status()).toBe(404);

  const sobre = await page.goto("/sobre");
  expect(sobre?.status()).toBe(200);
  await expect(page.locator(BARRA_INFERIOR)).toHaveCount(1);
  // Controle positivo: os mesmos seletores encontram o chat e a barra fora das páginas de empresa.
  await expect(page.locator(CHAT)).toHaveCount(1);
  if (isMobile) await expect(page.locator(BARRA_INFERIOR)).toBeVisible();
});

test("endereço digitado com maiúscula ou acento leva à página da empresa", async ({ page }) => {
  await page.goto("/VitorinoPerfumes");
  await expect(page).toHaveURL(/\/vitorinoperfumes$/);
  await page.goto("/apare%C3%A7a");
  await expect(page).toHaveURL(/\/apareca$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Criação de sites e presença no Google em Piracanjuba" }),
  ).toBeVisible();
});
