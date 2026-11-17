// Como a página de empresa distribui as listas de tamanho variável (vitrine,
// destaques e passos). Fica fora do componente para que tests/empresas.test.ts
// confira cada quantidade aceita. As classes ficam escritas por extenso, para o
// Tailwind encontrá-las ao varrer o código.

/** Quantidades aceitas pelas fichas; o teste barra o que passar disso. */
export const LIMITES_EMPRESA = {
  destaques: { min: 2, max: 4 },
  passos: { min: 2, max: 4 },
  galeria: { min: 1, max: 6 },
  faq: { min: 3, max: 8 },
} as const;

/**
 * Papel de cada item da vitrine. Com três itens, um grande à esquerda
 * ("destaque") e dois empilhados à direita ("lateral"); qualquer outra
 * quantidade vira uma grade simples ("grade"), com a legenda embaixo da imagem.
 */
export type PapelItemGaleria = "destaque" | "lateral" | "grade";

export function vitrineComposta(total: number): boolean {
  return total === 3;
}

export function papelItemGaleria(indice: number, total: number): PapelItemGaleria {
  if (!vitrineComposta(total)) return "grade";
  return indice === 0 ? "destaque" : "lateral";
}

/** Colunas da vitrine no computador (no celular ela rola na horizontal). */
export function colunasGaleria(total: number): string {
  if (vitrineComposta(total)) return "md:grid-cols-12 md:grid-rows-2";
  if (total <= 2) return "md:grid-cols-2";
  if (total === 4) return "md:grid-cols-2 lg:grid-cols-4";
  return "md:grid-cols-2 lg:grid-cols-3";
}

/** Faixa de destaques: uma coluna por item no computador, sem colunas vazias. */
export function colunasDestaques(total: number): string {
  if (total <= 2) return "md:grid-cols-2";
  if (total === 3) return "md:grid-cols-3";
  return "md:grid-cols-4";
}

/**
 * Linha do tempo dos passos: todos na mesma linha no computador, para o filete
 * ligar um passo ao seguinte sem apontar para o vazio (por isso o limite de 4).
 */
export function colunasPassos(total: number): string {
  if (total <= 2) return "md:grid-cols-2";
  if (total === 3) return "md:grid-cols-3";
  return "md:grid-cols-4";
}
