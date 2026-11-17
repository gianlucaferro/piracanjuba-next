import assert from "node:assert/strict";
import test from "node:test";
import {
  PLANTAO_FARMACIAS,
  aplicarContatoCadastrado,
  criarBuscaPorNome,
  descreverPlantao,
  formatPeriodoCompleto,
  formatPeriodoEscala,
  gerarTextoCompartilhamento,
  getPeriodo,
  getSemanaAtual,
  getSemanaVigente,
  getShareWhatsAppLink,
  getTelefoneLink,
  getWazeLink,
  organizarEscala,
  type ContatoCadastrado,
  type Farmacia,
} from "../src/data/plantaoFarmacias.ts";

const indice = (inicio: string) => PLANTAO_FARMACIAS.findIndex((semana) => semana.inicio === inicio);
const inicioDe = (idx: number | null) => (idx === null ? null : PLANTAO_FARMACIAS[idx].inicio);

test("escala atualizada destaca Vitae em 2026-09-05 e mantém a ordem das demais", () => {
  const idx = PLANTAO_FARMACIAS.findIndex((semana) => semana.inicio === "2026-09-05");
  const semana = PLANTAO_FARMACIAS[idx];
  assert.equal(semana.farmacia24h?.nome, "Drogaria Vitae");
  assert.deepEqual(semana.demais.map((farmacia) => farmacia.nome), [
    "Drogaria São Sebastião", "Drogamais", "Drogaria Do Lar", "Drogaria JM Popular",
  ]);
  assert.deepEqual(getPeriodo(semana, PLANTAO_FARMACIAS[idx + 1]), {
    de: "5 de setembro", ate: "11 de setembro",
  });
  const texto = gerarTextoCompartilhamento(semana, PLANTAO_FARMACIAS[idx + 1]);
  assert.match(texto, /Farmácia 24h:\*\nDrogaria Vitae\n/);
  assert.doesNotMatch(texto, /undefined|null/);
});

test("semana sem indicação 24h conserva as cinco farmácias sem inventar responsável", () => {
  const semana = PLANTAO_FARMACIAS[0];
  assert.equal(semana.inicio, "2026-03-14");
  assert.equal(semana.farmacia24h, null);
  assert.equal(semana.demais.length, 5);
  const texto = gerarTextoCompartilhamento(semana, PLANTAO_FARMACIAS[1]);
  assert.match(texto, /Farmácia 24h não informada nesta escala/);
  for (const farmacia of semana.demais) assert.ok(texto.includes(farmacia.nome));
});

test("telefone não informado não cria contato inválido; contatos existentes continuam válidos", () => {
  assert.equal(getTelefoneLink({ nome: "Drogaria Vitae", telefone: "", tipo: "fixo" }), null);
  assert.equal(getTelefoneLink({ nome: "Teste", telefone: "(64) 3405-1734", tipo: "fixo" }), "tel:+556434051734");
  assert.ok(getTelefoneLink({ nome: "Teste", telefone: "(64) 99265-4341", tipo: "whatsapp" })?.startsWith("https://wa.me/5564992654341?text="));
});

test("Hiper Pop, Vitae e São Marcos abrem no Waze nos pinos conferidos em 2026-11-17", () => {
  assert.equal(
    getWazeLink({ nome: "Drogaria Hiper Pop", telefone: "", tipo: "fixo" }),
    "https://waze.com/ul?ll=-17.3041424,-49.021731&navigate=yes&zoom=17",
  );
  assert.equal(
    getWazeLink({ nome: "Drogaria Vitae", telefone: "", tipo: "fixo" }),
    "https://waze.com/ul?ll=-17.3007166,-49.0202679&navigate=yes&zoom=17",
  );
  assert.equal(
    getWazeLink({ nome: "Drogaria São Marcos", telefone: "", tipo: "fixo" }),
    "https://waze.com/ul?ll=-17.304972,-49.0252867&navigate=yes&zoom=17",
  );
});

test("toda farmácia da escala tem coordenadas para o Waze", () => {
  const nomes = new Set(
    PLANTAO_FARMACIAS.flatMap((semana) => [semana.farmacia24h, ...semana.demais])
      .filter((farmacia) => farmacia != null)
      .map((farmacia) => farmacia.nome),
  );
  const semWaze = [...nomes].filter((nome) => !getWazeLink({ nome, telefone: "", tipo: "fixo" }));
  assert.deepEqual(semWaze, []);
});

