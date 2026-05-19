// CNJ — Conselho Nacional de Justiça. Dados abertos via Justiça Aberta API.
// Docs: https://www.cnj.jus.br/dadosabertos/
// Não há REST padronizada; expomos placeholders pros dados disponíveis via portal.

const PORTAL_DADOS_ABERTOS = "https://www.cnj.jus.br/dadosabertos-api";

/**
 * Estatística processual por tribunal/comarca. Dataset principal:
 *  - "Justiça em Números" — relatórios anuais (PDF + CSV)
 *  - "Painel Estatística Justiça em Números 4.0" (powerBI)
 *  - "Selo Justiça em Números" (CSV consolidado)
 *
 * Pro Piracanjuba, comarca TJGO 0123 (Piracanjuba), os datasets úteis são:
 *  - Acervo de processos por unidade judiciária
 *  - Taxa de congestionamento
 *
 * Ingestão recomendada: baixar CSV manualmente uma vez/ano e popular tabela.
 */
export type EstatisticaComarca = {
  ano: number;
  comarca: string;
  uf: string;
  acervo: number;
  taxa_congestionamento: number;
  produtividade_magistrado?: number;
};

export const URL_JUSTICA_EM_NUMEROS_2024 =
  "https://www.cnj.jus.br/wp-content/uploads/2024/09/justica-em-numeros-2024-base-de-dados.zip";

/** Datajud público (já usamos via Escavador, exposto pra fallback). */
export const URL_DATAJUD_PUBLICO =
  "https://datajud-wiki.cnj.jus.br/api-publica";
