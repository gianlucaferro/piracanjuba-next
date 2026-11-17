import assert from "node:assert/strict";
import test from "node:test";
import {
  SUBSIDIO_NAO_INFORMADO,
  descreverSubsidio,
  remuneracoesComPagamento,
  resumirSubsidio,
  subsidioMaisRecente,
  temSubsidio,
  type LinhaRemuneracao,
} from "../src/app/vereadores/remuneracao.ts";
import { perfilDe, tratamentoParlamentar, urlBiografiaCamara } from "../src/app/vereadores/tratamento.ts";

const linha = (
  competencia: string,
  bruto: number | string | null,
  liquido: number | string | null,
  subsidio_referencia: number | string | null,
): LinhaRemuneracao => ({ competencia, bruto, liquido, subsidio_referencia });

// Valores da folha de um vereador em produção (perfil conferido em 2026-11-17).
const folha = [
  linha("2025-01", 0, 0, 9357),
  linha("2026-06", 9721.92, 7240.78, 9721.92),
  linha("2026-07", 12962.56, 9590.24, 9721.92),
  linha("2026-02", 9357, 6976.21, 9357),
];

test("competência zerada não aparece e a lista fica da mais recente para a mais antiga", () => {
  const validas = remuneracoesComPagamento(folha);
  assert.deepEqual(validas.map((l) => l.competencia), ["2026-07", "2026-06", "2026-02"]);
  assert.equal(remuneracoesComPagamento([linha("2025-01", null, "0", 9357)]).length, 0);
});

test("subsídio vem de subsidio_referencia, não do bruto com terço de férias", () => {
  const resumo = resumirSubsidio(folha);
  assert.deepEqual(resumo, { competencia: "2026-07", valores: [9721.92] });
  assert.equal(descreverSubsidio(resumo!).replace(/\s/g, " "), "é R$ 9.721,92");
});

test("subsídios diferentes na mesma competência viram faixa; sem folha, sem frase", () => {
  const resumo = resumirSubsidio([
    linha("2026-07", 9721.92, 7000, 9721.92),
    linha("2026-07", 11000, 8000, "11000.00"),
    linha("2026-07", 0, 0, 15000),
  ]);
  assert.deepEqual(resumo?.valores, [9721.92, 11000]);
  assert.equal(
    descreverSubsidio(resumo!).replace(/\s/g, " "),
    "varia de R$ 9.721,92 a R$ 11.000,00",
  );
  assert.equal(resumirSubsidio([linha("2025-01", 0, 0, 9357)]), null);
  assert.equal(resumirSubsidio([]), null);
});

test("tratamento segue a biografia oficial da Câmara e usa forma neutra sem dado", () => {
  assert.equal(tratamentoParlamentar("aparecida-divani"), "Vereadora");
  assert.equal(tratamentoParlamentar("adriana-pinheiro"), "Vereadora");
  assert.equal(tratamentoParlamentar("sirley-wehbe"), "Vereadora");
  assert.equal(tratamentoParlamentar("edimar-lopes"), "Vereador");
  assert.equal(tratamentoParlamentar("slug-novo"), "Vereador(a)");
  assert.equal(tratamentoParlamentar(null), "Vereador(a)");
  assert.equal(perfilDe("Vereadora"), "da vereadora");
  assert.equal(perfilDe("Vereador"), "do vereador");
  assert.equal(perfilDe("Vereador(a)"), "de vereador(a)");
});

test("card e perfil usam o subsídio da competência mais recente com subsídio informado", () => {
  // Produção em 2026-11-17: bruto de 2026-07 soma 1/3 de férias; o card mostrava o bruto.
  assert.deepEqual(subsidioMaisRecente(folha), { competencia: "2026-07", valor: 9721.92 });
  // Folha mais recente com proventos mas sem salário base legível (sync grava 0):
  // vale a competência anterior, nunca "R$ 0,00".
  assert.deepEqual(
    subsidioMaisRecente([...folha, linha("2026-08", 12962.56, 9590.24, 0)]),
    { competencia: "2026-07", valor: 9721.92 },
  );
  assert.deepEqual(subsidioMaisRecente([linha("2026-07", "12962.56", "9590.24", "9721.92")]), {
    competencia: "2026-07",
    valor: 9721.92,
  });
  // Competência sem pagamento não conta, mesmo com subsídio de referência.
  assert.deepEqual(
    subsidioMaisRecente([linha("2026-09", 0, 0, 9721.92), linha("2026-06", 9721.92, 7240.78, 9721.92)]),
    { competencia: "2026-06", valor: 9721.92 },
  );
});

test("sem nenhuma competência com subsídio, a tela diz que não foi informado", () => {
  assert.equal(subsidioMaisRecente([linha("2026-07", 12962.56, 9590.24, 0)]), null);
  assert.equal(subsidioMaisRecente([linha("2026-07", 12962.56, 9590.24, null)]), null);
  assert.equal(subsidioMaisRecente([]), null);
  assert.equal(SUBSIDIO_NAO_INFORMADO, "Subsídio não informado na folha");
  assert.equal(temSubsidio({ subsidio_referencia: 0 }), false);
  assert.equal(temSubsidio({ subsidio_referencia: "abc" }), false);
  assert.equal(temSubsidio({ subsidio_referencia: "9721.92" }), true);
  // /vereadores e o perfil seguem a mesma regra: zero não vira subsídio em nenhum dos dois.
  assert.equal(resumirSubsidio([linha("2026-07", 12962.56, 9590.24, 0)]), null);
});

test("biografia oficial usa o slug da Câmara, que difere do interno em 7 vereadores", () => {
  const base = "https://piracanjuba.go.leg.br/vereador/";
  // Conferido em 2026-11-17: estes respondem 200; os slugs internos deram 404.
  assert.equal(urlBiografiaCamara("adriana-pinheiro"), `${base}adriana-dias/`);
  assert.equal(urlBiografiaCamara("aparecida-divani"), `${base}aparecida-cordeiro/`);
  assert.equal(urlBiografiaCamara("sirley-wehbe"), `${base}sirley-de-fatima/`);
  assert.equal(urlBiografiaCamara("fernando-abraao"), `${base}fernando-silva/`);
  assert.equal(urlBiografiaCamara("reginaldo-moreira"), `${base}reginaldo-silva/`);
  assert.equal(urlBiografiaCamara("welton-eterno"), `${base}welton-da-silva/`);
  assert.equal(urlBiografiaCamara("wennder-trindade"), `${base}wennder-silva/`);
  // Iguais nos dois sites.
  for (const slug of ["douglas-miranda", "edimar-lopes", "marco-antonio", "yuri-santiago"]) {
    assert.equal(urlBiografiaCamara(slug), `${base}${slug}/`);
  }
  // Fora do mapa de tratamento não há biografia conferida.
  assert.equal(urlBiografiaCamara("slug-novo"), null);
  assert.equal(urlBiografiaCamara("constructor"), null);
  assert.equal(urlBiografiaCamara(null), null);
});
