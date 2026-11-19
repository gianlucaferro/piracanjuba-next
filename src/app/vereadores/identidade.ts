// Nome de urna e nome civil de cada parlamentar. A tabela vereadores guarda só o
// nome parlamentar que a Câmara usa no título do perfil (ex.: "Edimar Lopes"); a
// imprensa, o resultado da eleição e o eleitor usam o nome de urna ("Edimar Taboca").
// Conferido em 2026-11-19 em duas fontes:
//  - nome de urna: resultado da eleição municipal de 2024 em Piracanjuba (dados do
//    TSE publicados no G1), com o mesmo número de votos gravado em vereadores;
//    a grafia (minúsculas em "do") segue a biografia oficial na Câmara;
//  - nome civil: campo "nome civil" da biografia oficial em
//    piracanjuba.go.leg.br/vereador/<slug da Câmara>/ (ver urlBiografiaCamara).
// Slug fora desta lista não tem nome de urna conferido: a página não afirma nenhum.
// Sem imports de alias: os testes em tests/ importam este arquivo direto no Node.

export type IdentidadeParlamentar = {
  /** Nome de urna na eleição de 2024. */
  nomeUrna: string;
  /** Nome civil completo publicado pela Câmara. */
  nomeCivil: string;
};

/** Ano da eleição de onde vem o nome de urna. */
export const ANO_ELEICAO_NOME_URNA = 2024;

const IDENTIDADE_POR_SLUG: Record<string, IdentidadeParlamentar> = {
  "adriana-pinheiro": { nomeUrna: "Adriana Pinheiro", nomeCivil: "Adriana Dias Pinheiro" },
  "aparecida-divani": { nomeUrna: "Cida do Carmindo", nomeCivil: "Aparecida Divani Rocha Cordeiro" },
  "douglas-miranda": { nomeUrna: "Professor Douglas", nomeCivil: "Douglas Miranda Silva" },
  "edimar-lopes": { nomeUrna: "Edimar Taboca", nomeCivil: "Edimar Lopes Machado" },
  "fernando-abraao": { nomeUrna: "Fernando Silva", nomeCivil: "Fernando Abraão Magalhães Silva" },
  "marco-antonio": { nomeUrna: "Marcão Serra Negra", nomeCivil: "Marco Antônio Antunes da Cruz" },
  "reginaldo-moreira": { nomeUrna: "Reginaldo Silva", nomeCivil: "Reginaldo Moreira da Silva" },
  "sirley-wehbe": { nomeUrna: "Sirley do Postinho", nomeCivil: "Sirley de Fatima Menezes Wehbe" },
  "welton-eterno": { nomeUrna: "Welton Silva", nomeCivil: "Welton Eterno da Silva" },
  "wennder-trindade": { nomeUrna: "Wennder Trindade", nomeCivil: "Wennder Trindade e Silva" },
  "yuri-santiago": { nomeUrna: "Yuri", nomeCivil: "Yuri Santiago Alves" },
};

export function identidadeParlamentar(slug: string | null | undefined): IdentidadeParlamentar | null {
  if (!slug || !Object.prototype.hasOwnProperty.call(IDENTIDADE_POR_SLUG, slug)) return null;
  return IDENTIDADE_POR_SLUG[slug];
}

const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Outros nomes da pessoa, além do nome exibido: nome de urna e nome civil, sem
 * repetir o nome exibido nem um ao outro (comparação sem acento e sem caixa).
 */
export function outrosNomes(nome: string, slug: string | null | undefined): string[] {
  const identidade = identidadeParlamentar(slug);
  if (!identidade) return [];
  const vistos = new Set([normalizar(nome)]);
  const resultado: string[] = [];
  for (const candidato of [identidade.nomeUrna, identidade.nomeCivil]) {
    const chave = normalizar(candidato);
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    resultado.push(candidato);
  }
  return resultado;
}

/** Nome de urna só quando difere do nome exibido; null se igual ou sem dado. */
export function nomeUrnaDiferente(nome: string, slug: string | null | undefined): string | null {
  const identidade = identidadeParlamentar(slug);
  if (!identidade) return null;
  return normalizar(identidade.nomeUrna) === normalizar(nome) ? null : identidade.nomeUrna;
}

/** Texto usado na busca de /vereadores: nome exibido, nome de urna e nome civil. */
export function textoBuscaParlamentar(nome: string, slug: string | null | undefined): string {
  return [nome, ...outrosNomes(nome, slug)].join(" ");
}
