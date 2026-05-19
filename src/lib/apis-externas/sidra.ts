// SIDRA/IBGE — séries históricas detalhadas (Censo, PNAD, Pesquisa Pecuária).
// Sem auth, HTTPS.
// Docs: https://apisidra.ibge.gov.br/

const BASE = "https://apisidra.ibge.gov.br/values";
export const ID_PIRACANJUBA = "5217005";

/**
 * SIDRA tem URL muito específico. Formato:
 *   /t/{tabela}/n6/{codMunicipio}/v/{variavel}/p/{periodo}/c{classif}/{cod}
 *
 * Tabelas úteis pra Piracanjuba:
 *  - 3939: Pesquisa Pecuária Municipal — efetivo de rebanhos
 *  - 5457: Pesquisa Agrícola Municipal (PAM) — produção de lavouras
 *  - 5475: Pesquisa Pecuária — leite produzido
 *  - 6753: Censo Demográfico 2022 — população total por município
 *
 * Exemplo: rebanho bovino último ano disponível em Piracanjuba:
 *   /t/3939/n6/5217005/v/105/p/last/c79/2670
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

/** Efetivo de rebanho bovino (Pesquisa Pecuária Municipal). */
export async function efetivoBovino(): Promise<{ ano: string; cabecas: number } | null> {
  const data = await fetchSidra(`/t/3939/n6/${ID_PIRACANJUBA}/v/105/p/last%201/c79/2670`);
  const valor = data.find((d) => d.V && d.V !== "-");
  if (!valor) return null;
  return { ano: valor.D1C, cabecas: Number(valor.V) };
}

/** Produção de leite (Pesquisa da Pecuária Municipal — tab 74). */
export async function producaoLeite(): Promise<{ ano: string; milLitros: number } | null> {
  const data = await fetchSidra(`/t/74/n6/${ID_PIRACANJUBA}/v/106/p/last%201`);
  const valor = data.find((d) => d.V && d.V !== "-");
  if (!valor) return null;
  return { ano: valor.D1C, milLitros: Number(valor.V) };
}
