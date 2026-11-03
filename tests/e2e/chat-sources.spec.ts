import { expect, test } from "@playwright/test";

test("assistente mostra fontes e competência com links seguros, sem chamar IA real", async ({ page }) => {
  await page.route("**/functions/v1/chatbot", async (route) => {
    const sources = { type: "sources", sources: [
      { title: "Folha da Prefeitura", url: "https://piracanjuba.ai/prefeitura/servidores", period: "2026-09", coverage: "Amostra da folha, não representa toda a base." },
      { title: "Link inválido", url: "javascript:alert(1)", period: null, coverage: "Não deve ser mostrado." },
    ] };
    const delta = { choices: [{ delta: { content: "A informação consultada corresponde à competência 2026-09." } }] };
    await route.fulfill({ status: 200, contentType: "text/event-stream", body: `event: sources\ndata: ${JSON.stringify(sources)}\n\ndata: ${JSON.stringify(delta)}\n\ndata: [DONE]\n\n` });
  });
  await page.goto("/horarios-onibus");
  await page.getByRole("button", { name: "Abrir assistente do Piracanjuba.ai" }).click();
  const chat = page.getByRole("dialog", { name: "Assistente do Piracanjuba.ai" });
  await chat.getByPlaceholder("Pergunte sobre Piracanjuba...").fill("Qual é a competência da folha?");
  await chat.getByPlaceholder("Pergunte sobre Piracanjuba...").press("Enter");
  await expect(chat.getByText("A informação consultada corresponde à competência 2026-09.", { exact: true })).toBeVisible();
  await chat.getByText("Conferir fontes e períodos (1)", { exact: true }).click();
  await expect(chat.getByRole("link", { name: "Folha da Prefeitura" })).toHaveAttribute("href", "https://piracanjuba.ai/prefeitura/servidores");
  await expect(chat.getByText("Referência: 2026-09", { exact: true })).toBeVisible();
  await expect(chat.getByRole("link", { name: "Link inválido" })).toHaveCount(0);
});
