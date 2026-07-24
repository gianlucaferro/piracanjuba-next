/// <reference lib="deno.ns" />

import {
  compositeKey,
  documentDigits,
  normalizeAditivo,
  normalizeAto,
  normalizeContrato,
  normalizeDiaria,
  normalizeEmpenho,
  normalizeFiscalContrato,
  normalizeFolha,
  normalizePagamento,
  parseDate,
  parseDecimal,
} from "./nucleogov-normalize.ts";

function assertEquals(actual: unknown, expected: unknown, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${label}: expected ${JSON.stringify(expected)}, got ${
        JSON.stringify(actual)
      }`,
    );
  }
}

Deno.test("normaliza datas brasileiras e ISO", () => {
  assertEquals(parseDate("24/07/2026"), "2026-07-24", "data BR");
  assertEquals(parseDate("2026-07-24T10:00:00Z"), "2026-07-24", "data ISO");
  assertEquals(parseDate("invalida"), null, "data invalida");
});

Deno.test("normaliza valores monetarios do portal", () => {
  assertEquals(parseDecimal("769.990,00"), 769990, "valor com milhares");
  assertEquals(parseDecimal("3.300,000"), 3300, "valor com tres decimais");
  assertEquals(parseDecimal("Sigiloso"), null, "valor sigiloso");
});

Deno.test("preserva somente documentos com identificador util", () => {
  assertEquals(documentDigits("23.414.622/0001-61"), "23414622000161", "CNPJ");
  assertEquals(documentDigits("***.029.99*.**"), null, "CPF mascarado");
});

Deno.test("contrato usa id oficial e liga licitacao", () => {
  const row = normalizeContrato({
    id: 7643,
    numero: "64",
    ano: 2026,
    orgao: 22,
    orgao_nome: "PODER EXECUTIVO",
    licitacao_id: 10579,
    valor: "769.990,00",
    inicio_vigencia: "30/01/2026",
    fornecedor_nome: "FAROL LTDA",
    fornecedor_cpfcnpj: "23.414.622/0001-61",
  });
  assertEquals(row?.id, 7643, "id contrato");
  assertEquals(row?.licitacao_id, 10579, "id licitacao");
  assertEquals(
    row?.fornecedor_documento_digitos,
    "23414622000161",
    "CNPJ contrato",
  );
  assertEquals(row?.valor, 769990, "valor contrato");
});

Deno.test("diaria diferencia parcelas do mesmo registro", () => {
  const row = normalizeDiaria({
    id: 226809,
    id_empenho: 34690,
    favorecido: "RICARDO",
    valor: 675,
  });
  assertEquals(row?.chave, "226809:34690", "chave diaria");
  assertEquals(row?.empenho_id, 34690, "empenho diaria");
});

Deno.test("folha gera chave por competencia", () => {
  const row = normalizeFolha({
    id: 933,
    ano: "2026",
    mes: "6",
    nome: "Abadia de Fátima",
    tipo_folha: "MENSAL",
    tipo_movimentacao: "NORMAL",
    total_proventos: "4.499,17",
  });
  assertEquals(row?.chave, "2026|06|933|MENSAL|NORMAL", "chave folha");
  assertEquals(row?.nome_normalizado, "ABADIA DE FATIMA", "nome folha");
  assertEquals(row?.total_proventos, 4499.17, "proventos folha");
});

Deno.test("folha diferencia tipos de contracheque no mesmo mes", () => {
  const mensal = normalizeFolha({
    id: 933,
    ano: "2026",
    mes: "6",
    nome: "Abadia de Fátima",
    tipo_folha: "MENSAL",
    tipo_movimentacao: "NORMAL",
  });
  const complementar = normalizeFolha({
    id: 933,
    ano: "2026",
    mes: "6",
    nome: "Abadia de Fátima",
    tipo_folha: "COMPLEMENTAR",
    tipo_movimentacao: "NORMAL",
  });
  if (mensal?.chave === complementar?.chave) {
    throw new Error("tipos de folha distintos geraram a mesma chave");
  }
});

Deno.test("empenho preserva vinculo com licitacao", () => {
  const row = normalizeEmpenho({
    Id: 226132,
    Numero: "226132",
    Data: "30/06/2026",
    IdLicitacaoDispensaAdesao: "10579",
    ValorEmpenhado: "3.300,000",
  }, 22);
  assertEquals(row?.id, 226132, "id empenho");
  assertEquals(row?.licitacao_id, 10579, "licitacao empenho");
  assertEquals(row?.valor_empenhado, 3300, "valor empenho");
});

Deno.test("aditivo preserva contrato, credor e valor", () => {
  const row = normalizeAditivo({
    id: 9123,
    contrato: 7643,
    termo: 2,
    ano: 2026,
    tipo: "ADITIVO",
    tipo_aditivo: "PRAZO E VALOR",
    data_termo: "10/06/2026",
    valor: "12.345,67",
    credor: "EMPRESA TESTE LTDA",
    cpf_cnpj: "23.414.622/0001-61",
  });
  assertEquals(row?.id, 9123, "id aditivo");
  assertEquals(row?.contrato_id, 7643, "contrato aditivo");
  assertEquals(row?.valor, 12345.67, "valor aditivo");
  assertEquals(
    row?.credor_documento_digitos,
    "23414622000161",
    "CNPJ aditivo",
  );
  assertEquals(normalizeAditivo({ id: 1 }), null, "aditivo sem contrato");
});

Deno.test("fiscal usa contrato oficial e diferencia responsaveis", () => {
  const row = normalizeFiscalContrato({
    chave: 7643,
    fiscal_contrato: "José da Silva",
    contrato: "Contrato 64/2026",
    numero: "64",
    ano: 2026,
    orgao_id: 1,
    orgao: "PODER EXECUTIVO",
  });
  assertEquals(row?.portal_key, 7643, "contrato fiscal");
  assertEquals(row?.chave, "7643|JOSE DA SILVA", "chave fiscal");
  assertEquals(
    normalizeFiscalContrato({ fiscal_contrato: "José" }),
    null,
    "fiscal sem chave",
  );
});

Deno.test("pagamento preserva empenho, fornecedor e datas", () => {
  const row = normalizePagamento({
    numero_empenho: "226132",
    fornecedor: "EMPRESA TESTE LTDA",
    cpf_cnpj: "23.414.622/0001-61",
    data_atesto: "20/07/2026",
    data_pagamento: "22/07/2026",
    valor_pago: "10.500,25",
    orgao: "PODER EXECUTIVO",
  });
  assertEquals(row?.numero_empenho, "226132", "empenho pagamento");
  assertEquals(row?.data_pagamento, "2026-07-22", "data pagamento");
  assertEquals(row?.valor_pago, 10500.25, "valor pagamento");
  assertEquals(normalizePagamento({}), null, "pagamento incompleto");
});

Deno.test("ato preserva tipo, publicacao e documento", () => {
  const row = normalizeAto({
    chave: "kRYP$Z58teX",
    numero: "DECRETO N 304/2026",
    data_publicacao: "20/07/2026",
    ementa: "NOMEIA PARA OCUPAR CARGO COMISSIONADO",
    tipo_id: 1,
    tipo: "DECRETOS",
    url: "https://example.test/decreto.pdf",
  });
  assertEquals(row?.chave, "kRYP$Z58teX", "chave ato");
  assertEquals(row?.data_publicacao, "2026-07-20", "data ato");
  assertEquals(row?.tipo, "DECRETOS", "tipo ato");
  assertEquals(normalizeAto({ numero: "1" }), null, "ato sem chave");
});

Deno.test("chaves compostas sao estaveis e normalizadas", () => {
  assertEquals(
    compositeKey(["  José da Silva ", "01/01/2026", "1.000,00"]),
    "JOSE DA SILVA|01/01/2026|1.000,00",
    "chave composta",
  );
});
