import { expect, test, type Page } from "@playwright/test";

type FolhaRow = {
  id: string;
  servidor_id: string;
  competencia: string;
  tipo_folha: string;
  bruto: number | null;
  servidores: { orgao_tipo: string };
};

function folha(competenciaMensal = "2026-10"): FolhaRow[] {
  return [
    ...Array.from({ length: 32 }, (_, index) => ({ id: `mensal-${String(index).padStart(2, "0")}`, servidor_id: `camara-${index}`, competencia: competenciaMensal, tipo_folha: "MENSAL", bruto: 3000, servidores: { orgao_tipo: "camara" } })),
    { id: "rescisao-0", servidor_id: "camara-0", competencia: "2026-11", tipo_folha: "RESCISÃO", bruto: 2407.68, servidores: { orgao_tipo: "camara" } },
    { id: "prefeitura-0", servidor_id: "prefeitura-0", competencia: "2026-12", tipo_folha: "MENSAL", bruto: 999999.99, servidores: { orgao_tipo: "prefeitura" } },
  ];
}

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-expose-headers": "Content-Range",
};

async function mockFolha(page: Page, rows: FolhaRow[]) {
  await page.route("**/rest/v1/remuneracao_servidores?*", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    const url = new URL(request.url());
    let data = rows.filter((row) => {
      for (const column of ["servidores.orgao_tipo", "competencia", "tipo_folha"] as const) {
        const filter = url.searchParams.get(column);
        const value = column === "servidores.orgao_tipo" ? row.servidores.orgao_tipo : row[column];
        if (filter?.startsWith("eq.") && value !== filter.slice(3)) return false;
        if (filter?.startsWith("ilike.") && value.toLowerCase() !== filter.slice(6).toLowerCase()) return false;
        if (filter?.startsWith("in.(") && !filter.slice(4, -1).split(",").map((item) => item.replaceAll('"', "")).includes(value)) return false;
      }
      return true;
    });
    const order = url.searchParams.get("order")?.split(",") ?? [];
    data.sort((left, right) => {
      for (const rule of order) {
        const [column, direction] = rule.split(".");
        if (column !== "id" && column !== "competencia") continue;
        const compared = left[column].localeCompare(right[column]);
        if (compared) return direction === "desc" ? -compared : compared;
      }
      return 0;
    });
    const count = data.length;
    const start = Number(url.searchParams.get("offset") ?? 0);
    const limit = Math.min(1000, Number(url.searchParams.get("limit") ?? 1000));
    data = data.slice(start, start + limit);
    await route.fulfill({
      headers: { ...cors, "content-range": count ? `${start}-${start + data.length - 1}/${count}` : "*/0" },
      json: request.headers().accept?.includes("application/vnd.pgrst.object+json") ? (data[0] ?? null) : data,
    });
  });
}

async function mockVereador(page: Page) {
  await page.route("**/rest/v1/vereadores?*", (route) => route.fulfill({ headers: cors, json: [{ id: "vereador-teste", nome: "Vereador de Teste", slug: "vereador-de-teste", foto_url: null, cargo_mesa: null, partido: null, votos_eleicao: null, ano_eleicao: null }] }));
  await page.route("**/rest/v1/remuneracao_mensal?*", (route) => {
    const salary = { vereador_id: "vereador-teste", competencia: "2026-10", bruto: 3000, liquido: 2700, subsidio_referencia: 3000 };
    return route.fulfill({ headers: cors, json: route.request().headers().accept?.includes("application/vnd.pgrst.object+json") ? salary : [salary] });
  });
}

test("Câmara mantém a mensal anterior e separa a rescisão da publicação parcial", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/camara/servidores");
  const summary = page.getByRole("region", { name: "Resumo da folha da Câmara" });
  const monthly = summary.getByRole("group", { name: "Última folha mensal", exact: true });
  const termination = summary.getByRole("group", { name: "Rescisões", exact: true });
  await expect(monthly).toContainText("2026-10");
  await expect(monthly).toContainText(/R\$\s*96\.000,00/);
  await expect(monthly).toContainText("32 pessoas");
  await expect(termination).toContainText("2026-11");
  await expect(termination).toContainText(/R\$\s*2\.407,68/);
  await expect(summary).toContainText("Publicação parcial em 2026-11");
  await expect(summary).toContainText("A folha mensal desta competência ainda não está disponível");
  await expect(summary).not.toContainText("2026-12");
  await expect(summary.getByRole("link", { name: /fonte|portal/i })).toHaveAttribute("href", "https://acessoainformacao.piracanjuba.go.leg.br/cidadao/transparencia/folhas");
  const bounds = await summary.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual((page.viewportSize()?.width ?? 0) + 1);
  expect(errors).toEqual([]);
});

