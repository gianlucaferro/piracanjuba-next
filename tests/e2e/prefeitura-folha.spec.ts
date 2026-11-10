import { expect, test, type Page, type Route } from "@playwright/test";

type Remuneracao = {
  id: string;
  servidor_id: string;
  competencia: string;
  tipo_folha: string;
  bruto: number | null;
  servidores: { orgao_tipo: string };
};

type Cobertura = {
  chave: string;
  ano: number;
  mes: number;
  tipo_folha: string;
  orgao_id: string | null;
  orgao_nome: string | null;
};

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-expose-headers": "Content-Range",
};

function remuneracao(id: string, competencia: string, tipo_folha: string, bruto: number | null, servidor_id = id): Remuneracao {
  return { id, competencia, tipo_folha, bruto, servidor_id, servidores: { orgao_tipo: "prefeitura" } };
}

function folha(): Remuneracao[] {
  return [
    ...Array.from({ length: 32 }, (_, index) => remuneracao(`mensal-${String(index).padStart(2, "0")}`, "2026-10", "MENSAL", 3000, `prefeitura-${index}`)),
    remuneracao("decimo-adiantamento", "2026-10", "13º SALÁRIO ADIANTAMENTO", 1200, "prefeitura-0"),
    remuneracao("decimo-rpps", "2026-10", "13º SALÁRIO ADIANTAMENTO- RPPS", 800, "prefeitura-0"),
    remuneracao("rescisao", "2026-10", "RESCISÃO", 2407.68, "prefeitura-31"),
    remuneracao("mensal-anterior", "2026-09", "MENSAL", 2000),
    { ...remuneracao("camara", "2026-12", "MENSAL", 999999.99), servidores: { orgao_tipo: "camara" } },
  ];
}

const orgaos = [
  { id: "22", nome: "Poder Executivo" },
  { id: "23", nome: "Fundeb" },
  { id: "55", nome: "Fundo Municipal de Saúde" },
  { id: "44", nome: "FUNPREPI" },
  { id: "67", nome: "Assistência Social" },
];

function cobertura(): Cobertura[] {
  return [9, 10].flatMap((mes) => (mes === 9 ? orgaos : orgaos.slice(3)).map((orgao) => ({
    chave: `cobertura-${mes}-${orgao.id}`, ano: 2026, mes, tipo_folha: "MENSAL", orgao_id: orgao.id, orgao_nome: orgao.nome,
  })));
}

function selectRows(rows: (Remuneracao | Cobertura)[], url: URL): (Remuneracao | Cobertura)[] {
  let data = rows.filter((row) => {
    const fields: Record<string, string | number | null> = "servidores" in row
      ? { "servidores.orgao_tipo": row.servidores.orgao_tipo, competencia: row.competencia, tipo_folha: row.tipo_folha }
      : { ano: row.ano, mes: row.mes, tipo_folha: row.tipo_folha };
    for (const [column, value] of Object.entries(fields)) {
      const filter = url.searchParams.get(column);
      if (filter?.startsWith("eq.") && String(value) !== filter.slice(3)) return false;
      if (filter?.startsWith("lt.") && String(value) >= filter.slice(3)) return false;
      if (filter?.startsWith("ilike.") && String(value).toLowerCase() !== filter.slice(6).toLowerCase()) return false;
      if (filter?.startsWith("in.(") && !filter.slice(4, -1).split(",").map((item) => item.replaceAll('"', "")).includes(String(value))) return false;
    }
    return true;
  });
  const periods = [...(url.searchParams.get("or") ?? "").matchAll(/and\(ano\.eq\.(\d+),mes\.eq\.(\d+)\)/g)];
  if (periods.length) data = data.filter((row) => "ano" in row && periods.some((period) => row.ano === Number(period[1]) && row.mes === Number(period[2])));
  const order = url.searchParams.get("order")?.split(",") ?? [];
  return data.sort((left, right) => {
    for (const rule of order) {
      const [column, direction] = rule.split(".");
      const a = (left as unknown as Record<string, string | number | null>)[column];
      const b = (right as unknown as Record<string, string | number | null>)[column];
      const compared = a === b ? 0 : a == null ? 1 : b == null ? -1 : a < b ? -1 : 1;
      if (compared) return direction === "desc" ? -compared : compared;
    }
    return 0;
  });
}

async function respondRows(route: Route, rows: Remuneracao[] | Cobertura[]) {
  if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
  const url = new URL(route.request().url());
  const data = selectRows(rows, url);
  const count = data.length;
  const start = Number(url.searchParams.get("offset") ?? 0);
  const limit = Math.min(1000, Number(url.searchParams.get("limit") ?? 1000));
  const page = data.slice(start, start + limit);
  return route.fulfill({
    headers: { ...cors, "content-range": count ? `${start}-${start + page.length - 1}/${count}` : "*/0" },
    json: route.request().headers().accept?.includes("application/vnd.pgrst.object+json") ? (page[0] ?? null) : page,
  });
}

