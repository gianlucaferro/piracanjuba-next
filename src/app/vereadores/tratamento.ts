// Tratamento de cada parlamentar, tirado da biografia oficial no site da
// Câmara (piracanjuba.go.leg.br/vereador/<slug>/), que diz "candidata a
// vereadora" ou "candidato a vereador". Conferido em 2026-11-17.
// A tabela vereadores não tem campo de gênero e o tratamento não é deduzido
// pelo nome: slug fora desta lista usa a forma neutra "Vereador(a)".
// Sem imports de alias: os testes em tests/ importam este arquivo direto no Node.

export type Tratamento = "Vereador" | "Vereadora" | "Vereador(a)";

const TRATAMENTO_POR_SLUG: Record<string, "Vereador" | "Vereadora"> = {
  "adriana-pinheiro": "Vereadora",
  "aparecida-divani": "Vereadora",
  "sirley-wehbe": "Vereadora",
  "douglas-miranda": "Vereador",
  "edimar-lopes": "Vereador",
  "fernando-abraao": "Vereador",
  "marco-antonio": "Vereador",
  "reginaldo-moreira": "Vereador",
  "welton-eterno": "Vereador",
  "wennder-trindade": "Vereador",
  "yuri-santiago": "Vereador",
};

export function tratamentoParlamentar(slug: string | null | undefined): Tratamento {
  return (slug && TRATAMENTO_POR_SLUG[slug]) || "Vereador(a)";
}

/** "da vereadora", "do vereador" ou "de vereador(a)", para frases como "Perfil da vereadora X". */
export function perfilDe(tratamento: Tratamento): string {
  if (tratamento === "Vereadora") return "da vereadora";
  if (tratamento === "Vereador") return "do vereador";
  return "de vereador(a)";
}
