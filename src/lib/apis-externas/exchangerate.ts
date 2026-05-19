// Exchangerate.host — taxas de câmbio gratuitas.
// Sem auth, HTTPS. Docs: https://exchangerate.host/

const BASE = "https://api.exchangerate.host";

export type CotacaoResp = {
  base: string;
  date: string;
  rates: Record<string, number>;
};

export async function buscarCotacoes(base = "BRL", simbolos: string[] = ["USD", "EUR", "ARS"]) {
  const url = new URL(`${BASE}/latest`);
  url.searchParams.set("base", base);
  url.searchParams.set("symbols", simbolos.join(","));
  const resp = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!resp.ok) throw new Error(`exchangerate.host ${resp.status}`);
  return (await resp.json()) as CotacaoResp;
}

export async function converter(de: string, para: string, valor: number) {
  const url = new URL(`${BASE}/convert`);
  url.searchParams.set("from", de);
  url.searchParams.set("to", para);
  url.searchParams.set("amount", String(valor));
  const resp = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!resp.ok) throw new Error(`exchangerate.host convert ${resp.status}`);
  return (await resp.json()) as { result: number; info: { rate: number } };
}
