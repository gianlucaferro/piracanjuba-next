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
