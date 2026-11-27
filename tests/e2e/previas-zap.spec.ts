import { expect, test } from "@playwright/test";
import { WHATSAPP_COMERCIAL } from "../../src/data/paginaEmpresa";
import { FICHAS_REBAIXADAS } from "../../src/data/empresas-slugs";
import { previaPorSlug, previas } from "../../src/data/previas-zap";
import { formatarTelefoneBr } from "../../src/lib/whatsapp";

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

test("fichas rebaixadas respondem na URL curta sem laço, sem marca e com o WhatsApp sem link", async ({ page, request }, testInfo) => {
  // Procedimento em docs/empresa-recusou-landing.md: a URL curta serve a ficha por rewrite (200,
  // canonical na ficha); atalhos e outras grafias fazem 308 para a ficha.
  const atalhos: [string, string][] = [
    ["/mastertech", "master-tech-auto-center"],
    ["/MasterTechAutoCenter", "master-tech-auto-center"],
    ["/claro-piracanjuba", "claro"],
    ["/ClaroPiracanjuba", "claro"],
    ["/b10", "b10-auto-center"],
    ["/kamilla-morranna", "kamilla-morranna"],
    ["/AgroFranca", "agro-franca"],
  ];
  for (const [atalho, slug] of atalhos) {
    const resposta = await request.get(atalho, { maxRedirects: 0 });
    expect(resposta.status(), atalho).toBe(308);
    expect(new URL(resposta.headers()["location"], "http://x").pathname, atalho).toBe("/zap-pba/" + slug);
  }

  for (const { slug, curta } of FICHAS_REBAIXADAS) {
    const ficha = "/zap-pba/" + slug;
    const dados = previaPorSlug.get(slug);
    if (!dados) throw new Error(slug + " saiu do catálogo do guia");
    for (const caminho of ["/" + curta, ficha]) {
      const resposta = await request.get(caminho, { maxRedirects: 0 });
      expect(resposta.status(), caminho).toBe(200);
    }

    await page.goto("/" + curta);
    await expect(page.getByRole("heading", { level: 1, name: dados.nome })).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://piracanjuba.ai" + ficha);
    await expect(page.locator(`img[src*="/empresas/${curta}/"], img[src*="/empresas/${slug}/"], img[src*="/marcas-zap/logos/"]`), slug).toHaveCount(0);
    // WhatsApp só como número: o atalho de um toque é exclusivo das páginas contratadas.
    await expect(page.locator('a[href^="tel:"]'), slug).toHaveCount(0);
    for (const numero of dados.telefones) {
      await expect(page.locator(`a[href*="wa.me/${numero}"]`), slug).toHaveCount(0);
      await expect(page.locator("#contatos ~ dl"), slug).toContainText(formatarTelefoneBr(numero));
    }
    if (dados.telefones.length > 0) {
      await expect(page.getByText("WhatsApp " + formatarTelefoneBr(dados.telefones[0]), { exact: true })).toBeVisible();
    }
    await expect(page.locator('meta[name="format-detection"]')).toHaveAttribute("content", /telephone=no/);
    await expect(page.getByRole("link", { name: /Quero personalizar a página/ })).toHaveAttribute("href", /wa\.me\//);
    if (slug === "master-tech-auto-center" || slug === "agro-franca") {
      await page.screenshot({ path: `artifacts/${slug}-ficha-${testInfo.project.name}.png`, fullPage: true });
    }
  }

  // Ficha sem telefone público (Grupo Agro França): sem bloco de WhatsApp, com o Instagram.
  await page.goto("/agro-franca");
  await expect(page.locator("#contatos ~ dl")).not.toContainText("WhatsApp");
  await expect(page.locator('#contatos ~ dl a[href="https://www.instagram.com/grupoagrofranca/"]')).toBeVisible();
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
    await expect(faixa.getByText("Essa empresa é sua?", { exact: true })).toBeVisible();
    await expect(faixa.getByText("Mostre suas fotos e serviços em uma página com a sua marca no Piracanjuba.ai.", { exact: true })).toBeVisible();
    await expect(faixa).toHaveAttribute("data-nosnippet", "");
    const link = faixa.getByRole("link", { name: `Falar pelo WhatsApp com a equipe do Piracanjuba.ai sobre a página de ${nome}` });
    await expect(link).toHaveText("Falar pelo WhatsApp");
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
