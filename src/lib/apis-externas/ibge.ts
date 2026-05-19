// IBGE — Serviço de Dados (servicodados.ibge.gov.br).
// Sem auth, HTTPS, CORS habilitado.
// Docs: https://servicodados.ibge.gov.br/api/docs/

const BASE = "https://servicodados.ibge.gov.br/api";
export const ID_PIRACANJUBA = 5217005;

async function fetchJson<T>(url: string): Promise<T> {
  const resp = await fetch(url, { headers: { Accept: "application/json" } });
  if (!resp.ok) throw new Error(`IBGE ${url} ${resp.status}`);
  return resp.json() as Promise<T>;
}

export type MunicipioInfo = {
  id: number;
  nome: string;
  microrregiao: {
    id: number;
    nome: string;
    mesorregiao: {
      id: number;
      nome: string;
      UF: { id: number; sigla: string; nome: string; regiao: { nome: string } };
    };
  };
};

export const buscarMunicipio = (id = ID_PIRACANJUBA) =>
  fetchJson<MunicipioInfo>(`${BASE}/v1/localidades/municipios/${id}`);

/**
 * Agregados — séries históricas IBGE. Variáveis comuns:
 *  - 6579: População residente estimada (Censo + estimativas anuais)
 *  - 29167: PIB a preços correntes (Contas Regionais)
 *  - 29168: PIB per capita
 *  - IDHM disponível só pelo Atlas Brasil (não IBGE puro)
 *
 * Tabela 6579 (Estimativas de População):
 *   /agregados/6579/periodos/{ano}/variaveis/9324?localidades=N6[5217005]
 *
 * Documentação completa de agregados:
 *   https://servicodados.ibge.gov.br/api/docs/agregados
 */
export type AgregadoResposta = Array<{
  id: string;
  variavel: string;
  unidade: string;
  resultados: Array<{
    classificacoes: unknown[];
    series: Array<{
      localidade: { id: string; nivel: { id: string; nome: string }; nome: string };
      serie: Record<string, string>;
    }>;
  }>;
}>;

export const fetchAgregado = (
  tabela: number,
  variavel: number,
  opts: { periodos?: string; localidade?: string } = {},
) => {
  const periodos = opts.periodos ?? "-6"; // últimos 6 períodos
  const localidade = opts.localidade ?? `N6[${ID_PIRACANJUBA}]`;
  return fetchJson<AgregadoResposta>(
    `${BASE}/v3/agregados/${tabela}/periodos/${periodos}/variaveis/${variavel}?localidades=${localidade}`,
  );
};

/** População estimada (tabela 6579 - var 9324). Retorna mapa ano -> número. */
export async function populacaoEstimada(): Promise<Record<string, number>> {
  const data = await fetchAgregado(6579, 9324);
  const serie = data[0]?.resultados?.[0]?.series?.[0]?.serie ?? {};
  const out: Record<string, number> = {};
  for (const [ano, valor] of Object.entries(serie)) {
    const n = Number(valor);
    if (Number.isFinite(n)) out[ano] = n;
  }
  return out;
}

/** PIB municipal (tabela 5938) — var 37 = PIB a preços correntes, var 6575 = PIB per capita. */
export async function pibMunicipal(): Promise<{
  pibTotal: Record<string, number>;
  pibPerCapita: Record<string, number>;
}> {
  const [total, perCapita] = await Promise.all([
    fetchAgregado(5938, 37, { periodos: "-5" }),
    fetchAgregado(5938, 6575, { periodos: "-5" }),
  ]);
  const parse = (data: AgregadoResposta) => {
    const serie = data[0]?.resultados?.[0]?.series?.[0]?.serie ?? {};
    const out: Record<string, number> = {};
    for (const [ano, v] of Object.entries(serie)) {
      const n = Number(v);
      if (Number.isFinite(n)) out[ano] = n;
    }
    return out;
  };
  return { pibTotal: parse(total), pibPerCapita: parse(perCapita) };
}
