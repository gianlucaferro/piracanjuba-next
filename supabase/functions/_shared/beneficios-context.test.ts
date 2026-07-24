/// <reference lib="deno.ns" />

import { buildBenefitContextRows } from "./beneficios-context.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

Deno.test("limita linhas por programa e tamanho total do contexto", () => {
  const source = "fonte ".repeat(5_000);
  const data = Array.from({ length: 30 }, (_, index) => ({
    programa: index < 20 ? "bolsa_familia" : "bpc",
    competencia: `2026-${String((index % 12) + 1).padStart(2, "0")}`,
    beneficiarios: 1_000 + index,
    valor_pago: 2_000 + index,
    natureza_dado: "oficial",
    fonte_nome: source,
  }));

  const rows = buildBenefitContextRows(data);
  const context = rows.join("\n");

  assert(rows.length <= 6, "deveria manter no maximo tres linhas por programa");
  assert(context.length <= 3_200, "deveria respeitar o orcamento total");
  assert(!context.includes(source), "nao deveria injetar a fonte sem limite");
});

Deno.test("normaliza campos e ignora programa vazio", () => {
  const rows = buildBenefitContextRows([
    {
      programa: "  bolsa_familia  ",
      competencia: "2026-06-valor-extra",
      beneficiarios: 1_380,
      valor_pago: 935_535,
      natureza_dado: "oficial",
      fonte_nome: "Portal   da   Transparência",
    },
    {
      programa: "",
      competencia: "2026-06",
      beneficiarios: 1,
      valor_pago: 1,
      natureza_dado: "oficial",
      fonte_nome: "Fonte",
    },
  ]);

  assert(rows.length === 1, "deveria ignorar o programa vazio");
  assert(
    rows[0].includes("bolsa_familia (2026-06)"),
    "deveria limitar a competencia",
  );
  assert(
    rows[0].includes("Portal da Transparência"),
    "deveria compactar espacos",
  );
});

Deno.test("nao converte campos ausentes em zero", () => {
  const rows = buildBenefitContextRows([
    {
      programa: "bpc",
      competencia: "2026-06",
      beneficiarios: null,
      valor_pago: null,
      natureza_dado: "oficial",
      fonte_nome: "Portal da Transparência",
    },
  ]);

  assert(rows.length === 1, "deveria preservar a linha com dados ausentes");
  assert(
    rows[0].includes("N/D beneficiários, N/D"),
    "deveria sinalizar campos ausentes como N/D",
  );
  assert(!rows[0].includes("R$ 0"), "nao deveria inventar valor zero");
});
