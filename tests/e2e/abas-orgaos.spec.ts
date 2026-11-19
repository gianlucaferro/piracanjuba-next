import { expect, test } from "@playwright/test";
import { REDIRECIONAMENTOS_PERMANENTES } from "../../src/lib/sitemap-rotas";

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

// Onda 2 de SEO (2026-11-19): as páginas /transparencia/* com aba equivalente viraram 308.
test("antigas páginas /transparencia/* da Câmara respondem 308 para a aba equivalente", async ({ request }) => {
  for (const [origem, destino] of Object.entries(REDIRECIONAMENTOS_PERMANENTES)) {
    const resposta = await request.get(origem, { maxRedirects: 0 });
    expect(resposta.status(), origem).toBe(308);
    // O Next pode mandar o destino relativo ou absoluto; vale o caminho.
    expect(new URL(resposta.headers().location ?? "", "http://127.0.0.1").pathname, origem).toBe(destino);
  }
});

// Primeiro lote no servidor: com a fixture (32 pessoas na folha mensal de 2026-10, R$ 3.000 cada),
// o HTML inicial já traz o parágrafo-resposta, o resumo da folha e a primeira página da lista.
test("aba Servidores da Câmara traz folha e primeira página no HTML inicial", async ({ request }) => {
  const html = (await (await request.get("/camara/servidores")).text()).replace(/\u00a0|&nbsp;/g, " ");
  expect(html).toContain("Na folha mensal de outubro de 2026, a Câmara Municipal de Piracanjuba pagou R$ 96.000,00 brutos a 32 pessoas");
  expect(html).not.toContain("Carregando resumo da folha");
  expect(html).toContain("32 servidores encontrados");
  expect(html).toContain("CAM Servidor 0001");
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
