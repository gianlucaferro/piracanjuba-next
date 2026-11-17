import { expect, test } from "@playwright/test";

// HTML inicial (o que GPTBot, ClaudeBot e PerplexityBot leem): abas como links, H1 da aba,
// nenhuma contagem zerada antes dos dados e nenhum aviso de carregamento de outra aba.
test("HTML inicial das abas traz links e H1 da aba, sem zeros nem aviso alheio", async ({ request }) => {
  const camara = await (await request.get("/camara/contratos")).text();
  expect(camara).toContain('href="/camara/despesas"');
  expect(camara).toContain('href="/camara"');
  expect(camara).toMatch(/<h1[^>]*>Contratos da Câmara Municipal de Piracanjuba<\/h1>/);
  expect(camara).not.toMatch(/>0(<!-- -->)? contratos/);

  const atuacao = await (await request.get("/camara/atuacao")).text();
  expect(atuacao.match(/<h1[\s>]/g)).toHaveLength(1);
  expect(atuacao).not.toMatch(/>0(<!-- -->)? resultado/);

  const prefeitura = await (await request.get("/prefeitura/obras")).text();
  expect(prefeitura).toContain('href="/prefeitura/contratos"');
  expect(prefeitura).toContain('href="/prefeitura"');
  expect(prefeitura).not.toContain("/prefeitura/admin");
  expect(prefeitura).not.toContain("Estamos carregando os contratos");
  expect(prefeitura).toMatch(/<h1[^>]*>Obras públicas de Piracanjuba<\/h1>/);
});

test("clique na aba troca o conteúdo e a URL sem recarregar a página", async ({ page }) => {
  await page.goto("/prefeitura");
  await expect(page.getByRole("tab", { name: "Admin" })).toHaveCount(0);
  const contratos = page.getByRole("tab", { name: "Contratos", exact: true });
  await expect(contratos).toHaveAttribute("href", "/prefeitura/contratos");

  await page.evaluate(() => {
    (window as unknown as { semRecarregar?: boolean }).semRecarregar = true;
  });
  await contratos.click();
  await expect(page).toHaveURL(/\/prefeitura\/contratos$/);
  await expect(contratos).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Contratos da Prefeitura de Piracanjuba");
  expect(await page.evaluate(() => (window as unknown as { semRecarregar?: boolean }).semRecarregar)).toBe(true);
});
