import { expect, test, type Page, type Route } from "@playwright/test";
import type {
  GrupoFolhaIndividual,
  RespostaResumoServidor,
} from "../../supabase/functions/_shared/servidor-resumo";

type Orgao = "prefeitura" | "camara";
const ids = {
  ana: "00000000-0000-4000-8000-000000000101",
  bruno: "00000000-0000-4000-8000-000000000102",
};
const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-expose-headers": "Content-Range",
};

function fonte(orgao: Orgao) {
  const domain = orgao === "prefeitura" ? "gov" : "leg";
  return `https://acessoainformacao.piracanjuba.go.${domain}.br/cidadao/transparencia/folhas`;
}

function grupo(
  competencia: string,
  tipos: { tipo: string; bruto: number | null; liquido: number | null }[],
  orgao: Orgao,
): GrupoFolhaIndividual {
  const total = (field: "bruto" | "liquido") => tipos.every((item) => item[field] !== null)
    ? tipos.reduce((sum, item) => sum + Math.round(item[field]! * 100), 0) / 100 : null;
  return {
    competencia,
    bruto: total("bruto"),
    liquido: total("liquido"),
    registros: tipos.length,
    tipos: tipos.map((item) => item.tipo),
    lancamentos: tipos.map((item, index) => ({
      id: `${competencia}-${item.tipo}-${index}`,
      competencia,
      tipo_folha: item.tipo,
      bruto: item.bruto,
      liquido: item.liquido,
      fonte_url: fonte(orgao),
    })),
  };
}

function resumo(orgao: Orgao, id: string = ids.ana): RespostaResumoServidor {
  const mensal = grupo("2026-10", [{ tipo: "MENSAL", bruto: 5200, liquido: 4680 }], orgao);
  const rescisoes = grupo("2026-11", [{ tipo: "RESCISÃO", bruto: 2407.68, liquido: 2000 }], orgao);
  const decimoTerceiro = grupo("2026-10", [
    { tipo: "13º SALÁRIO ADIANTAMENTO", bruto: 1000, liquido: 800 },
    { tipo: "13º SALÁRIO ADIANTAMENTO- RPPS", bruto: 500, liquido: 400 },
  ], orgao);
  const outros = grupo("2026-09", [{ tipo: "COMPLEMENTAR", bruto: 150, liquido: 120 }], orgao);
  return {
    servidor: {
      id,
      nome: id === ids.ana ? "Ana de Teste" : "Bruno de Teste",
      cargo: orgao === "prefeitura" ? "Professora" : "Assessora",
      orgao_tipo: orgao,
      fonte_url: fonte(orgao),
    },
    remuneracoes: [mensal, rescisoes, decimoTerceiro, outros].flatMap((group) => group.lancamentos),
    resumo_folha: {
      competenciaAtual: "2026-11",
      ultimaCompetencia: "2026-11",
      mensal,
      rescisoes,
      decimoTerceiro,
      outros,
      semRegistroAtual: false,
      semMensalNaUltimaCompetencia: true,
      totalRegistros: 15,
    },
    resumo: "Registros oficiais separados por tipo de folha e competência.",
    modo: "dados_oficiais",
    cached: false,
  };
}

type SummaryResponse = { status?: number; body: unknown };

async function mockServidores(
  page: Page,
  orgao: Orgao,
  respond: (id: string, route: Route) => SummaryResponse | Promise<SummaryResponse>,
) {
  const requested: string[] = [];
  await page.clock.setFixedTime(new Date("2026-11-10T15:00:00Z"));
  await page.route("**/rest/v1/servidores?*", (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const url = new URL(route.request().url());
    const requestedOrgao = url.searchParams.get("orgao_tipo")?.replace("eq.", "");
    const data = requestedOrgao && requestedOrgao !== orgao ? [] : [ids.ana, ids.bruno].map((id) => ({
      ...resumo(orgao, id).servidor,
      secretaria_id: null,
      updated_at: "2026-11-10T12:00:00Z",
    }));
    return route.fulfill({ headers: { ...cors, "content-range": data.length ? `0-${data.length - 1}/${data.length}` : "*/0" }, json: data });
  });
  await page.route("**/functions/v1/summarize-servidor", async (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    expect(route.request().method()).toBe("POST");
    const body = route.request().postDataJSON() as { servidor_id: string };
    expect(Object.keys(body)).toEqual(["servidor_id"]);
    requested.push(body.servidor_id);
    const response = await respond(body.servidor_id, route);
    await route.fulfill({ status: response.status ?? 200, headers: cors, json: response.body });
  });
  return requested;
}

