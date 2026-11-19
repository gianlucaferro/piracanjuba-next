import { expect, test } from "@playwright/test";
import { PACIFICO_SIQUEIRA as escritorio } from "../../src/data/pacifico-siqueira";
import { WHATSAPP_COMERCIAL } from "../../src/data/paginaEmpresa";

test("Pacífico Siqueira exibe os registros e mantém o contato do escritório separado da gestão da página", async ({ page }) => {
  const resposta = await page.goto(escritorio.path);
  expect(resposta?.status()).toBe(200);
  const artigo = page.getByRole("article");
  await expect(artigo.getByRole("heading", { level: 1 })).toHaveText(escritorio.nome);
  const urlPublica = "https://piracanjuba.ai" + escritorio.path;
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", urlPublica);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", "https://piracanjuba.ai" + escritorio.imagem);
  const equipe = artigo.getByRole("region", { name: "Advogados do escritório" });
  for (const p of escritorio.equipe) {
    const perfil = equipe.getByRole("link").filter({ hasText: p.nome });
    await expect(perfil).toHaveAttribute("href", p.perfil);
    await expect(perfil).toContainText("OAB/GO " + p.oab);
    await expect(perfil.getByRole("img")).toBeVisible();
  }
  const schema = JSON.parse((await artigo.locator('script[type="application/ld+json"]').textContent())!);
  const negocio = schema["@graph"].find((node: { "@type": string }) => node["@type"] === "LegalService");
  expect(negocio.telephone).toBe("+" + escritorio.telefone);
  expect(negocio.address.postalCode).toBe(escritorio.endereco.cep);
  expect(negocio.employee).toHaveLength(escritorio.equipe.length);
  await expect(artigo.getByRole("link", { name: "Abrir no Google Maps" })).toHaveAttribute("href", escritorio.mapa);
  const agendar = artigo.getByRole("link", { name: "Agendar pelo WhatsApp" });
  const gestao = artigo.getByRole("link", { name: /Solicitar personalização, ajuste ou remoção/ });
  const destinoCliente = new URL((await agendar.getAttribute("href"))!);
  const destinoPortal = new URL((await gestao.getAttribute("href"))!);
  expect(destinoCliente.origin + destinoCliente.pathname).toBe("https://wa.me/" + escritorio.telefone);
  expect(destinoPortal.origin + destinoPortal.pathname).toBe("https://wa.me/" + WHATSAPP_COMERCIAL);
  expect(destinoPortal.searchParams.get("text")).toContain(urlPublica);
});
