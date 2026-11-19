import assert from "node:assert/strict";
import test from "node:test";
import {
  BAIRROS_COLETA,
  COLETA_COMUM,
  COLETA_SELETIVA,
  DIAS_COLETA,
  SEM_DIA_NA_TABELA,
  descreverDias,
  diasDoBairro,
  faqColetaJsonLd,
  perguntasColeta,
  respostaColeta,
  resumoColeta,
  tabelaColeta,
} from "../src/data/coletaLixo.ts";

const TRAVESSOES = /[–—]/;

// Lista que o buscador exibia antes da mudança (EXEMPLOS em ColetaLixoClient.tsx).
const BAIRROS_ANTIGOS = [
  "Aeroporto","Aeroporto Sul","Av. Expedicionário","BNH","Bueno","Cachoeira","Cargil","Cascalho","Centro","Conjunto Pouso Alto","Contêineres","Corredor do Homero","Country Club","Ely Rocha","Estiva","Filismina","Grão Dourado","Jardim dos Buritis","Jardim Europa","Jardim Goiás 1 e 2","Jardim Primavera","Pecuária","Piracanjuba","Pouso Alto","Primavera","Recanto do Bosque","Rochedo","São Francisco de Assis","São Vicente de Paula","Sebastião de Oliveira","Setor Boa Vista","Setor das Orquídeas","Setor Fernandes","Setor Lima","Setor Magalhães","Setor Norte","Setor Oeste","Setor Parque Machado","Setor Planalto","Setor Roberto","Silo da COAPIL","Vila União",
];

test("a lista de bairros é a mesma que o buscador já exibia (42)", () => {
  assert.equal(BAIRROS_COLETA.length, 42);
  assert.deepEqual([...BAIRROS_COLETA].sort(), [...BAIRROS_ANTIGOS].sort());
});

test("a tabela por bairro é a inversa exata das listas por dia (nada inventado, nada perdido)", () => {
  const linhas = tabelaColeta();
  for (const [tabela, campo] of [[COLETA_COMUM, "comum"], [COLETA_SELETIVA, "seletiva"]] as const) {
    const pares = new Set<string>();
    for (const dia of DIAS_COLETA) for (const bairro of tabela[dia] ?? []) pares.add(`${bairro}|${dia}`);
    const daTabela = new Set(linhas.flatMap((linha) => linha[campo].map((dia) => `${linha.bairro}|${dia}`)));
    assert.deepEqual([...daTabela].sort(), [...pares].sort(), campo);
  }
});

test("dias por nome exato: Primavera e Jardim Primavera não se misturam mais", () => {
  assert.deepEqual(diasDoBairro("Primavera", COLETA_SELETIVA), ["Quinta-feira"]);
  assert.deepEqual(diasDoBairro("Jardim Primavera", COLETA_SELETIVA), ["Terça-feira"]);
  assert.deepEqual(diasDoBairro("Centro", COLETA_COMUM), [...DIAS_COLETA]);
  assert.deepEqual(diasDoBairro("Centro", COLETA_SELETIVA), ["Segunda-feira", "Sexta-feira"]);
  assert.deepEqual(diasDoBairro("Bairro inexistente", COLETA_COMUM), []);
});

test("descreverDias resume sequências e lista dias soltos", () => {
  assert.equal(descreverDias(["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"]), "segunda a sexta");
  assert.equal(descreverDias([...DIAS_COLETA]), "segunda a sábado");
  assert.equal(descreverDias(["Terça-feira", "Sexta-feira"]), "terça e sexta");
  assert.equal(descreverDias(["Segunda-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"]), "segunda, quarta, quinta e sexta");
  assert.equal(descreverDias(["Sábado"]), "sábado");
  assert.equal(descreverDias(["Segunda-feira", "Terça-feira"]), "segunda e terça");
  assert.equal(descreverDias([]), "");
});

