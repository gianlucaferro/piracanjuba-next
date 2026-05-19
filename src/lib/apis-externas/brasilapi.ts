// BrasilAPI — agregador de APIs brasileiras grátis, sem auth, com CORS.
// Docs: https://brasilapi.com.br
// Endpoints usados: CEP, CNPJ, feriados, bancos, DDD, IBGE municípios.

const BASE = "https://brasilapi.com.br/api";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Accept: "application/json", ...(init?.headers ?? {}) },
  });
  if (!resp.ok) throw new Error(`BrasilAPI ${path} ${resp.status}`);
  return resp.json() as Promise<T>;
}

export type CepV2 = {
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  service: string;
  location?: {
    type: "Point";
    coordinates: { longitude: string; latitude: string };
  };
};

export const buscarCep = (cep: string) =>
  fetchJson<CepV2>(`/cep/v2/${cep.replace(/\D/g, "")}`);

export type Cnpj = {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  situacao_cadastral: number;
  descricao_situacao_cadastral: string;
  capital_social: number;
  porte: string;
  natureza_juridica: string;
  data_inicio_atividade: string;
  cnae_fiscal_descricao: string;
  municipio: string;
  uf: string;
  qsa: Array<{
    nome_socio: string;
    qualificacao_socio: string;
    data_entrada_sociedade: string;
  }>;
};

export const buscarCnpj = (cnpj: string) =>
  fetchJson<Cnpj>(`/cnpj/v1/${cnpj.replace(/\D/g, "")}`);

export type Feriado = { date: string; name: string; type: string };
export const buscarFeriadosNacionais = (ano: number) =>
  fetchJson<Feriado[]>(`/feriados/v1/${ano}`);

export type Banco = { ispb: string; name: string; code: number; fullName: string };
export const buscarBancos = () => fetchJson<Banco[]>(`/banks/v1`);

export type CidadeDdd = { state: string; cities: string[] };
/** DDD 64 = região sudoeste de GO, inclui Piracanjuba. */
export const buscarCidadesPorDdd = (ddd: number) =>
  fetchJson<CidadeDdd>(`/ddd/v1/${ddd}`);

export type MunicipioIbge = {
  codigo_ibge: string;
  nome: string;
  capital: boolean;
  codigo_uf: number;
  siafi_id?: string;
  ddd?: number;
  fuso_horario?: string;
};

export const listarMunicipiosUf = (uf: string) =>
  fetchJson<MunicipioIbge[]>(`/ibge/municipios/v1/${uf}`);

export const COD_IBGE_PIRACANJUBA = "5217005";
