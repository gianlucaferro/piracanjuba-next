import assert from "node:assert/strict";
import test from "node:test";
import {
  descreverSubsidio,
  remuneracoesComPagamento,
  resumirSubsidio,
  type LinhaRemuneracao,
} from "../src/app/vereadores/remuneracao.ts";
import { perfilDe, tratamentoParlamentar } from "../src/app/vereadores/tratamento.ts";

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
