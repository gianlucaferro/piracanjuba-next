import test from "node:test";
import assert from "node:assert/strict";
import {
  caminhoFipeV2,
  caminhoRotaFipe,
  parseConsultaFipe,
  parseOpcoesFipe,
  parsePrecoFipe,
  parseRespostaOpcoesFipe,
  parseRespostaPrecoFipe,
  rotuloAnoFipe,
  valorFipeEmReais,
} from "../src/lib/fipe.ts";

// Formato real da API FIPE v2, conferido em 2026-11-25.
const precoV2 = {
  vehicleType: 1,
  price: "R$ 29.180,00",
  brand: "VW - VolksWagen",
  model: "Gol (novo) 1.0 Mi Total Flex 8V 2p",
  modelYear: 2013,
  fuel: "Flex",
  codeFipe: "005345-7",
  referenceMonth: "novembro de 2026",
  fuelAcronym: "F",
};

test("consulta lê tipo, marca, modelo e ano dos segmentos da rota", () => {
  assert.deepEqual(parseConsultaFipe(["carros"]), { tipo: "carros", etapa: "marcas" });
  assert.deepEqual(parseConsultaFipe(["motos", "80"]), { tipo: "motos", etapa: "modelos", marca: "80" });
  assert.deepEqual(parseConsultaFipe(["caminhoes", "102", "5986"]), { tipo: "caminhoes", etapa: "anos", marca: "102", modelo: "5986" });
  assert.deepEqual(parseConsultaFipe(["carros", "59", "6280", "2013-5"]), {
    tipo: "carros", etapa: "preco", marca: "59", modelo: "6280", ano: "2013-5",
  });
  assert.deepEqual(parseConsultaFipe(["carros", "59", "6280", "32000-1"]), {
    tipo: "carros", etapa: "preco", marca: "59", modelo: "6280", ano: "32000-1",
  });
});

test("consulta recusa tipo, código ou quantidade de segmentos fora do padrão", () => {
  for (const partes of [
    [], ["onibus"], ["Carros"], ["cars"], ["toString"], ["__proto__"],
    ["carros", "abc"], ["carros", "-1"], ["carros", "1234567"], ["carros", "59", "62 80"],
    ["carros", "59", "6280", "2013"], ["carros", "59", "6280", "1890-1"], ["carros", "59", "6280", "2013-15"],
    ["carros", "59", "6280", "2013-5", "extra"], ["carros", "59/../1"],
  ]) {
    assert.equal(parseConsultaFipe(partes), null, JSON.stringify(partes));
  }
});

test("caminhos da API e da rota do site correspondem à consulta", () => {
  const preco = parseConsultaFipe(["carros", "59", "6280", "2013-5"])!;
  assert.equal(caminhoFipeV2(preco), "/cars/brands/59/models/6280/years/2013-5");
  assert.equal(caminhoRotaFipe(preco), "/api/fipe/carros/59/6280/2013-5");
  assert.equal(caminhoFipeV2(parseConsultaFipe(["motos"])!), "/motorcycles/brands");
  assert.equal(caminhoFipeV2(parseConsultaFipe(["caminhoes", "102"])!), "/trucks/brands/102/models");
  for (const partes of [["carros"], ["motos", "80"], ["caminhoes", "102", "5986"], ["carros", "59", "6280", "32000-1"]]) {
    const consulta = parseConsultaFipe(partes)!;
    assert.deepEqual(parseConsultaFipe(caminhoRotaFipe(consulta).split("/").slice(3)), consulta);
  }
});

test("marcas e modelos saem em ordem alfabética e anos do mais novo ao mais antigo", () => {
  assert.deepEqual(
    parseOpcoesFipe([{ code: "59", name: "VW - VolksWagen" }, { code: "1", name: "Acura" }, { code: 21, name: "Fiat" }], "marcas"),
    [{ codigo: "1", nome: "Acura" }, { codigo: "21", nome: "Fiat" }, { codigo: "59", nome: "VW - VolksWagen" }],
  );
  assert.deepEqual(
    parseOpcoesFipe([
      { code: "2013-5", name: "2013 Flex" },
      { code: "32000-1", name: "32000 Gasolina" },
      { code: "2014-5", name: "2014 Flex" },
      { code: "2014-1", name: "2014 Gasolina" },
    ], "anos").map((opcao) => opcao.nome),
    ["Zero km Gasolina", "2014 Flex", "2014 Gasolina", "2013 Flex"],
  );
  assert.equal(rotuloAnoFipe("32000 Flex"), "Zero km Flex");
  assert.equal(rotuloAnoFipe("2013 Flex"), "2013 Flex");
});

