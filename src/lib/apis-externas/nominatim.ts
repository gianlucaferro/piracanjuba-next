// Nominatim (OpenStreetMap) — geocoding gratuito.
// IMPORTANTE: ≤1 req/s, sempre envie User-Agent identificando o projeto.
// Docs: https://nominatim.org/release-docs/latest/api/Overview/

const BASE = "https://nominatim.openstreetmap.org";
const UA = "Piracanjuba.AI/1.0 (contato@piracanjuba.ai)";

export type NominatimResult = {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  boundingbox: [string, string, string, string];
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
};

export async function geocodificarEndereco(
  query: string,
  opts: { limit?: number; cidade?: string; uf?: string } = {},
): Promise<NominatimResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    addressdetails: "1",
    limit: String(opts.limit ?? 5),
    countrycodes: "br",
  });
  if (opts.cidade) params.set("city", opts.cidade);
  if (opts.uf) params.set("state", opts.uf);
  const resp = await fetch(`${BASE}/search?${params.toString()}`, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!resp.ok) throw new Error(`Nominatim search ${resp.status}`);
  return (await resp.json()) as NominatimResult[];
}

export async function geocodificarReverso(
  lat: number,
  lon: number,
): Promise<NominatimResult | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: "json",
    addressdetails: "1",
    zoom: "18",
  });
  const resp = await fetch(`${BASE}/reverse?${params.toString()}`, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!resp.ok) return null;
  return (await resp.json()) as NominatimResult;
}

/** Bbox aproximado de Piracanjuba-GO (S, N, W, E). */
export const BBOX_PIRACANJUBA = {
  sul: -17.4,
  norte: -17.2,
  oeste: -49.1,
  leste: -48.85,
} as const;
