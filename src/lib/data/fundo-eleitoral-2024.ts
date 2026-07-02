// Fundo Especial de Financiamento de Campanha (FEFC, o "fundo eleitoral") recebido pelos
// eleitos de Piracanjuba na campanha de 2024. Dinheiro PÚBLICO de campanha.
// Fonte: TSE, Prestação de Contas Eleitorais 2024, arquivo receitas_candidatos_2024_GO.csv,
// campo DS_FONTE_RECEITA = "Fundo Especial" (recorte NM_UE = PIRACANJUBA). Extraído em 2026-06.
// Dado histórico fixo (contas finais de 2024); mantido estático, sem sync.

export interface FefcVereador {
  nome: string; // nome canônico usado no site (tabela vereadores)
  partido: string;
  fefc: number; // R$ recebidos do Fundo Especial (FEFC)
  totalReceita: number; // R$ total arrecadado na campanha
}

export const FUNDO_ELEITORAL_2024 = {
  ano: 2024,
  // Chapa majoritária eleita. O FEFC entra na conta do candidato a prefeito (o vice não
  // tem prestação de contas própria), então o valor é o da chapa.
  chapa: {
    prefeita: "Lenizia Alves Canedo",
    prefeitaPartido: "PP",
    vice: "Milton Justus",
    vicePartido: "PDT",
    fefc: 150000,
    totalReceita: 326900,
  },
  // Os 11 vereadores eleitos, do maior pro menor total arrecadado.
  vereadores: [
    { nome: "Marco Antônio", partido: "MDB", fefc: 0, totalReceita: 9467.5 },
    { nome: "Yuri Santiago", partido: "PP", fefc: 0, totalReceita: 7101.0 },
    { nome: "Aparecida Cordeiro", partido: "PDT", fefc: 0, totalReceita: 4680.0 },
    { nome: "Douglas Miranda", partido: "Avante", fefc: 0, totalReceita: 3185.09 },
    { nome: "Adriana Dias", partido: "PL", fefc: 1000, totalReceita: 2879.5 },
    { nome: "Reginaldo Silva", partido: "PDT", fefc: 0, totalReceita: 2682.0 },
    { nome: "Fernando Silva", partido: "PODEMOS", fefc: 0, totalReceita: 2170.8 },
    { nome: "Sirley de Fatima", partido: "PODEMOS", fefc: 0, totalReceita: 1890.0 },
    { nome: "Wennder Silva", partido: "PP", fefc: 0, totalReceita: 1840.0 },
    { nome: "Welton da Silva", partido: "PL", fefc: 0, totalReceita: 1490.0 },
    { nome: "Edimar Lopes", partido: "União Brasil", fefc: 0, totalReceita: 717.1 },
  ] as FefcVereador[],
  fonteUrl: "https://dadosabertos.tse.jus.br/dataset/prestacao-de-contas-eleitorais-2024",
} as const;