test("listas recusam formato inesperado, código repetido e nome vazio", () => {
  assert.throws(() => parseOpcoesFipe({}, "marcas"));
  assert.throws(() => parseOpcoesFipe([], "marcas"));
  assert.throws(() => parseOpcoesFipe(Array.from({ length: 3001 }, (_, i) => ({ code: String(i), name: `M${i}` })), "modelos"));
  assert.throws(() => parseOpcoesFipe([{ code: "59", name: "A" }, { code: "59", name: "B" }], "marcas"));
  assert.throws(() => parseOpcoesFipe([{ code: "59", name: "  " }], "marcas"));
  assert.throws(() => parseOpcoesFipe([{ code: "2013-5", name: "2013 Flex" }], "marcas"));
  assert.throws(() => parseOpcoesFipe([{ code: "59", name: "VW" }], "anos"));
  assert.throws(() => parseOpcoesFipe([{ code: "59", name: "x".repeat(161) }], "modelos"));
  assert.throws(() => parseOpcoesFipe(["59"], "marcas"));
});

test("preço converte o valor em reais e mantém código FIPE e mês de referência", () => {
  assert.deepEqual(parsePrecoFipe(precoV2), {
    valor: 29180,
    marca: "VW - VolksWagen",
    modelo: "Gol (novo) 1.0 Mi Total Flex 8V 2p",
    anoModelo: 2013,
    combustivel: "Flex",
    codigoFipe: "005345-7",
    mesReferencia: "novembro de 2026",
  });
  assert.equal(valorFipeEmReais("R$ 1.234.567,89"), 1234567.89);
  assert.equal(valorFipeEmReais("R$ 950,00"), 950);
  assert.equal(valorFipeEmReais("R$950,50"), 950.5);
});

test("preço recusa valor, ano ou código fora do formato", () => {
  for (const valor of ["29180", "R$ 29.180", "R$ 0,00", "R$ 29,180.00", "US$ 10,00", 29180]) {
    assert.throws(() => valorFipeEmReais(valor), String(valor));
  }
  assert.throws(() => parsePrecoFipe({ ...precoV2, modelYear: "2013" }));
  assert.throws(() => parsePrecoFipe({ ...precoV2, modelYear: 1850 }));
  assert.throws(() => parsePrecoFipe({ ...precoV2, codeFipe: "5345-7" }));
  assert.throws(() => parsePrecoFipe({ ...precoV2, brand: "" }));
  assert.throws(() => parsePrecoFipe([precoV2]));
});

test("contrato público da rota é validado no navegador", () => {
  const opcoes = [{ codigo: "59", nome: "VW - VolksWagen" }];
  assert.deepEqual(parseRespostaOpcoesFipe({ etapa: "marcas", opcoes }, "marcas"), opcoes);
  assert.throws(() => parseRespostaOpcoesFipe({ etapa: "modelos", opcoes }, "marcas"));
  assert.throws(() => parseRespostaOpcoesFipe({ etapa: "marcas", opcoes: [] }, "marcas"));
  assert.throws(() => parseRespostaOpcoesFipe({ etapa: "anos", opcoes }, "anos"));

  const preco = parsePrecoFipe(precoV2);
  assert.deepEqual(parseRespostaPrecoFipe(JSON.parse(JSON.stringify({ etapa: "preco", preco }))), preco);
  assert.throws(() => parseRespostaPrecoFipe({ etapa: "marcas", preco }));
  assert.throws(() => parseRespostaPrecoFipe({ etapa: "preco", preco: { ...preco, valor: "29180" } }));
  assert.throws(() => parseRespostaPrecoFipe({ etapa: "preco", preco: { ...preco, valor: -1 } }));
  assert.throws(() => parseRespostaPrecoFipe({ etapa: "preco", preco: { ...preco, codigoFipe: "x" } }));
});
