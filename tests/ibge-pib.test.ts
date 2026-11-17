import assert from "node:assert/strict";
import test from "node:test";
import { pibMunicipal, serieNumerica } from "../src/lib/apis-externas/ibge.ts";

test("série do IBGE descarta nulo, vazio e marcadores sem valor", () => {
  assert.deepEqual(
    serieNumerica({ "2021": "319956", "2022": "...", "2023": null, "2024": "", "2025": "-" }),
    { "2021": 319956 },
  );
  assert.deepEqual(serieNumerica(undefined), {});
});

// Formato real das respostas, com os valores de Piracanjuba conferidos em 2026-11-17.
const respostaPibTotal = [
  {
    id: "37",
    variavel: "Produto Interno Bruto a preços correntes",
    unidade: "Mil Reais",
    resultados: [
      {
        classificacoes: [],
        series: [
          {
            localidade: { id: "5217104", nivel: { id: "N6", nome: "Município" }, nome: "Piracanjuba - GO" },
            serie: { "2022": "1553630", "2023": "1311747" },
          },
        ],
      },
    ],
  },
];
const respostaPibPerCapita = [
  {
    id: 47001,
    res: [{ localidade: "521710", res: { "2009": null, "2022": "62437.4", "2023": "52716.61" } }],
  },
];

test("PIB per capita vem do indicador 47001, não da var 6575 (valor adicionado dos serviços)", async () => {
  const urls: string[] = [];
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = (async (entrada: string | URL | Request) => {
    const url = String(entrada);
    urls.push(url);
    const corpo = url.includes("/v1/pesquisas/38/indicadores/47001/") ? respostaPibPerCapita : respostaPibTotal;
    return new Response(JSON.stringify(corpo), { status: 200 });
  }) as typeof fetch;
  try {
    const { pibTotal, pibPerCapita } = await pibMunicipal();
    assert.deepEqual(pibPerCapita, { "2022": 62437.4, "2023": 52716.61 });
    assert.deepEqual(pibTotal, { "2022": 1553630, "2023": 1311747 });
    assert.ok(urls.every((url) => !url.includes("/variaveis/6575")));
    assert.ok(urls.some((url) => url.includes("/agregados/5938/") && url.includes("/variaveis/37")));
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});
