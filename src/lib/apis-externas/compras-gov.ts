// Compras.gov.br — API de Dados Abertos do Portal de Compras Públicas Federais.
// Sem auth, JSON. Docs: https://compras.dados.gov.br/docs/

const BASE = "https://compras.dados.gov.br";

async function fetchJson<T>(path: string): Promise<T> {
  const resp = await fetch(`${BASE}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!resp.ok) throw new Error(`compras.gov.br ${path} ${resp.status}`);
  return resp.json() as Promise<T>;
}

export type LicitacaoFederal = {
  id_licitacao: number;
  numero: string;
  modalidade: { descricao: string };
  situacao: string;
  data_abertura_proposta: string;
  uasg: { codigo: string; nome: string; municipio?: { nome: string; uf: string } };
  objeto: string;
  valor_estimado?: number;
};

/**
 * Licitações federais por município (UASG vinculada).
 * Endpoint paginado com offset.
 */
export const buscarLicitacoesPorMunicipio = (uf: string, municipio: string, offset = 0) =>
  fetchJson<{ _embedded: { licitacoes: LicitacaoFederal[] }; _links: unknown }>(
    `/licitacoes/v1/licitacoes.json?co_uf=${uf}&no_municipio=${encodeURIComponent(municipio)}&offset=${offset}`,
  );

export type FornecedorFederal = {
  cnpj: string;
  cpf?: string;
  nome: string;
  porte_empresa?: string;
  natureza_juridica?: string;
};

/** Buscar fornecedores ativos do governo federal por CNPJ. */
export const buscarFornecedorPorCnpj = (cnpj: string) =>
  fetchJson<FornecedorFederal>(`/fornecedores/v1/fornecedores/${cnpj}.json`);
