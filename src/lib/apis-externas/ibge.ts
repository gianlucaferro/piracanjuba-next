// IBGE — Serviço de Dados (servicodados.ibge.gov.br).
// Sem auth, HTTPS, CORS habilitado.
// Docs: https://servicodados.ibge.gov.br/api/docs/

const BASE = "https://servicodados.ibge.gov.br/api";
// Código IBGE de Piracanjuba-GO. (5217005 é Piranhas-GO, município errado.)
export const ID_PIRACANJUBA = 5217104;

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
 *  - 5938 var 37: PIB a preços correntes, em mil reais (PIB dos Municípios)
 *  - PIB per capita não existe na tabela 5938: vem da API de pesquisas
 *    (pesquisa 38, indicador 47001, em reais). Ver pibPerCapitaMunicipal.
 *  - IDHM disponível só pelo Atlas Brasil (não IBGE puro)
 *
 * Tabela 6579 (Estimativas de População):
 *   /agregados/6579/periodos/{ano}/variaveis/9324?localidades=N6[5217104]
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

/**
 * Converte uma série do IBGE (ano -> texto) em ano -> número. Descarta nulo,
 * vazio e marcadores sem valor, como "..." e "-".
 */
export function serieNumerica(
  serie: Record<string, string | null> | null | undefined,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [ano, v] of Object.entries(serie ?? {})) {
    if (v == null || String(v).trim() === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) out[ano] = n;
  }
  return out;
}

/** Resposta de /v1/pesquisas/{pesquisa}/indicadores/{indicador}/resultados/{localidade}. */
export type IndicadorResposta = Array<{
  id: number;
  res: Array<{ localidade: string; res: Record<string, string | null> }>;
}>;

/** Pesquisa 38 (PIB dos Municípios), indicador 47001: PIB per capita, série revisada, em reais. */
export const INDICADOR_PIB_PER_CAPITA = 47001;

/** PIB per capita em reais (mesmo número do IBGE Cidades). Retorna mapa ano -> valor. */
export async function pibPerCapitaMunicipal(
  id = ID_PIRACANJUBA,
): Promise<Record<string, number>> {
  const data = await fetchJson<IndicadorResposta>(
    `${BASE}/v1/pesquisas/38/indicadores/${INDICADOR_PIB_PER_CAPITA}/resultados/${id}`,
  );
  return serieNumerica(data[0]?.res?.[0]?.res);
}

/**
 * PIB municipal: total pela tabela 5938 (var 37, em mil reais) e per capita
 * pelo indicador 47001 (em reais). A var 6575 da tabela 5938 é o valor
 * adicionado bruto dos serviços, não o PIB per capita.
 */
export async function pibMunicipal(): Promise<{
  pibTotal: Record<string, number>;
  pibPerCapita: Record<string, number>;
}> {
  const [total, pibPerCapita] = await Promise.all([
    fetchAgregado(5938, 37, { periodos: "-5" }),
    pibPerCapitaMunicipal(),
  ]);
  return {
    pibTotal: serieNumerica(total[0]?.resultados?.[0]?.series?.[0]?.serie),
    pibPerCapita,
  };
}
