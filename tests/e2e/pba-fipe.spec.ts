import { expect, test, type Page } from "@playwright/test";

const MARCAS = { etapa: "marcas", opcoes: [{ codigo: "21", nome: "Fiat" }, { codigo: "59", nome: "VW - VolksWagen" }] };
const MOTOS = { etapa: "marcas", opcoes: [{ codigo: "80", nome: "HONDA" }] };
const MODELOS = {
  etapa: "modelos",
  opcoes: [
    { codigo: "5585", nome: "AMAROK CD2.0 16V/S CD2.0 16V TDI 4x2 Die" },
    { codigo: "6280", nome: "Gol (novo) 1.0 Mi Total Flex 8V 2p" },
    { codigo: "7001", nome: "Gol 1.6 Power Flex 4p" },
  ],
};
const ANOS = { etapa: "anos", opcoes: [{ codigo: "2014-5", nome: "2014 Flex" }, { codigo: "2013-5", nome: "2013 Flex" }] };
const PRECO = {
  etapa: "preco",
  preco: {
    valor: 29180,
    marca: "VW - VolksWagen",
    modelo: "Gol (novo) 1.0 Mi Total Flex 8V 2p",
    anoModelo: 2013,
    combustivel: "Flex",
    codigoFipe: "005345-7",
    mesReferencia: "novembro de 2026",
  },
};

type Resposta = { status?: number; body: unknown };

async function mockFipe(page: Page, override?: (caminho: string) => Resposta | undefined) {
  const pedidos: string[] = [];
  await page.route("**/api/fipe/**", async (route) => {
    const caminho = new URL(route.request().url()).pathname;
    pedidos.push(caminho);
    const fixo: Record<string, unknown> = {
      "/api/fipe/carros": MARCAS,
      "/api/fipe/motos": MOTOS,
      "/api/fipe/carros/59": MODELOS,
      "/api/fipe/carros/59/6280": ANOS,
      "/api/fipe/carros/59/6280/2013-5": PRECO,
    };
    const resposta = override?.(caminho) ?? (caminho in fixo ? { body: fixo[caminho] } : { status: 404, body: { error: "Veículo não encontrado na tabela FIPE." } });
    await route.fulfill({ status: resposta.status ?? 200, json: resposta.body });
  });
  return pedidos;
}

test("PBAFipe consulta marca, modelo filtrado e ano até mostrar o preço", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mockFipe(page);
  await page.goto("/pba-fipe");
  await expect(page.getByRole("heading", { level: 1, name: "PBAFipe" })).toBeVisible();

  const marca = page.getByLabel("Marca", { exact: true });
  await expect(marca).toBeEnabled();
  await marca.selectOption("59");

  const filtro = page.getByLabel("Buscar modelo", { exact: true });
  await expect(filtro).toBeEnabled();
  await filtro.fill("gol 1.0");
  const modelo = page.getByLabel("Modelo", { exact: true });
  await expect(modelo.locator("option")).toHaveCount(2);
  await expect(modelo.locator("option").first()).toHaveText("Escolha o modelo (1 de 3)");
  await modelo.selectOption("6280");

  const ano = page.getByLabel("Ano e combustível", { exact: true });
  await expect(ano).toBeEnabled();
  await expect(ano.locator("option").nth(1)).toHaveText("2014 Flex");
  await ano.selectOption("2013-5");

  const resultado = page.getByRole("region", { name: "Resultado da consulta FIPE" });
  await expect(resultado).toContainText(/R\$\s*29\.180,00/);
  await expect(resultado).toContainText("VW - VolksWagen Gol (novo) 1.0 Mi Total Flex 8V 2p");
  await expect(resultado).toContainText("005345-7");
  await expect(resultado).toContainText("novembro de 2026");

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: `artifacts/pba-fipe-${testInfo.project.name}.png`, fullPage: true });
  expect(errors).toEqual([]);
});

test("trocar o tipo de veículo limpa a consulta e carrega as marcas do tipo", async ({ page }) => {
  const pedidos = await mockFipe(page);
  await page.goto("/pba-fipe");
  await page.getByLabel("Marca", { exact: true }).selectOption("59");
  await expect(page.getByLabel("Modelo", { exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Motos" }).click();
  await expect(page.getByRole("button", { name: "Motos" })).toHaveAttribute("aria-pressed", "true");
  const marca = page.getByLabel("Marca", { exact: true });
  await expect(marca.locator("option", { hasText: "HONDA" })).toHaveCount(1);
  await expect(marca).toHaveValue("");
  await expect(page.getByLabel("Modelo", { exact: true })).toBeDisabled();
  expect(pedidos).toContain("/api/fipe/motos");
});

test("limite diário mostra a mensagem da rota e permite tentar de novo", async ({ page }) => {
  let falhar = true;
  await mockFipe(page, (caminho) => caminho === "/api/fipe/carros" && falhar
    ? { status: 503, body: { error: "A consulta à tabela FIPE atingiu o limite do dia. Tente de novo mais tarde." } }
    : undefined);
  await page.goto("/pba-fipe");
  await expect(page.getByText("A consulta à tabela FIPE atingiu o limite do dia. Tente de novo mais tarde.")).toBeVisible();
  await expect(page.getByLabel("Marca", { exact: true })).toBeDisabled();
  falhar = false;
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page.getByLabel("Marca", { exact: true })).toBeEnabled();
  await expect(page.getByText("atingiu o limite do dia")).toHaveCount(0);
});

test("home tem o card Consultar tabela FIPE e o menu Mais tem a aba PBAFipe", async ({ page }) => {
  await mockFipe(page);
  await page.route("**/api/cambio", (route) => route.fulfill({ status: 503, json: { error: "indisponível" } }));
  await page.goto("/");
  const servicos = page.getByRole("region", { name: "Mais serviços" });
  await expect(servicos.getByRole("link", { name: /Consultar tabela FIPE/ })).toHaveAttribute("href", "/pba-fipe");

  await page.locator('button[aria-label="Mais seções"]:visible').click();
  const aba = page.locator('a[href="/pba-fipe"]:visible', { hasText: "PBAFipe" });
  await expect(aba).toHaveCount(1);
  await aba.click();
  await expect(page).toHaveURL(/\/pba-fipe$/);
  await expect(page.getByRole("heading", { level: 1, name: "PBAFipe" })).toBeVisible();
});
