// URLhaus (Abuse.ch) — base de URLs maliciosas pra validar links em decretos.
// Sem auth, HTTPS, CORS. Docs: https://urlhaus-api.abuse.ch/

const BASE = "https://urlhaus-api.abuse.ch/v1";

export type UrlhausLookupResp = {
  query_status: "ok" | "no_results" | string;
  id?: string;
  urlhaus_reference?: string;
  url?: string;
  url_status?: "online" | "offline";
  date_added?: string;
  threat?: string;
  reporter?: string;
  blacklists?: Record<string, string>;
};

/** Consulta uma URL. Retorna query_status='no_results' se não houver registro. */
export async function consultarUrl(url: string): Promise<UrlhausLookupResp> {
  const body = new URLSearchParams({ url });
  const resp = await fetch(`${BASE}/url/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });
  if (!resp.ok) throw new Error(`URLhaus ${resp.status}`);
  return (await resp.json()) as UrlhausLookupResp;
}

/** Atalho conveniente: TRUE se URL conhecida como maliciosa. */
export async function isMaliciosa(url: string): Promise<boolean> {
  try {
    const r = await consultarUrl(url);
    return r.query_status === "ok" && r.url_status === "online";
  } catch {
    return false;
  }
}
