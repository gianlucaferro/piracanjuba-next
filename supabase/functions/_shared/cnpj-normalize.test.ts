/// <reference lib="deno.ns" />

import { normalizeCnpjResponse } from "./cnpj-normalize.ts";

function assertEquals(actual: unknown, expected: unknown, label = "valor") {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${label}: expected ${JSON.stringify(expected)}, got ${
        JSON.stringify(actual)
      }`,
    );
  }
}

Deno.test("normaliza resposta BrasilAPI com QSA", () => {
  const row = normalizeCnpjResponse("01.234.567/0001-89", {
    razao_social: "EMPRESA TESTE LTDA",
    nome_fantasia: "EMPRESA TESTE",
    data_inicio_atividade: "2024-01-12",
    descricao_situacao_cadastral: "ATIVA",
    capital_social: 15000,
    cnae_fiscal: 6201501,
    qsa: [{ nome_socio: "PESSOA TESTE", qualificacao_socio: "Socio" }],
  });

  assertEquals(row?.cnpj, "01234567000189");
  assertEquals(row?.data_abertura, "2024-01-12");
  assertEquals(row?.capital_social, 15000);
  assertEquals(row?.socios.length, 1);
});

Deno.test("normaliza resposta alternativa e data brasileira", () => {
  const row = normalizeCnpjResponse("11222333000144", {
    nome: "OUTRA EMPRESA",
    fantasia: "OUTRA",
    abertura: "02/03/2018",
    situacao: "ATIVA",
    capital_social: "10.500,25",
    socios: [{ nome: "SOCIO UM", qual: "Administrador" }],
  });

  assertEquals(row?.razao_social, "OUTRA EMPRESA");
  assertEquals(row?.data_abertura, "2018-03-02");
  assertEquals(row?.capital_social, 10500.25);
  assertEquals(row?.socios[0].nome, "SOCIO UM");
});

Deno.test("normaliza o formato real do OpenCNPJ", () => {
  const row = normalizeCnpjResponse("33000167000101", {
    razao_social: "PETROLEO BRASILEIRO S A PETROBRAS",
    porte_empresa: "Demais",
    tipo_logradouro: "Avenida",
    logradouro: "Republica do Chile",
    numero: "65",
    telefones: [{ ddd: "21", numero: "21660000", is_fax: false }],
    QSA: [{
      nome_socio: "PESSOA TESTE",
      cnpj_cpf_socio: "***077120**",
      qualificacao_socio: "Diretor",
    }],
  });

  assertEquals(row?.porte, "Demais");
  assertEquals(row?.telefone, "2121660000");
  assertEquals(row?.socios.length, 1);
  assertEquals(row?.socios[0].cnpj_cpf_do_socio, "***077120**");
});

Deno.test("rejeita documento invalido ou resposta sem razao social", () => {
  assertEquals(normalizeCnpjResponse("123", { razao_social: "X" }), null);
  assertEquals(normalizeCnpjResponse("11222333000144", {}), null);
});
