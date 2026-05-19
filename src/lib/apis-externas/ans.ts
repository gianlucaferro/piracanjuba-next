// ANS — Agência Nacional de Saúde Suplementar.
// Dados sobre beneficiários de planos de saúde por município.
// Sem auth. Dados publicados via dados.gov.br (CKAN).
// Docs: https://dados.gov.br/dados/conjuntos-dados/dados-cadastrais-de-beneficiarios

const BASE = "https://dados.gov.br/api/publico";

export type AnsBeneficiariosMunicipio = {
  ano: number;
  mes: number;
  uf: string;
  codigo_ibge_municipio: string;
  modalidade: string;
  beneficiarios: number;
};

/** Resource ID atualizado anualmente pela ANS — verificar em dados.gov.br se quebrar. */
export const URL_ANS_BENEFICIARIOS =
  "https://dados.gov.br/dados/conjuntos-dados/beneficiarios-de-planos-privados-de-saude-por-municipio";

/**
 * Helper pra buscar dataset por palavra-chave no portal dados.gov.br.
 * Retorna lista de resources downloadáveis.
 */
export async function buscarConjuntoDados(query: string) {
  const url = new URL(`${BASE}/conjuntos-dados`);
  url.searchParams.set("isPrivado", "false");
  url.searchParams.set("q", query);
  const resp = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!resp.ok) throw new Error(`dados.gov.br ${resp.status}`);
  return resp.json() as Promise<unknown>;
}
