import { expect, test, type Page } from "@playwright/test";

// O servidor de e2e (scripts/validation/e2e-server.mjs) responde no lugar do Supabase e da API
// da Câmara dos Deputados. "Carlos Instavel" recebe 503 da Câmara para simular a fonte fora do ar.
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

async function abrirEmendas(page: Page) {
  // As fotos passam pelo otimizador do Next: o teste responde sem buscar o site da Câmara.
  await page.route("**/_next/image?**", (route) => route.fulfill({ status: 200, contentType: "image/png", body: PNG_1X1 }));
  await page.goto("/emendas");
  const secao = page.getByRole("region", { name: "Deputados federais autores de emendas", exact: true });
  await expect(secao).toBeVisible();
  return secao;
}

test("deputados federais aparecem com foto, partido, situação e total; a lista de emendas continua completa", async ({ page }, testInfo) => {
  const erros: string[] = [];
  page.on("pageerror", (erro) => erros.push(erro.message));
  const secao = await abrirEmendas(page);

  const cartoes = secao.getByTestId("deputado-federal");
  await expect(cartoes).toHaveCount(2);

  // Ordenado pelo total pago: Adriana (R$ 300 mil) antes de Waldir (R$ 150 mil).
  const adriana = cartoes.nth(0);
  await expect(adriana.getByRole("heading", { name: "Delegada Adriana Accorsi" })).toBeVisible();
  await expect(adriana.getByRole("img", { name: "Foto oficial de Delegada Adriana Accorsi" })).toHaveAttribute(
    "src",
    /url=https%3A%2F%2Fwww\.camara\.leg\.br%2Finternet%2Fdeputado%2Fbandep%2F220565\.jpg/,
  );
  await expect(adriana).toContainText("Partido atual: PT · GO");
  await expect(adriana).toContainText("Em exercício");
  await expect(adriana).toContainText("Na emenda: Adriana Accorsi (PT-GO)");
  await expect(adriana).toContainText(/Empenhado:\s*R\$\s*300\.000,00/);
  await expect(adriana).toContainText(/Pago:\s*R\$\s*300\.000,00\s*·\s*2 emendas/);
  await expect(adriana.getByRole("link", { name: /^Perfil de Delegada Adriana Accorsi na Câmara/ })).toHaveAttribute(
    "href",
    "https://www.camara.leg.br/deputados/220565",
  );

  const waldir = cartoes.nth(1);
  await expect(waldir.getByRole("heading", { name: "Delegado Waldir" })).toBeVisible();
  await expect(waldir).toContainText("Partido atual: UNIÃO · GO");
  await expect(waldir).toContainText("Situação: Fim de Mandato");
  await expect(waldir).toContainText(/Pago:\s*R\$\s*150\.000,00\s*·\s*1 emenda/);

  // Sem casamento seguro ou com a Câmara instável: sem foto nem dados inventados.
  const semPerfil = secao.getByText("Autores federais sem perfil associado").locator("..");
  await expect(semPerfil).toContainText("Fulano Inexistente (PL-GO)");
  await expect(semPerfil).toContainText("Carlos Instavel (PL-GO)");
  await expect(secao.getByRole("img")).toHaveCount(2);
  await expect(secao.getByRole("status")).toContainText("Parte das consultas à Câmara dos Deputados falhou agora");

  await expect(secao).toContainText("cobre somente deputados federais");
  await expect(secao.getByRole("link", { name: "Dados Abertos da Câmara dos Deputados" })).toHaveAttribute("href", "https://dadosabertos.camara.leg.br/");
  await expect(secao.getByRole("link", { name: "termos de uso do portal da Câmara" })).toHaveAttribute(
    "href",
    "https://www2.camara.leg.br/termo-de-uso-e-politica-de-privacidade",
  );
  await expect(secao).toContainText(/Dados consultados em \d{2}\/\d{2}\/\d{4}\./);

  // A lista de emendas segue inteira, inclusive estaduais e autores sem perfil.
  await expect(page.getByRole("heading", { name: "Emendas (6)" })).toBeVisible();
  await expect(page.getByText("Amauri Ribeiro", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Perfil na Câmara de Delegada Adriana Accorsi (abre em nova aba)" })).toHaveCount(2);
  await expect(page.getByRole("link", { name: /^Perfil na Câmara de Fulano/ })).toHaveCount(0);

  const caixa = await secao.boundingBox();
  expect(caixa).not.toBeNull();
  expect(caixa!.x).toBeGreaterThanOrEqual(0);
  expect(caixa!.x + caixa!.width).toBeLessThanOrEqual((page.viewportSize()?.width ?? 0) + 1);
  expect(await secao.evaluate((elemento) => elemento.scrollWidth <= elemento.clientWidth + 1)).toBe(true);
  await secao.screenshot({ path: `artifacts/emendas/deputados-federais-${testInfo.project.name}.png` });
  expect(erros).toEqual([]);
});

test("filtro só de estaduais esconde os cartões e diz que não há deputado federal no filtro", async ({ page }) => {
  const secao = await abrirEmendas(page);
  await page.getByRole("button", { name: "estadual", exact: true }).click();
  await expect(secao.getByTestId("deputado-federal")).toHaveCount(0);
  await expect(secao).toContainText("Nenhuma emenda de deputado federal nos filtros atuais.");
  await expect(page.getByRole("heading", { name: "Emendas (1)" })).toBeVisible();
});
