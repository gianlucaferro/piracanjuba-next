import { expect, test } from "@playwright/test";

test("a página de quiropraxia identifica a cidade do consultório e o contato de Juan", async ({ page }) => {
  await page.goto("/quiropraxia");
  const artigo = page.getByRole("article");
  await expect(artigo.getByRole("heading", { level: 1 })).toContainText(/quiropraxia/i);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://piracanjuba.ai/quiropraxia");
  const agendar = artigo.getByRole("link", { name: /agendar.*instagram/i });
  await expect(agendar).toBeVisible();
  await expect(agendar).toHaveAttribute("href", "https://www.instagram.com/juancmesquita/");
  const clinica = artigo.getByRole("region", { name: /clínica essência/i });
  const linksWaze = clinica.getByRole("link", { name: /waze/i });
  await expect(linksWaze.first()).toBeVisible();
  for (const link of await linksWaze.all()) {
    const rota = new URL((await link.getAttribute("href"))!);
    expect(rota.origin + rota.pathname).toBe("https://www.waze.com/ul");
    expect(rota.searchParams.get("ll")).toBe("-17.3121852,-49.0332367");
    expect(rota.searchParams.get("navigate")).toBe("yes");
  }
  for (const cidade of ["Piracanjuba", "Professor Jamil", "Cristianópolis", "Morrinhos", "Caldas Novas"]) {
    await expect(artigo).toContainText(cidade);
  }
  await expect(artigo.locator('a[href="/estetica"]').first()).toBeVisible();
});

test("os cards de benefícios citam a revisão em português e a diretriz clínica", async ({ page }) => {
  await page.goto("/quiropraxia");
  const beneficios = page.getByRole("region", { name: /benefícios/i });
  const cards = beneficios.getByRole("listitem");
  expect(await cards.count()).toBeGreaterThanOrEqual(2);
  for (const card of await cards.all()) {
    await expect(card.getByRole("heading", { level: 3 })).toBeVisible();
    await expect(card.getByRole("paragraph")).toHaveText(/\S/);
  }
  const cochrane = beneficios.getByRole("link", { name: /cochrane/i });
  await expect(cochrane).toBeVisible();
  await expect(cochrane).toHaveAttribute("href", /^https:\/\/(?:www\.)?cochrane\.org\/pt(?:-br)?\//i);
  const nice = beneficios.getByRole("link", { name: /nice/i });
  await expect(nice).toBeVisible();
  await expect(nice).toHaveAttribute("href", /^https:\/\/www\.nice\.org\.uk\/guidance\/ng59\//i);
});

test("as dúvidas de quiropraxia abrem e fecham pelo teclado", async ({ page }) => {
  await page.goto("/quiropraxia");
  const perguntas = page.getByRole("article").locator("details");
  const primeira = perguntas.first();
  const pergunta = primeira.locator("summary");
  const resposta = primeira.getByRole("paragraph", { includeHidden: true });
  await expect(resposta).toBeHidden();
  await pergunta.focus();
  await page.keyboard.press("Enter");
  await expect(resposta).toBeVisible();
  await expect(resposta).toHaveText(/\S/);
  await page.keyboard.press("Space");
  await expect(resposta).toBeHidden();
  await page.keyboard.press("Tab");
  await expect(perguntas.nth(1).locator("summary")).toBeFocused();
});

test("a página de estética liga cada agendamento ao contato indicado pela clínica", async ({ page }) => {
  await page.goto("/estetica");
  const artigo = page.getByRole("article");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://piracanjuba.ai/estetica");
  const equipe = artigo.getByRole("region", { name: /agende com/i });
  for (const [nome, telefone] of [
    ["Laurieni Costa", "5564992802081"],
    ["Neuzirene Oliveira", "5564992554074"],
    ["Adryellen Costa", "5564992888444"],
  ]) {
    const contato = equipe.getByRole("link", { name: new RegExp(nome) });
    await expect(contato.getByText(nome, { exact: true })).toBeVisible();
    const destino = new URL((await contato.getAttribute("href"))!);
    expect(destino.origin + destino.pathname).toBe("https://wa.me/" + telefone);
    expect(destino.searchParams.get("text")).toContain(nome.split(" ")[0]);
  }
  const rota = new URL((await artigo.getByRole("link", { name: /waze/i }).first().getAttribute("href"))!);
  expect(rota.origin).toBe("https://www.waze.com");
  expect(rota.searchParams.get("ll")).toBe("-17.3121852,-49.0332367");
  expect(rota.searchParams.get("navigate")).toBe("yes");
  await expect(artigo.locator('a[href*="instagram.com/essenciaclinicaestetica_"]').first()).toBeVisible();
  await expect(artigo.locator('a[href="/quiropraxia"]').first()).toBeVisible();
});

test("os quatro rituais de Head Spa abrem o WhatsApp da Laurieni com a escolha e a duração", async ({ page }) => {
  await page.goto("/estetica");
  const experiencias = page.getByRole("region", { name: "Escolha o seu Head Spa" });
  for (const [nome, minutos] of [["Zen", 40], ["Essence", 50], ["Glow", 60], ["Luxo", 80]] as const) {
    const ritual = experiencias.getByRole("link", { name: new RegExp(`\\b${nome}\\b`) });
    await expect(ritual.getByText(nome, { exact: true })).toBeVisible();
    await expect(ritual.getByText(`${minutos} min`, { exact: true })).toBeVisible();
    await expect(ritual).toHaveAccessibleName(new RegExp(`${minutos} min`));
    const destino = new URL((await ritual.getAttribute("href"))!);
    expect(destino.origin + destino.pathname).toBe("https://wa.me/5564992802081");
    const mensagem = destino.searchParams.get("text");
    expect(mensagem).toContain("Laurieni");
    expect(mensagem).toContain("Head Spa " + nome);
    expect(mensagem).toMatch(new RegExp(`\\b${minutos} min(?:utos)?\\b`));
  }
});
