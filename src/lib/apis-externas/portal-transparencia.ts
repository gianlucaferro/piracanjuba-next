// Portal da Transparência Federal — API oficial.
// AUTH: token grátis (cadastro em https://api.portaldatransparencia.gov.br/swagger-ui.html).
// Header: chave-api-dados: <token>
//
// Datasets críticos pra cruzamento cívico:
//  - CEIS (Cadastro de Empresas Inidôneas e Suspensas)
//  - CNEP (Cadastro Nacional de Empresas Punidas)
//  - Bolsa Família por município
//  - Servidores Federais (acumulação de cargos)

const BASE = "https://api.portaldatransparencia.gov.br/api-de-dados";

function headers(token: string) {
  return {
    "chave-api-dados": token,
    Accept: "application/json",
  };
}

async function fetchJson<T>(token: string, path: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  }
  const resp = await fetch(url.toString(), { headers: headers(token) });
  if (!resp.ok) throw new Error(`PortalTransparencia ${path} ${resp.status}`);
  return (await resp.json()) as T;
}

// ========== CEIS ==========
export type CeisItem = {
  id: number;
  dataInicioSancao: string;
  dataFimSancao: string;
  dataPublicacaoSancao: string;
  textoPublicacao: string;
  tipoSancao: { descricaoResumida: string; descricaoPortal: string };
  fundamentacao: Array<{ descricao: string }>;
  orgaoSancionador: { nome: string; siglaUf: string };
  sancionado: {
    nome: string;
    codigoFormatado: string; // CPF/CNPJ
    tipoPessoa: "F" | "J";
  };
};

export const listarCeis = (
  token: string,
  opts: { cnpjSancionado?: string; nomeSancionado?: string; pagina?: number } = {},
) =>
  fetchJson<CeisItem[]>(token, "/ceis", {
    cnpjSancionado: opts.cnpjSancionado ?? "",
    nomeSancionado: opts.nomeSancionado ?? "",
    pagina: opts.pagina ?? 1,
  });

// ========== CNEP ==========
export type CnepItem = {
  id: number;
  dataInicioSancao: string;
  dataFimSancao: string;
  tipoSancao: { descricaoResumida: string };
  orgaoSancionador: { nome: string };
  sancionado: { nome: string; codigoFormatado: string };
  valorMulta: number;
};

export const listarCnep = (
  token: string,
  opts: { cnpjSancionado?: string; pagina?: number } = {},
) =>
  fetchJson<CnepItem[]>(token, "/cnep", {
    cnpjSancionado: opts.cnpjSancionado ?? "",
    pagina: opts.pagina ?? 1,
  });

// ========== Bolsa Família por município ==========
export type BolsaFamiliaMunicipio = {
  dataReferencia: string;
  valor: number;
  quantidadeBeneficiados: number;
  municipio: { codigoIBGE: string; nomeIBGE: string };
};

export const bolsaFamiliaPorMunicipio = (
  token: string,
  codigoIbge: string,
  mesAno: string, // formato YYYYMM
) =>
  fetchJson<BolsaFamiliaMunicipio[]>(token, "/bolsa-familia-disponivel-por-municipio", {
    codigoIbge,
    mesAno,
  });

// ========== Auxílio Brasil ==========
export const auxilioBrasilPorMunicipio = (
  token: string,
  codigoIbge: string,
  mesAno: string,
) =>
  fetchJson<BolsaFamiliaMunicipio[]>(
    token,
    "/auxilio-brasil-por-municipio",
    { codigoIbge, mesAno },
  );

// ========== Servidores Federais ==========
export type ServidorFederal = {
  id: number;
  pessoa: { cpfFormatado: string; nome: string };
  servidor: {
    cargo: { descricaoCargo: string };
    orgaoServidor: { sigla: string; nome: string };
    situacao: string;
  };
};

export const listarServidoresFederaisPorCpf = (token: string, cpfMascara: string) =>
  fetchJson<ServidorFederal[]>(token, "/servidores", {
    cpf: cpfMascara, // formato 123.456.789-00
    pagina: 1,
  });
