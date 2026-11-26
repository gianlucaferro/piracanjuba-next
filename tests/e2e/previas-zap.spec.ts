import { expect, test } from "@playwright/test";
import { WHATSAPP_COMERCIAL } from "../../src/data/paginaEmpresa";
import { previas } from "../../src/data/previas-zap";

test("a prévia encaminha o visitante à empresa e o proprietário ao portal", async ({ page }) => {
  const ficha = previas.find((empresa) => empresa.acao && empresa.mensagem);
  if (!ficha?.acao || !ficha.mensagem) throw new Error("Falta uma prévia com uma consulta individual.");

  const caminho = "/zap-pba/" + ficha.slug;
  const resposta = await page.goto(caminho);
  expect(resposta?.status()).toBe(200);
  const artigo = page.getByRole("article");
  const consulta = artigo.getByRole("link", { name: ficha.acao, exact: true });
  await expect(consulta).toBeVisible();
  const contato = new URL((await consulta.getAttribute("href"))!);
  expect(contato.origin).toBe("https://wa.me");
  expect(contato.pathname).toBe("/" + ficha.telefones[0]);
  expect(contato.searchParams.get("text")).toBe(ficha.mensagem);

  const proprietario = artigo.getByRole("complementary", { name: "Esta empresa é sua?" });
  const personalizar = proprietario.getByRole("link", { name: "Quero personalizar a página" });
  const retirar = artigo.getByRole("link", { name: "Solicitar ajuste ou remoção" });
  await expect(personalizar).toBeVisible();
  await expect(retirar).toBeVisible();
  const oferta = new URL((await personalizar.getAttribute("href"))!);
  const suporte = new URL((await retirar.getAttribute("href"))!);
  for (const destino of [oferta, suporte]) {
    expect(destino.origin).toBe("https://wa.me");
    expect(destino.pathname).toBe("/" + WHATSAPP_COMERCIAL);
    expect(destino.searchParams.get("text")).toContain("https://piracanjuba.ai" + caminho);
  }
  expect(oferta.searchParams.get("text")).toContain(ficha.nome);
  expect(suporte.searchParams.get("text")).toContain("um ajuste ou a remoção");
  expect(oferta.href).not.toBe(suporte.href);
});

test("ficha rebaixada (empresa que recusou a landing) responde na URL curta sem laço e sem marca", async ({ page, request }, testInfo) => {
  // Master Tech, 2026-11-26: a URL curta serve a ficha por rewrite (200, canonical na ficha);
  // atalho e outras grafias fazem 308 para a ficha. Procedimento em docs/empresa-recusou-landing.md.
  const ficha = "/zap-pba/master-tech-auto-center";
  const curta = await request.get("/master-tech-auto-center", { maxRedirects: 0 });
  expect(curta.status()).toBe(200);
  for (const atalho of ["/mastertech", "/MasterTechAutoCenter"]) {
    const resposta = await request.get(atalho, { maxRedirects: 0 });
    expect(resposta.status(), atalho).toBe(308);
    expect(new URL(resposta.headers()["location"], "http://x").pathname, atalho).toBe(ficha);
  }
  const fichaDireta = await request.get(ficha, { maxRedirects: 0 });
  expect(fichaDireta.status()).toBe(200);

  await page.goto("/master-tech-auto-center");
  await expect(page.getByRole("heading", { level: 1, name: "Master Tech Auto Center" })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://piracanjuba.ai" + ficha);
  await expect(page.locator('img[src*="/empresas/master-tech-auto-center/"], img[src*="/marcas-zap/logos/"]')).toHaveCount(0);
  // WhatsApp só como número: o atalho de um toque é exclusivo das páginas contratadas.
  await expect(page.locator('a[href*="wa.me/5564993450101"], a[href^="tel:"]')).toHaveCount(0);
  await expect(page.getByText("WhatsApp (64) 99345-0101", { exact: true })).toBeVisible();
  await expect(page.locator("#contatos ~ dl")).toContainText("(64) 99345-0101");
  await expect(page.locator('meta[name="format-detection"]')).toHaveAttribute("content", /telephone=no/);
  await expect(page.getByRole("link", { name: /Quero personalizar a página/ })).toHaveAttribute("href", /wa\.me\//);
  await page.screenshot({ path: `artifacts/master-tech-ficha-${testInfo.project.name}.png`, fullPage: true });
});

test("ficha comum do guia continua com o WhatsApp clicável", async ({ page }) => {
  await page.goto("/zap-pba/maxwel-cabeleireiro");
  await expect(page.locator('a[href*="wa.me/"]').first()).toBeVisible();
  await expect(page.locator('meta[name="format-detection"]')).toHaveCount(0);
});

test("ficha tem no topo a faixa do proprietário com o WhatsApp do Gianluca", async ({ page }) => {
  for (const [slug, nome] of [["maxwel-cabeleireiro", "Maxwel Cabeleireiro"], ["master-tech-auto-center", "Master Tech Auto Center"]]) {
    await page.goto(`/zap-pba/${slug}`);
    const faixa = page.getByRole("complementary", { name: "Para o proprietário" });
    await expect(faixa).toContainText("É proprietário desta empresa e quer deixar esta página mais profissional e completa, com cara de site?");
    await expect(faixa).toHaveAttribute("data-nosnippet", "");
    const link = faixa.getByRole("link", { name: /Clique aqui/ });
    const href = await link.getAttribute("href");
    expect(href).toContain("https://wa.me/5564992375458?text=");
    expect(decodeURIComponent(href!.split("text=")[1])).toBe(`Olá, Gianluca. Vim pelo Piracanjuba.ai, minha empresa é ${nome}.`);
    // A faixa fica antes do nome da empresa.
    const ordem = await page.evaluate(() => {
      const faixaEl = document.querySelector('[aria-label="Para o proprietário"]');
      const h1 = document.querySelector("h1");
      return Boolean(faixaEl && h1 && faixaEl.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(ordem, slug).toBe(true);
  }
});
