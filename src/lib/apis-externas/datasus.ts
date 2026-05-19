// DataSUS / OpenDataSUS — datasets de saúde pública.
// Sem auth, mas estrutura via CKAN. Datasets distribuídos como CSV/Parquet.
// Docs: https://opendatasus.saude.gov.br/api/3

const BASE = "https://opendatasus.saude.gov.br/api/3/action";

export type CkanPackage = {
  id: string;
  name: string;
  title: string;
  resources: Array<{
    id: string;
    name: string;
    format: string;
    url: string;
    created: string;
    last_modified: string;
  }>;
};

export type CkanSearchResp = {
  success: boolean;
  result: { count: number; results: CkanPackage[] };
};

/** Busca datasets do OpenDataSUS por palavra-chave (dengue, covid, etc). */
export async function buscarDatasets(query: string, opts: { rows?: number } = {}) {
  const url = new URL(`${BASE}/package_search`);
  url.searchParams.set("q", query);
  url.searchParams.set("rows", String(opts.rows ?? 10));
  const resp = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!resp.ok) throw new Error(`DataSUS search ${resp.status}`);
  return (await resp.json()) as CkanSearchResp;
}

/** Datasets úteis pra Piracanjuba (atualizados pelo Ministério da Saúde). */
export const DATASETS = {
  dengueChikungunyaZika: "srag-2024",
  vacinacaoCovid: "covid-19-vacinacao",
  sragHospitalizados: "srag-2024",
  imunizacao: "campanhas-de-imunizacao",
} as const;

/** Dados de SRAG (Síndrome Respiratória Aguda Grave) — usado pra COVID + Gripe. */
export const URL_SRAG_RECENTE =
  "https://opendatasus.saude.gov.br/dataset/srag-2021-a-2024";

/** Sistema de Informação de Agravos de Notificação (SINAN) — dengue, etc. */
export const URL_SINAN_DENGUE =
  "https://opendatasus.saude.gov.br/dataset/casos-nacionais-dengue";
