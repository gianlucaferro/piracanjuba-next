// Tratamento de cada parlamentar, tirado da biografia oficial no site da
// Câmara, que diz "candidata a vereadora" ou "candidato a vereador". Conferido
// em 2026-11-17. A biografia fica em piracanjuba.go.leg.br/vereador/<slug da
// Câmara>/, e o slug da Câmara difere do slug interno em 7 dos 11 vereadores
// (SLUG_CAMARA_POR_SLUG; o slug interno ali dá 404). Para reconferir, use
// urlBiografiaCamara(slug).
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

// Slug interno -> slug da biografia oficial na Câmara, só onde os dois diferem.
// Cada URL respondeu 200 em 2026-11-17 com o nome do parlamentar no título; os
// slugs internos destes 7 deram 404. douglas-miranda, edimar-lopes, marco-antonio
// e yuri-santiago são iguais nos dois sites.
const SLUG_CAMARA_POR_SLUG: Record<string, string> = {
  "adriana-pinheiro": "adriana-dias",
  "aparecida-divani": "aparecida-cordeiro",
  "sirley-wehbe": "sirley-de-fatima",
  "fernando-abraao": "fernando-silva",
  "reginaldo-moreira": "reginaldo-silva",
  "welton-eterno": "welton-da-silva",
  "wennder-trindade": "wennder-silva",
};

const temChave = (mapa: Record<string, string>, chave: string) =>
  Object.prototype.hasOwnProperty.call(mapa, chave);

/** Biografia oficial na Câmara de um parlamentar do mapa de tratamento; null fora dele. */
export function urlBiografiaCamara(slug: string | null | undefined): string | null {
  if (!slug || !temChave(TRATAMENTO_POR_SLUG, slug)) return null;
  const slugCamara = temChave(SLUG_CAMARA_POR_SLUG, slug) ? SLUG_CAMARA_POR_SLUG[slug] : slug;
  return `https://piracanjuba.go.leg.br/vereador/${slugCamara}/`;
}

export function tratamentoParlamentar(slug: string | null | undefined): Tratamento {
  return (slug && TRATAMENTO_POR_SLUG[slug]) || "Vereador(a)";
}

/** "da vereadora", "do vereador" ou "de vereador(a)", para frases como "Perfil da vereadora X". */
export function perfilDe(tratamento: Tratamento): string {
  if (tratamento === "Vereadora") return "da vereadora";
  if (tratamento === "Vereador") return "do vereador";
  return "de vereador(a)";
}