async function mockFolha(page: Page, rows = folha(), metadata = cobertura()) {
  const requests: URL[] = [];
  await page.clock.setFixedTime(new Date("2026-11-10T15:00:00Z"));
  await page.route("**/rest/v1/remuneracao_servidores?*", (route) => {
    requests.push(new URL(route.request().url()));
    return respondRows(route, rows);
  });
  await page.route("**/rest/v1/prefeitura_folha_nucleogov?*", (route) => {
    const url = new URL(route.request().url());
    requests.push(url);
    expect((url.searchParams.get("select") ?? "").split(",")).not.toContain("raw_payload");
    return respondRows(route, metadata);
  });
  return requests;
}

test("Prefeitura separa mensal, rescisões e 13º e informa os órgãos ainda ausentes", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mockFolha(page);
  await page.goto("/prefeitura/servidores");
  const summary = page.getByRole("region", { name: "Resumo da folha da Prefeitura" });
  const monthly = summary.getByRole("group", { name: "Última folha mensal", exact: true });
  const termination = summary.getByRole("group", { name: "Rescisões", exact: true });
  const thirteenth = summary.getByRole("group", { name: "13º salário", exact: true });
  await expect(monthly).toContainText("2026-10");
  await expect(monthly).toContainText(/R\$\s*96\.000,00/);
  await expect(monthly).toContainText("32 vínculos");
  await expect(termination).toContainText(/R\$\s*2\.407,68/);
  await expect(thirteenth).toContainText(/R\$\s*2\.000,00/);
  await expect(thirteenth).toContainText("1 vínculo");
  await expect(thirteenth).toContainText("2 registros");
  await expect(summary).toContainText("Publicação parcial em 2026-10");
  for (const name of ["Poder Executivo", "Fundeb", "Fundo Municipal de Saúde", "2026-09"]) await expect(summary).toContainText(name);
  await expect(summary).toContainText("Ainda não há registros disponíveis para 2026-11");
  await expect(summary).not.toContainText("2026-12");
  await expect(summary).not.toContainText(/R\$\s*999\.999,99/);
  await expect(summary.getByRole("link", { name: "Ver fonte oficial" })).toHaveAttribute("href", "https://acessoainformacao.piracanjuba.go.gov.br/cidadao/transparencia/folhas");
  const bounds = await summary.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual((page.viewportSize()?.width ?? 0) + 1);
  expect(errors).toEqual([]);
});

test("visão geral mantém a última mensal quando só há pagamentos extraordinários no mês novo", async ({ page }) => {
  const rows = folha().map((row) => ["decimo-adiantamento", "decimo-rpps", "rescisao"].includes(row.id) ? { ...row, competencia: "2026-11" } : row);
  await mockFolha(page, rows);
  await page.goto("/prefeitura");
  const summary = page.getByRole("region", { name: "Resumo da folha da Prefeitura" });
  const monthly = summary.getByRole("group", { name: "Última folha mensal", exact: true });
  await expect(monthly).toContainText("2026-10");
  await expect(monthly).toContainText(/R\$\s*96\.000,00/);
  await expect(summary.getByRole("group", { name: "Rescisões", exact: true })).toContainText("2026-11");
  await expect(summary.getByRole("group", { name: "13º salário", exact: true })).toContainText("2026-11");
  await expect(summary).toContainText("Publicação parcial em 2026-11");
  await expect(summary).toContainText("A folha mensal desta competência ainda não está disponível");
  await expect(page.getByRole("heading", { name: "Folha de pagamento mensal", exact: true })).toHaveCount(0);
});

test("mensal em todos os órgãos remove o aviso de ausência sem afirmar fechamento", async ({ page }) => {
  const metadata = cobertura();
  metadata.push(...orgaos.slice(0, 3).map((orgao) => ({ chave: `cobertura-10-${orgao.id}`, ano: 2026, mes: 10, tipo_folha: "MENSAL", orgao_id: orgao.id, orgao_nome: orgao.nome })));
  await mockFolha(page, folha(), metadata);
  await page.goto("/prefeitura/servidores");
  const summary = page.getByRole("region", { name: "Resumo da folha da Prefeitura" });
  await expect(summary).toContainText(/R\$\s*96\.000,00/);
  await expect(summary).not.toContainText("Publicação parcial");
  await expect(summary).not.toContainText(/publicação completa|folha completa|publicação encerrada/i);
});

