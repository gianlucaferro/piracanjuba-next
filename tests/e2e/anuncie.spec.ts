import { expect, test } from "@playwright/test";

test("anuncie vende a página de empresa com preço, exemplos e WhatsApp", async ({ page }) => {
  const resposta = await page.goto("/anuncie");
  expect(resposta?.status()).toBe(200);
  await expect(page).toHaveTitle(/R\$ 600/);
  await expect(
    page.getByRole("heading", { level: 1, name: /Sua empresa com página própria no Piracanjuba/ }),
  ).toBeVisible();
  // Quadro de preço pedido pelo operador em 2026-11-17: de R$ 1.000 (riscado) por R$ 600.
  const quadro = page.locator(".stat-card").filter({ has: page.getByRole("heading", { name: "Página de empresa" }) });
  await expect(quadro.getByText("Desconto de R$ 400")).toBeVisible();
  await expect(quadro.getByText("R$ 1.000")).toHaveCSS("text-decoration-line", "line-through");
  await expect(quadro.getByText("R$ 600", { exact: true })).toBeVisible();
  await expect(page.getByText("Pagamento único", { exact: true })).toBeVisible();
  await expect(page.getByText("Sem mensalidade", { exact: true })).toBeVisible();

  const cadastro = page.getByRole("link", { name: "Cadastre-se agora" });
  await expect(cadastro).toHaveCount(2);
  for (const href of await cadastro.evaluateAll((links) => links.map((link) => link.getAttribute("href")))) {
    expect(href).toBe("/anuncie/cadastro");
  }
  const contato = page.getByRole("link", { name: /Entrar em contato/ });
  await expect(contato).toHaveCount(2);
  await expect(quadro.getByRole("link", { name: "Ver o que está incluso" })).toHaveAttribute("href", "#o-que-vem");

  // Seção de vantagens com a comparação placa x página (2026-11-17).
  const vantagens = page.getByRole("region", { name: "Vantagens de ter a página da sua empresa" });
  await expect(vantagens.getByRole("heading", { name: "Placa na rua" })).toBeVisible();
  await expect(vantagens.getByRole("heading", { name: "Página no Piracanjuba.ai" })).toBeVisible();
  await expect(vantagens.getByRole("listitem")).toHaveCount(6);

  // Os exemplos levam às páginas de empresa publicadas.
  const exemplos = page.getByRole("region", { name: "Veja como fica" });
  await expect(exemplos.getByRole("link", { name: /Vitorino Perfumes/ })).toHaveAttribute("href", "/vitorinoperfumes");
  await expect(exemplos.getByRole("link", { name: /Apareça Ai/ })).toHaveAttribute("href", "/apareca");

  for (const href of await contato.evaluateAll((links) => links.map((link) => link.getAttribute("href")))) {
    expect(href).toContain("https://wa.me/5564992375458?text=");
  }

  // Os antigos planos de banner e os números de audiência não conferidos saíram,
  // inclusive das respostas fechadas do FAQ (textContent) e da descrição da página.
  // "R$ 400" só pode aparecer como o desconto, nunca como o antigo plano de banner.
  const antigos = /visitas por dia|R\$ 200|R\$ 400|Destaque|centenas de moradores/;
  const textoPrincipal = (await page.locator("main").textContent()) ?? "";
  expect(textoPrincipal.replaceAll("Desconto de R$ 400", "")).not.toMatch(antigos);
  await expect(page.locator('meta[name="description"]')).not.toHaveAttribute("content", antigos);
  await expect(page.locator('meta[property="og:description"]')).not.toHaveAttribute("content", antigos);
});

test("perguntas frequentes abrem e mostram a resposta", async ({ page }) => {
  await page.goto("/anuncie");
  await page.getByText("Em quanto tempo a página fica pronta?").click();
  await expect(page.getByText(/A página vai ao ar em até 7 dias após o envio do material/)).toBeVisible();
  await page.getByText("Por quanto tempo a página fica no ar?").click();
  await expect(page.getByText("Sem prazo: a página fica no ar enquanto o Piracanjuba.ai existir.")).toBeVisible();
});

test("anuncie lista endereço, horário e mapa entre o que vem na página", async ({ page }) => {
  await page.goto("/anuncie");
  const lista = page.getByRole("region", { name: "O que vem na página" });
  await expect(lista.getByText("Endereço, horário de atendimento e link do mapa")).toBeVisible();
});
