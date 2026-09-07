/// <reference lib="deno.ns" />
import {
  baixarPdfPresenca,
  NOMES_PRESENCAS,
  parseListasPresenca,
  parsePedidoPresencas,
  parseResultadoPresencas,
  type PresencaExistente,
  protegerPresencasConfirmadas,
  resolverVereadoresPresenca,
  selecionarLotePresencas,
  sessaoJaVerificada,
  urlPresenca,
} from "./presencas-centi.ts";
function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Esperado ${JSON.stringify(expected)}, recebido ${
        JSON.stringify(actual)
      }`,
    );
  }
}
async function rejects(fn: () => unknown | Promise<unknown>, part: string) {
  try {
    await fn();
  } catch (error) {
    if (String(error).includes(part)) return;
    throw error;
  }
  throw new Error(`Esperada falha: ${part}`);
}
const db = NOMES_PRESENCAS.map(([, nome], i) => ({ id: String(i + 1), nome }));
const vereadores = resolverVereadoresPresenca(db);
const rawUrl =
  "https://camarapiracanjuba.centi.com.br/download/&#xC7;0sG$Z58teX/LISTA.PDF";
const html = (
  url = rawUrl,
  title = "LISTA PRESENÇA 4ª SESSÃO ORDINÁRIA",
  date = "24/08/2026",
) =>
  `<a href="https://camarapiracanjuba.centi.com.br/download/OUTRO.PDF">Menu</a><table><tbody><tr><td>${title}</td><td></td><td>${date}</td><td><a href="${url}">PDF</a></td></tr></tbody></table>`;
const lista = parseListasPresenca(html())[0];
const payload = (): {
  sessao_data: string;
  presencas: { nome: string; presente: boolean }[];
} => ({
  sessao_data: lista.data,
  presencas: NOMES_PRESENCAS.map(([nome], i) => ({ nome, presente: i !== 2 })),
});
function old(overrides: Partial<PresencaExistente> = {}): PresencaExistente {
  return {
    id: "existing-1",
    sessao_titulo: lista.titulo,
    sessao_data: lista.data,
    vereador_nome: vereadores[0].nome,
    vereador_id: vereadores[0].id,
    fonte_url: lista.pdfUrl,
    status_verificacao: "ia",
    ...overrides,
  };
}
Deno.test("decodifica entidade do href antes de interpretar fragmento e vincula PDF à mesma linha", () => {
  equal(
    lista.pdfUrl,
    "https://camarapiracanjuba.centi.com.br/download/%C3%870sG$Z58teX/LISTA.PDF",
  );
  equal(lista.data, "2026-08-24");
  equal(urlPresenca(rawUrl.replace("&#xC7;", "&#199;")), lista.pdfUrl);
});
Deno.test("recusa tabela vazia, data impossível, outro tipo de documento e destino não oficial", async () => {
  await rejects(() => parseListasPresenca("<html>erro</html>"), "Tabela");
  await rejects(() => parseListasPresenca("<tbody></tbody>"), "não publicou");
  await rejects(
    () => parseListasPresenca(html(rawUrl, undefined, "31/02/2026")),
    "data válida",
  );
  await rejects(
    () => parseListasPresenca(html(rawUrl, "ATA DA SESSÃO ORDINÁRIA")),
    "não é lista",
  );
  await rejects(
    () =>
      parseListasPresenca(html(rawUrl, "LISTA PRESENÇA SESSÃO EXTRAORDINÁRIA")),
    "não é lista",
  );
  await rejects(
    () => urlPresenca("https://example.com/download/lista.pdf"),
    "fora da fonte",
  );
});
Deno.test("exige PDF real e conserva HTTP para diagnóstico do arquivo específico", async () => {
  const pdf = new Uint8Array(120);
  pdf.set(new TextEncoder().encode("%PDF-"));
  const fetched: string[] = [];
  const out = await baixarPdfPresenca(rawUrl, (url) => {
    fetched.push(String(url));
    return Promise.resolve(new Response(pdf));
  });
  equal([out.length, fetched[0]], [120, lista.pdfUrl]);
  await rejects(
    () =>
      baixarPdfPresenca(
        rawUrl,
        () => Promise.resolve(new Response("not found", { status: 404 })),
      ),
    "PDF HTTP 404",
  );
  await rejects(
    () =>
      baixarPdfPresenca(
        rawUrl,
        () => Promise.resolve(new Response("<html>erro</html>")),
      ),
    "não é PDF",
  );
});
Deno.test("JSON inválido, lista vazia, incerteza e data diferente nunca viram presença presumida", async () => {
  await rejects(
    () => parseResultadoPresencas("não foi possível ler", lista, vereadores),
    "JSON inválido",
  );
  await rejects(
    () => parseResultadoPresencas("[]", lista, vereadores),
    "lista completa",
  );
  const partial = payload();
  partial.presencas.pop();
  await rejects(
    () => parseResultadoPresencas(JSON.stringify(partial), lista, vereadores),
    "lista completa",
  );
  await rejects(
    () =>
      parseResultadoPresencas(
        JSON.stringify({ ...payload(), sessao_data: "2026-08-25" }),
        lista,
        vereadores,
      ),
    "data da sessão",
  );
  const uncertain = payload() as {
    sessao_data: string;
    presencas: { nome: string; presente: boolean | null }[];
  };
  uncertain.presencas[0].presente = null;
  await rejects(
    () => parseResultadoPresencas(JSON.stringify(uncertain), lista, vereadores),
    "incerta",
  );
});
Deno.test("aceita evidência explícita com nomes canônicos, sem matching pelo primeiro nome", async () => {
  const out = parseResultadoPresencas(
    JSON.stringify(payload()),
    lista,
    vereadores,
  );
  equal(out[2], {
    vereador_id: vereadores[2].id,
    vereador_nome: "Reginaldo Silva",
    presente: false,
  });
  const unknown = payload();
  unknown.presencas[0].nome = "Fernando";
  await rejects(
    () => parseResultadoPresencas(JSON.stringify(unknown), lista, vereadores),
    "desconhecido",
  );
  const duplicate = payload();
  duplicate.presencas[1] = duplicate.presencas[0];
  await rejects(
    () => parseResultadoPresencas(JSON.stringify(duplicate), lista, vereadores),
    "repetido",
  );
});
Deno.test("aliases do cadastro devem ser unívocos e abranger todos os vereadores configurados", async () => {
  equal(vereadores.length, 11);
  await rejects(
    () => resolverVereadoresPresenca(db.slice(1)),
    "correspondência única",
  );
  await rejects(
    () => resolverVereadoresPresenca([...db, db[0]]),
    "correspondência única",
  );
});
Deno.test("presenças pendentes não comprovam leitura da lista e cobertura verificada exige os 11 IDs", () => {
  const verified = vereadores.map((v) =>
    old({ vereador_id: v.id, vereador_nome: v.nome })
  );
  equal(sessaoJaVerificada(lista, verified, vereadores), true);
  equal(sessaoJaVerificada(lista, verified.slice(1), vereadores), false);
  equal(
    sessaoJaVerificada(
      lista,
      verified.map((v) => ({ ...v, status_verificacao: "pendente" })),
      vereadores,
    ),
    false,
  );
  equal(
    sessaoJaVerificada(
      lista,
      verified.map((v) => ({ ...v, sessao_data: "2026-08-25" })),
      vereadores,
    ),
    false,
  );
});
Deno.test("preserva confirmação humana e recusa colisão de título com outra data", async () => {
  const rows = parseResultadoPresencas(
    JSON.stringify(payload()),
    lista,
    vereadores,
  );
  const confirmed = [old({ status_verificacao: "confirmado" })];
  const out = protegerPresencasConfirmadas(lista, rows, confirmed, vereadores);
  equal(out.length, 10);
  equal(confirmed[0].status_verificacao, "confirmado");
  await rejects(
    () =>
      protegerPresencasConfirmadas(lista, rows, [
        old({ sessao_data: "2025-08-24" }),
      ], vereadores),
    "outra data",
  );
});
Deno.test("pedido de ensaio é explícito e corpo vazio preserva compatibilidade com cron", async () => {
  equal(parsePedidoPresencas(""), { dryRun: false, batchSize: 1 });
  equal(parsePedidoPresencas("   "), { dryRun: false, batchSize: 1 });
  equal(parsePedidoPresencas('{"dryRun":true}'), {
    dryRun: true,
    batchSize: 1,
  });
  equal(parsePedidoPresencas('{"batch_size":1}'), {
    dryRun: false,
    batchSize: 1,
  });
  for (const batch_size of [0, 11, 1.5, "1"]) {
    await rejects(
      () => parsePedidoPresencas(JSON.stringify({ batch_size })),
      "batch_size",
    );
  }
  await rejects(
    () => parsePedidoPresencas('{"dryRun":"false"}'),
    "Corpo inválido",
  );
});

Deno.test("cursor avança na execução seguinte mesmo se o primeiro PDF falha", () => {
  const second = {
    ...lista,
    pdfUrl: lista.pdfUrl.replace("LISTA.PDF", "SEGUNDA.PDF"),
  };
  const third = {
    ...lista,
    pdfUrl: lista.pdfUrl.replace("LISTA.PDF", "TERCEIRA.PDF"),
  };
  const entries = [lista, second, third];
  const run1 = selecionarLotePresencas(entries, entries, null, 1);
  equal(run1[0].pdfUrl, lista.pdfUrl);
  const persistedAfterFailure = run1[0].pdfUrl;
  const run2 = selecionarLotePresencas(
    entries,
    entries,
    persistedAfterFailure,
    1,
  );
  equal(run2[0].pdfUrl, second.pdfUrl);
  equal(
    selecionarLotePresencas(entries, [lista, third], second.pdfUrl, 1)[0]
      .pdfUrl,
    third.pdfUrl,
  );
  equal(
    selecionarLotePresencas(entries, [lista], third.pdfUrl, 1)[0].pdfUrl,
    lista.pdfUrl,
  );
});
Deno.test("11 confirmações com URL nula ou antiga ficam resolvidas sem IA, mesmo com ID nulo e alias exato", () => {
  const confirmed = vereadores.map((v, i) =>
    old({
      id: `old-${i}`,
      vereador_id: null,
      vereador_nome: v.nomeCompleto,
      status_verificacao: "confirmado",
      fonte_url: i % 2 ? null : "https://piracanjuba.go.leg.br/fonte-antiga",
    })
  );
  equal(sessaoJaVerificada(lista, confirmed, vereadores), true);
  const rows = parseResultadoPresencas(
    JSON.stringify(payload()),
    lista,
    vereadores,
  );
  equal(protegerPresencasConfirmadas(lista, rows, confirmed, vereadores), []);
});
Deno.test("reutiliza os 11 IDs e nomes completos legados, sem criar 11 chaves parlamentares novas", async () => {
  const legacy = vereadores.map((v, i) =>
    old({
      id: `old-${i}`,
      vereador_id: null,
      vereador_nome: v.nomeCompleto,
      status_verificacao: "pendente",
    })
  );
  const rows = parseResultadoPresencas(
    JSON.stringify(payload()),
    lista,
    vereadores,
  );
  const planned = protegerPresencasConfirmadas(lista, rows, legacy, vereadores);
  equal(planned.map((row) => row.id), legacy.map((row) => row.id));
  equal(
    planned.map((row) => row.vereador_nome),
    legacy.map((row) => row.vereador_nome),
  );
  const duplicated = [
    ...legacy,
    old({
      id: "duplicated",
      vereador_nome: vereadores[0].nome,
      status_verificacao: "ia",
    }),
  ];
  await rejects(
    () => protegerPresencasConfirmadas(lista, rows, duplicated, vereadores),
    "Mais de uma linha histórica",
  );
});
