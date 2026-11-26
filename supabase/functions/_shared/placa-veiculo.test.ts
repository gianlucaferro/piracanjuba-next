/// <reference lib="deno.ns" />

import { dadosVeiculoDaPlaca, melhorFipeDaPlaca } from "./placa-veiculo.ts";

function assertEquals(actual: unknown, expected: unknown, label = "valor") {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// Formato da documentação da API Placas (apiplacas.com.br/doc.php), conferido em 2026-11-26.
const resposta = {
  MARCA: "VW",
  MODELO: "CROSSFOX",
  ano: "2007",
  anoModelo: "2007",
  chassi: "*****10137",
  cor: "Prata",
  extra: {
    ano_fabricacao: "2007",
    ano_modelo: "2007",
    cilindradas: "1599",
    combustivel: "Alcool / Gasolina",
    municipio: "SAO LEOPOLDO",
    placa: "INT8236",
    tipo_doc_prop: "Fisica",
    tipo_veiculo: "Automovel",
  },
  fipe: {
    dados: [
      {
        ano_modelo: "2007",
        codigo_fipe: "005225-6",
        codigo_marca: 59,
        codigo_modelo: "2368",
        combustivel: "Gasolina",
        score: 101,
        texto_valor: "R$ 28.799,00",
        tipo_modelo: 1,
      },
    ],
  },
  placa: "INT8C36",
  municipio: "São Leopoldo",
};

Deno.test("lê o candidato FIPE com os códigos da tabela", () => {
  assertEquals(melhorFipeDaPlaca(resposta), {
    tipo: "carros",
    marca: "59",
    modelo: "2368",
    anoModelo: 2007,
    codigoFipe: "005225-6",
    combustivel: "Gasolina",
  });
});

Deno.test("escolhe o candidato de maior score e ignora os incompletos", () => {
  const fipe = melhorFipeDaPlaca({
    fipe: {
      dados: [
        { ano_modelo: "2020", codigo_fipe: "001111-1", codigo_marca: 21, codigo_modelo: "10", score: 40, tipo_modelo: 1 },
        { ano_modelo: "2020", codigo_fipe: "invalido", codigo_marca: 21, codigo_modelo: "11", score: 999, tipo_modelo: 1 },
        { ano_modelo: "2020", codigo_fipe: "002222-2", codigo_marca: 21, codigo_modelo: "12", score: 90, tipo_modelo: 2 },
        { ano_modelo: "2020", codigo_fipe: "003333-3", codigo_marca: 21, codigo_modelo: "13", score: 95, tipo_modelo: 7 },
      ],
    },
  });
  assertEquals(fipe, { tipo: "motos", marca: "21", modelo: "12", anoModelo: 2020, codigoFipe: "002222-2" });
});

Deno.test("sem bloco fipe, ou com ano fora do intervalo, não há candidato", () => {
  assertEquals(melhorFipeDaPlaca({ MARCA: "VW" }), null, "sem fipe");
  assertEquals(melhorFipeDaPlaca(null), null, "nulo");
  assertEquals(
    melhorFipeDaPlaca({ fipe: { dados: [{ ano_modelo: "1850", codigo_fipe: "005225-6", codigo_marca: 59, codigo_modelo: "2368", tipo_modelo: 1 }] } }),
    null,
    "ano inválido",
  );
  assertEquals(
    melhorFipeDaPlaca({ fipe: { dados: [{ ano_modelo: 32000, codigo_fipe: "005225-6", codigo_marca: "059", codigo_modelo: "2368", tipo_modelo: "3" }] } }),
    { tipo: "caminhoes", marca: "59", modelo: "2368", anoModelo: 32000, codigoFipe: "005225-6" },
    "zero km",
  );
});

Deno.test("dados do veículo não levam placa, chassi, município nem proprietário", () => {
  const dados = dadosVeiculoDaPlaca(resposta);
  assertEquals(dados, {
    marca: "VW",
    modelo: "CROSSFOX",
    ano: "2007",
    ano_modelo: "2007",
    cor: "Prata",
    combustivel: "Alcool / Gasolina",
    tipo_veiculo: "Automovel",
    cilindradas: "1599",
  });
  const texto = JSON.stringify(dados);
  for (const proibido of ["INT8", "10137", "LEOPOLDO", "Leopoldo", "Fisica"]) {
    if (texto.includes(proibido)) throw new Error(`vazou ${proibido}`);
  }
});
