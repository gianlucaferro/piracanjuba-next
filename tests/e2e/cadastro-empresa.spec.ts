import { expect, test, type Page } from "@playwright/test";

const FUNCAO = "http://127.0.0.1:4319/functions/v1/pedido-pagina-empresa";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };

async function preencher(page: Page) {
  await page.getByLabel("Seu nome").fill("Maria Souza");
  await page.getByLabel("E-mail").fill("maria@exemplo.com.br");
  await page.getByLabel("Seu WhatsApp").fill("(64) 99123-4567");
  await page.getByLabel("Nome da empresa").fill("Padaria Pão Quente");
  await page.getByLabel("Ramo").fill("Padaria");
  await page.getByLabel("O que sua empresa oferece").fill("Pães, bolos e salgados feitos todo dia cedo.");
  await page.getByLabel("WhatsApp da empresa").fill("(64) 3405-1234");
  await page.getByLabel("Endereço desejado da página").fill("Padaria Pão Quente");
  await page.getByLabel(/Autorizo o Piracanjuba\.ai/).check();
}

test("cadastro registra o pedido e mostra o PIX da Ferro Labs com o código", async ({ page }) => {
  const corpos: Record<string, unknown>[] = [];
  await page.route(`${FUNCAO}*`, async (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    corpos.push(route.request().postDataJSON());
    return route.fulfill({ headers: CORS, json: { codigo: "PBA23456Z", forma_pagamento: "pix" } });
  });

  await page.goto("/anuncie");
  await page.getByRole("link", { name: "Cadastre-se agora" }).first().click();
  await expect(page).toHaveURL(/\/anuncie\/cadastro$/);
  // O robô recebe o HTML servido direto: uma única tag robots, com noindex.
  const html = await (await page.request.get("/anuncie/cadastro")).text();
  expect(html.match(/<meta name="robots"[^>]*>/g)).toEqual([expect.stringContaining("noindex")]);
  // Na navegação pelo site a página também declara noindex. No next dev do CI a tag da
  // página anterior (/anuncie, indexável) pode continuar no DOM; no build de produção ela é
  // trocada (conferido na prévia da Vercel em 2026-11-17), por isso a checagem é pela tag noindex.
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1, name: "Cadastro da página de empresa" })).toBeVisible();
  await expect(page.getByText("Escrevemos a página, você revisa e ela vai ao ar em até 7 dias após o envio do material.")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Dados" }).first()).toHaveAttribute("aria-current", "step");
  await expect(page.getByRole("radio", { name: /Cartão de crédito/ })).toBeEnabled();
  await expect(page.getByRole("radio", { name: /PIX/ })).toBeChecked();

  await preencher(page);
  await page.getByRole("button", { name: /Finalizar pedido/ }).click();

  await expect(page.getByRole("heading", { name: "Pague R$ 600 pelo PIX" })).toBeVisible();
  expect(corpos).toHaveLength(1);
  expect(corpos[0]).toMatchObject({
    forma_pagamento: "pix",
    consentimento: true,
    confirmacao_site: "",
    endereco_desejado: "padaria-pao-quente",
    comprador_email: "maria@exemplo.com.br",
  });
  await expect(page.getByText("PBA23456Z").first()).toBeVisible();
  const copiaECola = page.getByLabel("PIX copia e cola");
  await expect(copiaECola).toHaveValue(/^000201.*0114660345380001255204000053039865406600\.00.*62130509PBA23456Z6304[0-9A-F]{4}$/);
  await expect(page.getByRole("img", { name: /QR Code do PIX de R\$ 600,00/ })).toBeVisible();
  const comprovante = page.getByRole("link", { name: /Enviar comprovante no WhatsApp/ });
  await expect(comprovante).toHaveAttribute("href", /^https:\/\/wa\.me\/5564992375458\?text=.*PBA23456Z/);
  // Nenhum dado pessoal vai na mensagem do WhatsApp.
  expect(decodeURIComponent((await comprovante.getAttribute("href")) ?? "")).not.toMatch(/Maria|exemplo\.com|99123/);

  // Recarregar a aba mantém o pedido e o PIX.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Pague R$ 600 pelo PIX" })).toBeVisible();

  await page.getByRole("button", { name: "Fazer outro pedido" }).click();
  await expect(page.getByRole("button", { name: /Finalizar pedido/ })).toBeVisible();
});

test("cartão registra o pedido e segue para o Stripe só com o código", async ({ page }) => {
  await page.route(`${FUNCAO}*`, async (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    expect(route.request().postDataJSON()).toMatchObject({ forma_pagamento: "cartao" });
    return route.fulfill({ headers: CORS, json: { codigo: "PBA23456Z", forma_pagamento: "cartao" } });
  });
  // O Stripe real nunca é chamado no teste.
  const destinos: string[] = [];
  await page.route("https://buy.stripe.com/**", async (route) => {
    destinos.push(route.request().url());
    return route.fulfill({ contentType: "text/html", body: "<title>Stripe simulado</title><h1>Stripe simulado</h1>" });
  });
  await page.goto("/anuncie/cadastro");
  await preencher(page);
  await page.getByRole("radio", { name: /Cartão de crédito/ }).check();
  await page.getByRole("button", { name: /Finalizar pedido/ }).click();
  await expect(page.getByRole("heading", { name: "Stripe simulado" })).toBeVisible();
  expect(destinos).toHaveLength(1);
  const destino = new URL(destinos[0]);
  expect(destino.origin + destino.pathname).toBe("https://buy.stripe.com/6oUaEX8tC7XnbqAaJZ2Ji00");
  expect([...destino.searchParams.keys()]).toEqual(["client_reference_id"]);
  expect(destino.searchParams.get("client_reference_id")).toBe("PBA23456Z");
});

test("cadastro mostra o erro devolvido pela função", async ({ page }) => {
  await page.route(`${FUNCAO}*`, async (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    return route.fulfill({
      status: 429,
      headers: CORS,
      json: { erro: "Muitos pedidos em pouco tempo. Tente de novo mais tarde ou fale no WhatsApp." },
    });
  });
  await page.goto("/anuncie/cadastro");
  await preencher(page);
  await page.getByRole("button", { name: /Finalizar pedido/ }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText("Muitos pedidos em pouco tempo. Tente de novo mais tarde ou fale no WhatsApp.");
  await expect(page.getByRole("button", { name: /Finalizar pedido/ })).toBeEnabled();
});

test("volta do Stripe confirma o pedido sem afirmar pagamento", async ({ page }) => {
  await page.goto("/anuncie/cadastro/obrigado");
  await expect(page.getByRole("heading", { level: 1, name: "Obrigado pelo pedido" })).toBeVisible();
  // Na navegação pelo site, a tag robots da página anterior pode durar um instante antes de
  // ser trocada; o que vale é o estado final, com uma única tag e noindex.
  await expect(page.locator('meta[name="robots"]')).toHaveCount(1);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByRole("listitem").filter({ hasText: "Confirmação" })).toHaveAttribute("aria-current", "step");
});