test("semana vira à meia-noite de Brasília mesmo com o servidor em UTC (Vercel)", () => {
  const tzOriginal = process.env.TZ;
  process.env.TZ = "UTC";
  try {
    // 2026-11-13 22:00 em Brasília (2026-11-14 01:00 UTC): ainda é a semana de 2026-11-07.
    const sextaNoite = new Date("2026-11-14T01:00:00Z");
    assert.equal(inicioDe(getSemanaAtual(sextaNoite)), "2026-11-07");
    assert.equal(inicioDe(getSemanaVigente(sextaNoite)), "2026-11-07");
    // 2026-11-14 00:30 em Brasília (03:30 UTC): já é a semana nova.
    const sabadoMadrugada = new Date("2026-11-14T03:30:00Z");
    assert.equal(inicioDe(getSemanaAtual(sabadoMadrugada)), "2026-11-14");
    assert.equal(inicioDe(getSemanaVigente(sabadoMadrugada)), "2026-11-14");
  } finally {
    if (tzOriginal === undefined) delete process.env.TZ;
    else process.env.TZ = tzOriginal;
  }
});

test("fora da escala a semana vigente é nula; getSemanaAtual ainda devolve a última semana", () => {
  const depoisDoFim = new Date("2027-03-10T15:00:00Z");
  assert.equal(getSemanaVigente(depoisDoFim), null);
  assert.equal(getSemanaAtual(depoisDoFim), PLANTAO_FARMACIAS.length - 1);
  const antesDoInicio = new Date("2026-03-01T15:00:00Z");
  assert.equal(getSemanaVigente(antesDoInicio), null);
  assert.equal(getSemanaAtual(antesDoInicio), 0);
});

test("home e página param de mostrar plantão quando a escala acaba (2027-02-27 em Brasília)", () => {
  // A última semana da escala começa em 2027-02-20; a home usa getSemanaVigente desde
  // 2026-11-17 e mostra o aviso de fora da escala em vez de repetir essa semana.
  const ultimoDia = new Date("2027-02-27T02:59:00Z"); // 2027-02-26 23:59 em Brasília
  assert.equal(inicioDe(getSemanaVigente(ultimoDia)), "2027-02-20");
  const diaSeguinte = new Date("2027-02-27T03:00:00Z"); // 2027-02-27 00:00 em Brasília
  assert.equal(getSemanaVigente(diaSeguinte), null);
  assert.equal(organizarEscala(diaSeguinte).atual, null);
});

test("período com ano cobre mesmo mês, virada de mês e virada de ano", () => {
  const p = (inicio: string) => formatPeriodoCompleto(PLANTAO_FARMACIAS[indice(inicio)], PLANTAO_FARMACIAS[indice(inicio) + 1]);
  assert.equal(p("2026-11-14"), "14 a 20 de novembro de 2026");
  assert.equal(p("2026-11-28"), "28 de novembro a 4 de dezembro de 2026");
  assert.equal(p("2026-12-26"), "26 de dezembro de 2026 a 1 de janeiro de 2027");
  assert.equal(p("2027-02-20"), "20 a 26 de fevereiro de 2027");
  assert.equal(formatPeriodoEscala(0, PLANTAO_FARMACIAS.length - 1), "14 de março de 2026 a 26 de fevereiro de 2027");
});

test("página põe a semana atual e a próxima no topo, as seguintes depois e as anteriores no fim", () => {
  const escala = organizarEscala(new Date("2026-11-17T15:00:00Z"));
  assert.equal(escala.hoje, "2026-11-17");
  assert.equal(inicioDe(escala.atual), "2026-11-14");
  assert.equal(inicioDe(escala.proxima), "2026-11-21");
  assert.equal(inicioDe(escala.futuras[0]), "2026-11-28");
  assert.equal(inicioDe(escala.futuras.at(-1) ?? null), "2027-02-20");
  assert.equal(inicioDe(escala.anteriores[0]), "2026-11-07");
  assert.equal(inicioDe(escala.anteriores.at(-1) ?? null), "2026-03-14");
  assert.equal(2 + escala.futuras.length + escala.anteriores.length, PLANTAO_FARMACIAS.length);

  const depoisDoFim = organizarEscala(new Date("2027-03-10T15:00:00Z"));
  assert.equal(depoisDoFim.atual, null);
  assert.equal(depoisDoFim.proxima, null);
  assert.deepEqual(depoisDoFim.futuras, []);
  assert.equal(depoisDoFim.anteriores.length, PLANTAO_FARMACIAS.length);
});