test("contagens do resumo batem com as listas", () => {
  const r = resumoColeta();
  assert.equal(r.total, 42);
  assert.equal(r.segundaASexta.length, 29);
  assert.deepEqual(r.segundaASabado.map((l) => l.bairro), ["Centro"]);
  assert.deepEqual(r.soSabado.map((l) => l.bairro), ["Av. Expedicionário", "Cachoeira", "Cargil", "Contêineres", "Grão Dourado", "Rochedo", "Silo da COAPIL"]);
  assert.deepEqual(r.outrosComum.map((l) => l.bairro), ["Conjunto Pouso Alto", "Corredor do Homero", "Jardim Goiás 1 e 2", "Pecuária", "Recanto do Bosque"]);
  assert.equal(r.segundaASexta.length + r.segundaASabado.length + r.soSabado.length + r.outrosComum.length, r.total);
  assert.equal(r.seletivaUmDia.length, 31);
  assert.deepEqual(r.seletivaMaisDias.map((l) => l.bairro), ["Centro"]);
  assert.deepEqual(r.semSeletiva.map((l) => l.bairro), [
    "Av. Expedicionário", "Cachoeira", "Cargil", "Conjunto Pouso Alto", "Contêineres",
    "Corredor do Homero", "Grão Dourado", "Pecuária", "Rochedo", "Silo da COAPIL",
  ]);
  const semSeletiva = tabelaColeta().filter((l) => l.seletivaTexto === SEM_DIA_NA_TABELA);
  assert.equal(semSeletiva.length, 10);
  assert.ok(tabelaColeta().every((l) => l.comum.length > 0), "todo bairro da tabela tem coleta comum");
});

test("parágrafo-resposta tem número, dia, horário, saco e fonte datada, sem afirmar 2026", () => {
  const texto = respostaColeta();
  assert.match(texto, /^Pelo cronograma divulgado pela Prefeitura de Piracanjuba \(GO\) em 2025/);
  assert.match(texto, /29 dos 42 bairros/);
  assert.match(texto, /Coleta também no sábado: Centro \(de segunda a sábado\) e 7 localidades/);
  assert.match(texto, /31 bairros; o Centro tem dois dias \(segunda e sexta\); 10 localidades/);
  assert.match(texto, /18h do dia anterior/);
  assert.match(texto, /saco preto/);
  assert.match(texto, /Fonte: cronograma divulgado pela Prefeitura Municipal de Piracanjuba em 2025; a validade em 2026 ainda não foi confirmada/);
  assert.doesNotMatch(texto, TRAVESSOES);
});

test("FAQ visível e JSON-LD FAQPage têm exatamente o mesmo texto", () => {
  const perguntas = perguntasColeta();
  const schema = faqColetaJsonLd(perguntas, "https://piracanjuba.ai/coleta-lixo");
  assert.equal(schema["@type"], "FAQPage");
  assert.equal(schema.mainEntity.length, perguntas.length);
  schema.mainEntity.forEach((item, i) => {
    assert.equal(item["@type"], "Question");
    assert.equal(item.name, perguntas[i].pergunta);
    assert.equal(item.acceptedAnswer["@type"], "Answer");
    assert.equal(item.acceptedAnswer.text, perguntas[i].resposta);
  });
  for (const p of perguntas) {
    assert.doesNotMatch(`${p.pergunta} ${p.resposta}`, TRAVESSOES);
    assert.ok(p.resposta.length > 20);
  }
  const centro = perguntas.find((p) => p.pergunta.includes("Centro"));
  assert.equal(
    centro?.resposta,
    "No Centro, a coleta de lixo comum passa de segunda a sábado e a coleta seletiva passa toda segunda e toda sexta, segundo o cronograma divulgado pela Prefeitura Municipal de Piracanjuba em 2025.",
  );
  const validade = perguntas.find((p) => p.pergunta.includes("2026"));
  assert.match(validade?.resposta ?? "", /ainda não confirmou/);
});