test("Câmara separa mensal e rescisão do mesmo mês sem afirmar fechamento", async ({ page }) => {
  await mockFolha(page, folha("2026-11"));
  await page.goto("/camara/servidores");
  const summary = page.getByRole("region", { name: "Resumo da folha da Câmara" });
  const monthly = summary.getByRole("group", { name: "Última folha mensal", exact: true });
  const termination = summary.getByRole("group", { name: "Rescisões", exact: true });
  await expect(monthly).toContainText("2026-11");
  await expect(monthly).toContainText(/R\$\s*96\.000,00/);
  await expect(termination).toContainText("2026-11");
  await expect(termination).toContainText(/R\$\s*2\.407,68/);
  await expect(summary).not.toContainText("Publicação parcial");
  await expect(summary).not.toContainText(/publicação completa|folha completa|publicação encerrada/i);
});

test("resumo da Câmara soma todas as páginas da folha", async ({ page }) => {
  const rows: FolhaRow[] = Array.from({ length: 1001 }, (_, index) => ({
    id: `mensal-${String(index).padStart(4, "0")}`,
    servidor_id: `camara-${index}`,
    competencia: "2026-10",
    tipo_folha: "MENSAL",
    bruto: 3000,
    servidores: { orgao_tipo: "camara" },
  }));
  await mockFolha(page, rows);
  await page.goto("/camara/servidores");
  const summary = page.getByRole("region", { name: "Resumo da folha da Câmara" });
  const monthly = summary.getByRole("group", { name: "Última folha mensal", exact: true });
  await expect(monthly).toContainText(/R\$\s*3\.003\.000,00/);
  await expect(monthly).toContainText("1001 pessoas");
  await expect(monthly).toContainText("1001 registros");
});

test("falha da consulta não vira folha zerada e permite tentar novamente", async ({ page }) => {
  let fail = true;
  await page.route("**/rest/v1/remuneracao_servidores?*", (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    // Erro permanente de consulta: o SDK não repete cada tentativa antes do React Query.
    return fail ? route.fulfill({ status: 400, headers: cors, json: { code: "TEST_BAD_REQUEST", message: "Consulta rejeitada pela fixture" } }) : route.continue();
  });
  await page.goto("/camara/servidores");
  const summary = page.getByRole("region", { name: "Resumo da folha da Câmara" });
  await expect(summary).toContainText("Não foi possível carregar o resumo da folha da Câmara");
  await expect(summary).not.toContainText(/R\$\s*0,00/);
  fail = false;
  await summary.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(summary).toContainText(/R\$\s*96\.000,00/);
});

test("ausência de remunerações é exibida como indisponível", async ({ page }) => {
  await mockFolha(page, []);
  await page.goto("/camara/servidores");
  const summary = page.getByRole("region", { name: "Resumo da folha da Câmara" });
  await expect(summary).toContainText("Ainda não há registros de remuneração da Câmara disponíveis");
  await expect(summary).not.toContainText(/R\$\s*0,00/);
});

test("parcela anual usa somente a mensal e não soma novamente o subsídio", async ({ page }) => {
  await mockVereador(page);
  await page.goto("/camara");
  const card = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Vereador de Teste", exact: true }) });
  await expect(card).toContainText(/R\$\s*3\.000,00/);
  await expect(card).toContainText("Parcela estimada da folha anual");
  await expect(card).toContainText(/R\$\s*104\.727,27/);
  await expect(card).toContainText("Base mensal: 2026-10");
  await expect(card).toContainText("2026-11");
  await expect(card).not.toContainText("Custo total para o contribuinte");
});

test("somente rescisões não geram valor mensal nem estimativa anual", async ({ page }) => {
  await mockVereador(page);
  await mockFolha(page, folha().filter((row) => row.tipo_folha === "RESCISÃO"));
  await page.goto("/camara");
  const summary = page.getByRole("region", { name: "Resumo da folha da Câmara" });
  await expect(summary).toContainText("Folha mensal ainda não disponível");
  await expect(summary).toContainText(/R\$\s*2\.407,68/);
  await expect(summary).toContainText("Publicação parcial em 2026-11");
  const card = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Vereador de Teste", exact: true }) });
  await expect(card).toContainText(/R\$\s*3\.000,00/);
  await expect(card).not.toContainText("Parcela estimada da folha anual");
  await expect(summary).not.toContainText(/R\$\s*0,00/);
});