test("frase-resposta traz período com ano, farmácia 24h e contatos de todas", () => {
  const idx = indice("2026-11-14");
  assert.equal(
    descreverPlantao(PLANTAO_FARMACIAS[idx], PLANTAO_FARMACIAS[idx + 1]),
    "De 14 a 20 de novembro de 2026, a farmácia de plantão 24 horas em Piracanjuba é a Drogamais, WhatsApp (64) 99265-4341. " +
      "Também estão de plantão: Drogaria São Sebastião, telefone (64) 3405-1734; Drogaria Do Lar, telefone (64) 3405-1448; " +
      "Drogaria JM Popular, WhatsApp (64) 99203-0312; Drogaria Vitae, telefone não informado na escala.",
  );
  const semAviso24h = descreverPlantao(PLANTAO_FARMACIAS[0], PLANTAO_FARMACIAS[1]);
  assert.match(semAviso24h, /^De 14 a 20 de março de 2026, a escala não indica farmácia 24 horas em Piracanjuba\. Estão de plantão: /);
  assert.doesNotMatch(semAviso24h, /undefined|null/);
});

test("contato cadastrado (farmacia_fotos) tem precedência e casa nome com ou sem acento", () => {
  const buscar = criarBuscaPorNome<ContatoCadastrado>([
    { nome: "drogaria vitae", telefone: "(64) 99999-0000", tipo_telefone: null },
    { nome: "Drogaria São Sebastião", telefone: " ", tipo_telefone: "fixo" },
  ]);
  const vitae = { nome: "Drogaria Vitae", telefone: "", tipo: "fixo" } as const;
  assert.deepEqual(aplicarContatoCadastrado(vitae, buscar(vitae.nome)), {
    nome: "Drogaria Vitae", telefone: "(64) 99999-0000", tipo: "whatsapp",
  });
  const saoSebastiao = { nome: "Drogaria Sao Sebastiao", telefone: "(64) 3405-1734", tipo: "fixo" } as const;
  assert.equal(aplicarContatoCadastrado(saoSebastiao, buscar(saoSebastiao.nome)), saoSebastiao);
  assert.equal(buscar("Farmácia inexistente"), undefined);
});

test("compartilhar no WhatsApp leva o contato cadastrado que a tela mostra; sem cadastro, o da escala", () => {
  const idx = indice("2026-11-14");
  const semana = PLANTAO_FARMACIAS[idx];
  const seguinte = PLANTAO_FARMACIAS[idx + 1];
  const buscar = criarBuscaPorNome<ContatoCadastrado>([
    { nome: "Drogamais", telefone: "(64) 3405-0000", tipo_telefone: "fixo" },
    { nome: "drogaria vitae", telefone: "(64) 99999-0000", tipo_telefone: null },
  ]);
  const resolver = (farmacia: Farmacia) => aplicarContatoCadastrado(farmacia, buscar(farmacia.nome));

  const texto = gerarTextoCompartilhamento(semana, seguinte, resolver);
  // Farmácia 24h e demais saem com o telefone cadastrado, como nas linhas da página.
  assert.match(texto, /Farmácia 24h:\*\nDrogamais: \(64\) 3405-0000\n/);
  assert.ok(texto.includes("• Drogaria Vitae: (64) 99999-0000\n"));
  assert.ok(!texto.includes("99265-4341"), "telefone da escala da Drogamais não pode sobrar na mensagem");
  // Sem cadastro, continua o telefone da escala.
  assert.ok(texto.includes("• Drogaria São Sebastião: (64) 3405-1734\n"));
  assert.ok(texto.includes("• Drogaria JM Popular: (64) 99203-0312\n"));
  // O link codifica exatamente esse texto.
  assert.equal(getShareWhatsAppLink(semana, seguinte, resolver), `https://wa.me/?text=${encodeURIComponent(texto)}`);

  // Sem resolver, a mensagem é a da escala.
  const daEscala = gerarTextoCompartilhamento(semana, seguinte);
  assert.match(daEscala, /Farmácia 24h:\*\nDrogamais: \(64\) 99265-4341\n/);
  assert.ok(daEscala.includes("• Drogaria Vitae\n"));
  assert.equal(getShareWhatsAppLink(semana, seguinte), `https://wa.me/?text=${encodeURIComponent(daEscala)}`);

  // Semana sem 24h informado: o aviso continua e as demais também passam pelo resolver.
  const semAviso24h = gerarTextoCompartilhamento(PLANTAO_FARMACIAS[0], PLANTAO_FARMACIAS[1], resolver);
  assert.match(semAviso24h, /Farmácia 24h não informada nesta escala/);
  assert.ok(semAviso24h.includes("• Drogamais: (64) 3405-0000\n"));
  assert.ok(semAviso24h.includes("• Drogaria Vitae: (64) 99999-0000"));
});