async function openServidor(page: Page, orgao: Orgao, name = "Ana de Teste") {
  await page.goto(`/${orgao}/servidores`);
  await page.getByRole("button", { name: new RegExp(`${name}.*Ver resumo`) }).click();
  const dialog = page.getByRole("dialog", { name, exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
}

for (const orgao of ["prefeitura", "camara"] as const) {
  test(`${orgao}: resumo individual separa mensal, rescisão e 13º com suas competências`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const requested = await mockServidores(page, orgao, (id) => ({ body: resumo(orgao, id) }));
    const dialog = await openServidor(page, orgao);
    const mensal = dialog.getByRole("group", { name: "Salário mensal", exact: true });
    const rescisoes = dialog.getByRole("group", { name: "Rescisões", exact: true });
    const decimo = dialog.getByRole("group", { name: "13º salário", exact: true });
    await expect(mensal).toContainText("Competência 2026-10");
    await expect(mensal).toContainText(/R\$\s*5\.200,00/);
    await expect(mensal).toContainText(/R\$\s*4\.680,00/);
    await expect(mensal).not.toContainText(/R\$\s*2\.407,68|2026-11/);
    await expect(rescisoes).toContainText("Competência 2026-11");
    await expect(rescisoes).toContainText(/R\$\s*2\.407,68/);
    await expect(rescisoes).toContainText("RESCISÃO");
    await expect(decimo).toContainText("Competência 2026-10");
    await expect(decimo).toContainText(/R\$\s*1\.500,00/);
    await expect(decimo).toContainText(/R\$\s*1\.200,00/);
    await expect(decimo).toContainText("13º SALÁRIO ADIANTAMENTO- RPPS");
    await expect(dialog.getByRole("group", { name: "Outros pagamentos", exact: true })).toContainText("COMPLEMENTAR");
    await expect(dialog).toContainText("Não há registro mensal para este vínculo em 2026-11.");
    await expect(dialog).not.toContainText(/gerado por IA|salário atual|folha completa|pagamento atrasado/i);
    await expect(dialog.getByRole("link", { name: /fonte oficial/i })).toHaveAttribute("href", fonte(orgao));
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual((page.viewportSize()?.width ?? 0) + 1);
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    expect(requested).toEqual([ids.ana]);
    expect(errors).toEqual([]);
  });
}

test("mensal ausente não é substituída pela rescisão individual", async ({ page }) => {
  const response = resumo("prefeitura");
  response.resumo_folha.mensal = null;
  response.resumo_folha.decimoTerceiro = null;
  response.resumo_folha.outros = null;
  response.remuneracoes = response.resumo_folha.rescisoes!.lancamentos;
  await mockServidores(page, "prefeitura", () => ({ body: response }));
  const dialog = await openServidor(page, "prefeitura");
  const mensal = dialog.getByRole("group", { name: "Salário mensal", exact: true });
  await expect(mensal).toContainText("Nenhum registro disponível nesta categoria.");
  await expect(mensal).not.toContainText(/R\$/);
  await expect(dialog.getByRole("group", { name: "Rescisões", exact: true })).toContainText(/R\$\s*2\.407,68/);
  await expect(dialog.getByRole("group", { name: "13º salário", exact: true })).not.toContainText(/R\$/);
});

test("valor individual não informado permanece diferente de zero publicado", async ({ page }) => {
  const response = resumo("camara");
  response.resumo_folha.mensal = grupo("2026-10", [{ tipo: "MENSAL", bruto: null, liquido: 0 }], "camara");
  response.resumo_folha.rescisoes = null;
  response.resumo_folha.decimoTerceiro = null;
  response.resumo_folha.outros = null;
  response.resumo_folha.ultimaCompetencia = "2026-10";
  response.resumo_folha.semRegistroAtual = true;
  response.resumo_folha.semMensalNaUltimaCompetencia = false;
  response.remuneracoes = response.resumo_folha.mensal.lancamentos;
  await mockServidores(page, "camara", () => ({ body: response }));
  const dialog = await openServidor(page, "camara");
  const mensal = dialog.getByRole("group", { name: "Salário mensal", exact: true });
  await expect(mensal).toContainText(/Bruto.*Não informado/);
  await expect(mensal).toContainText(/Líquido.*R\$\s*0,00/);
  await expect(dialog).toContainText("Não há registros disponíveis para este vínculo em 2026-11.");
});

test("erro individual permite tentar novamente sem exibir remuneração zerada", async ({ page }) => {
  let fail = true;
  const requested = await mockServidores(page, "prefeitura", () => fail
    ? { status: 500, body: { error: "Consulta indisponível na fixture" } }
    : { body: resumo("prefeitura") });
  const dialog = await openServidor(page, "prefeitura");
  await expect(dialog.getByRole("button", { name: "Tentar novamente" })).toBeVisible();
  await expect(dialog).not.toContainText(/R\$/);
  fail = false;
  await dialog.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(dialog.getByRole("group", { name: "Salário mensal", exact: true })).toContainText(/R\$\s*5\.200,00/);
  expect(requested).toEqual([ids.ana, ids.ana]);
});

test("reabrir servidor consulta a retificação da mesma competência", async ({ page }) => {
  let response = resumo("prefeitura");
  const requested = await mockServidores(page, "prefeitura", () => ({ body: response }));
  const dialog = await openServidor(page, "prefeitura");
  await expect(dialog.getByRole("group", { name: "Salário mensal", exact: true })).toContainText(/R\$\s*5\.200,00/);
  await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(dialog).toBeHidden();
  response = resumo("prefeitura");
  response.resumo_folha.mensal = grupo("2026-10", [{ tipo: "MENSAL", bruto: 5600, liquido: 4900 }], "prefeitura");
  response.remuneracoes = response.resumo_folha.mensal.lancamentos;
  await page.getByRole("button", { name: /Ana de Teste.*Ver resumo/ }).click();
  await expect(dialog.getByRole("group", { name: "Salário mensal", exact: true })).toContainText(/R\$\s*5\.600,00/);
  await expect(dialog.getByRole("group", { name: "Salário mensal", exact: true })).not.toContainText(/R\$\s*5\.200,00/);
  expect(requested).toEqual([ids.ana, ids.ana]);
});

test("resposta atrasada de um servidor não sobrescreve o resumo do outro", async ({ page }) => {
  let releaseFirst!: () => void;
  const gate = new Promise<void>((resolve) => { releaseFirst = resolve; });
  let started = false;
  let firstHandled = false;
  const requested = await mockServidores(page, "camara", async (id) => {
    if (id === ids.ana) {
      started = true;
      await gate;
      firstHandled = true;
      return { body: resumo("camara", id) };
    }
    const response = resumo("camara", id);
    response.resumo_folha.mensal = grupo("2026-10", [{ tipo: "MENSAL", bruto: 9700, liquido: 8500 }], "camara");
    response.remuneracoes = response.resumo_folha.mensal.lancamentos;
    return { body: response };
  });
  const first = await openServidor(page, "camara");
  await expect.poll(() => started).toBe(true);
  await expect(first.getByRole("status")).toContainText("Carregando resumo do servidor");
  await first.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(first).toBeHidden();
  await page.getByRole("button", { name: /Bruno de Teste.*Ver resumo/ }).click();
  const second = page.getByRole("dialog", { name: "Bruno de Teste", exact: true });
  await expect(second.getByRole("group", { name: "Salário mensal", exact: true })).toContainText(/R\$\s*9\.700,00/);
  const completedFirst = page.waitForResponse((response) => response.url().endsWith("/functions/v1/summarize-servidor") && response.request().postDataJSON()?.servidor_id === ids.ana);
  releaseFirst();
  await (await completedFirst).finished();
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect.poll(() => firstHandled).toBe(true);
  await expect(second.getByRole("group", { name: "Salário mensal", exact: true })).toContainText(/R\$\s*9\.700,00/);
  await expect(second).not.toContainText(/Ana de Teste|R\$\s*5\.200,00/);
  expect(requested).toEqual([ids.ana, ids.bruno]);
});

test("servidor sem remunerações mantém as categorias indisponíveis", async ({ page }) => {
  const response = resumo("camara");
  response.remuneracoes = [];
  response.resumo_folha = {
    competenciaAtual: "2026-11", ultimaCompetencia: null,
    mensal: null, rescisoes: null, decimoTerceiro: null, outros: null,
    semRegistroAtual: true, semMensalNaUltimaCompetencia: false, totalRegistros: 0,
  };
  response.resumo = "Não há registros de remuneração disponíveis para este vínculo.";
  await mockServidores(page, "camara", () => ({ body: response }));
  const dialog = await openServidor(page, "camara");
  for (const name of ["Salário mensal", "Rescisões", "13º salário"]) {
    await expect(dialog.getByRole("group", { name, exact: true })).toContainText("Nenhum registro disponível nesta categoria.");
  }
  await expect(dialog).not.toContainText(/R\$/);
  await expect(dialog).not.toContainText(/folha completa|pagamento atrasado/i);
});
