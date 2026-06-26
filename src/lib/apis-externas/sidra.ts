// SIDRA/IBGE — séries históricas detalhadas (Censo, PNAD, Pesquisa Pecuária).
// Sem auth, HTTPS.
// Docs: https://apisidra.ibge.gov.br/

const BASE = "https://apisidra.ibge.gov.br/values";
// Código IBGE do município de Piracanjuba-GO. ATENÇÃO: 5217005 é Piranhas-GO (município errado);
// Piracanjuba é 5217104 (confere com IBGE Cidades: soja 81.000 ha, bovino 167.000 cabeças em 2024).
export const ID_PIRACANJUBA = "5217104";

/**
 * SIDRA tem URL muito específico. Formato:
 *   /t/{tabela}/n6/{codMunicipio}/v/{variavel}/p/{periodo}/c{classif}/{cod}
 *
 * Tabelas úteis pra Piracanjuba:
 *  - 3939: Pesquisa Pecuária Municipal (PPM) — efetivo de rebanhos (v105, c79 tipo de rebanho: bovino=2670)
 *  - 1612: Pesquisa Agrícola Municipal (PAM) — lavouras temporárias (área, produção; c81 produto: soja=2713, milho=2711)
 *  - 74: PPM — produção de origem animal (v106, c80 tipo de produto: leite=2682, em mil litros)
 *  - 6753: Censo Agropecuário 2017 — estabelecimentos e área por tipologia (agricultura familiar)
 *
 * Exemplo: rebanho bovino último ano disponível em Piracanjuba:
 *   /t/3939/n6/5217104/v/105/p/last/c79/2670
 */
export type SidraValor = {
  NC: string;
  NN: string;
  MC: string;
  MN: string;
  V: string; // valor (string, pode ser número)
  D1C: string;
  D1N: string;
  D2C: string;
  D2N: string;
  D3C: string;
  D3N: string;
};

export async function fetchSidra(path: string): Promise<SidraValor[]> {
  const resp = await fetch(`${BASE}${path}?formato=json`, {
    headers: { Accept: "application/json" },
  });
  if (!resp.ok) throw new Error(`SIDRA ${path} ${resp.status}`);
  return (await resp.json()) as SidraValor[];
}

/**
 * Primeiro registro com valor numérico válido. A API do SIDRA devolve a 1ª linha
 * como cabeçalho (V = "Valor"), então é preciso pular o cabeçalho e ignorar
 * valores não numéricos ("-", "..", "...").
 */
function primeiroValorNumerico(data: SidraValor[]): SidraValor | undefined {
  return data.slice(1).find((d) => d.V != null && d.V !== "" && !Number.isNaN(Number(d.V)));
}

/** Efetivo de rebanho bovino (Pesquisa Pecuária Municipal — tab 3939). */
export async function efetivoBovino(): Promise<{ ano: string; cabecas: number } | null> {
  const data = await fetchSidra(`/t/3939/n6/${ID_PIRACANJUBA}/v/105/p/last%201/c79/2670`);
  const valor = primeiroValorNumerico(data);
  if (!valor) return null;
  return { ano: valor.D1C, cabecas: Number(valor.V) };
}

/** Produção de leite (Pesquisa da Pecuária Municipal — tab 74, classificação 80/categoria 2682 = leite). */
export async function producaoLeite(): Promise<{ ano: string; milLitros: number } | null> {
  const data = await fetchSidra(`/t/74/n6/${ID_PIRACANJUBA}/v/106/p/last%201/c80/2682`);
  const valor = primeiroValorNumerico(data);
  if (!valor) return null;
  return { ano: valor.D1C, milLitros: Number(valor.V) };
}