test("Prefeitura lê todas as páginas financeiras e de cobertura dos órgãos", async ({ page }) => {
  const rows = Array.from({ length: 1001 }, (_, index) => remuneracao(`mensal-${String(index).padStart(4, "0")}`, "2026-10", "MENSAL", 3000));
  rows.push(remuneracao("mensal-anterior", "2026-09", "MENSAL", 3000));
  const metadata: Cobertura[] = Array.from({ length: 1001 }, (_, index) => ({ chave: `a-${String(index).padStart(4, "0")}`, ano: 2026, mes: 10, tipo_folha: "MENSAL", orgao_id: "44", orgao_nome: "FUNPREPI" }));
  metadata.push({ chave: "z-anterior", ano: 2026, mes: 9, tipo_folha: "MENSAL", orgao_id: "22", orgao_nome: "Poder Executivo" });
  const requests = await mockFolha(page, rows, metadata);
  await page.goto("/prefeitura/servidores");
  const summary = page.getByRole("region", { name: "Resumo da folha da Prefeitura" });
  const monthly = summary.getByRole("group", { name: "Última folha mensal", exact: true });
  await expect(monthly).toContainText(/R\$\s*3\.003\.000,00/);
  await expect(monthly).toContainText("1001 vínculos");
  await expect(summary).toContainText("Poder Executivo");
  await expect(summary).toContainText("Publicação parcial em 2026-10");
  expect(requests.some((url) => url.pathname.endsWith("remuneracao_servidores") && url.searchParams.get("offset") === "1000")).toBe(true);
  expect(requests.some((url) => url.pathname.endsWith("prefeitura_folha_nucleogov") && url.searchParams.get("offset") === "1000")).toBe(true);
});

test("erro na consulta da Prefeitura não vira zero e pode ser recuperado", async ({ page }) => {
  await mockFolha(page);
  let fail = true;
  await page.route("**/rest/v1/remuneracao_servidores?*", (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    return fail ? route.fulfill({ status: 400, headers: cors, json: { code: "TEST_BAD_REQUEST", message: "Consulta rejeitada pela fixture" } }) : route.fallback();
  });
  await page.goto("/prefeitura/servidores");
  const summary = page.getByRole("region", { name: "Resumo da folha da Prefeitura" });
  await expect(summary).toContainText("Não foi possível carregar o resumo da folha da Prefeitura");
  await expect(summary).not.toContainText(/R\$\s*0,00/);
  fail = false;
  await summary.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(summary).toContainText(/R\$\s*96\.000,00/);
});

test("Prefeitura sem registros mantém valores indisponíveis", async ({ page }) => {
  await mockFolha(page, [], []);
  await page.goto("/prefeitura/servidores");
  const summary = page.getByRole("region", { name: "Resumo da folha da Prefeitura" });
  await expect(summary).toContainText("Ainda não há registros de remuneração da Prefeitura disponíveis");
  await expect(summary).not.toContainText(/R\$\s*0,00/);
});

test("somente extraordinários não substituem mensal e pagamentos desconhecidos ficam separados", async ({ page }) => {
  await mockFolha(page, [
    remuneracao("rescisao", "2026-11", "RESCISÃO", 2407.68),
    remuneracao("decimo", "2026-11", "13º SALÁRIO", 2000),
    remuneracao("outro", "2026-11", "COMPLEMENTAR", 150),
  ], []);
  await page.goto("/prefeitura/servidores");
  const summary = page.getByRole("region", { name: "Resumo da folha da Prefeitura" });
  const monthly = summary.getByRole("group", { name: "Última folha mensal", exact: true });
  await expect(monthly).toContainText("Folha mensal ainda não disponível");
  await expect(monthly).not.toContainText(/R\$/);
  await expect(summary).toContainText("Publicação parcial em 2026-11");
  await expect(summary.getByRole("group", { name: "Rescisões", exact: true })).toContainText(/R\$\s*2\.407,68/);
  await expect(summary.getByRole("group", { name: "13º salário", exact: true })).toContainText(/R\$\s*2\.000,00/);
  await expect(summary.getByRole("group", { name: "Outros pagamentos", exact: true })).toContainText(/R\$\s*150,00/);
});

test("mensal nula não soma valores conhecidos como total e cobertura ausente não afirma completude", async ({ page }) => {
  const rows = folha().map((row) => row.id === "mensal-00" ? { ...row, bruto: null } : row);
  await mockFolha(page, rows, []);
  await page.goto("/prefeitura/servidores");
  const summary = page.getByRole("region", { name: "Resumo da folha da Prefeitura" });
  const monthly = summary.getByRole("group", { name: "Última folha mensal", exact: true });
  await expect(monthly).toContainText("Valor não informado");
  await expect(monthly).not.toContainText(/R\$/);
  await expect(summary).toContainText(/cobertura por órgão/i);
  await expect(summary).not.toContainText(/publicação completa|folha completa|publicação encerrada/i);
});
