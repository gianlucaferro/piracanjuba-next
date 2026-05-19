// Wikidata SPARQL — dados estruturados abertos.
// Sem auth, HTTPS, CORS. Limite ~60 req/min.
// Docs: https://query.wikidata.org/

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";

export type SparqlResultRow = Record<string, { type: string; value: string }>;

export async function consultaSparql(query: string): Promise<SparqlResultRow[]> {
  const url = new URL(SPARQL_ENDPOINT);
  url.searchParams.set("query", query);
  url.searchParams.set("format", "json");
  const resp = await fetch(url.toString(), {
    headers: {
      Accept: "application/sparql-results+json",
      "User-Agent": "Piracanjuba.AI/1.0 (contato@piracanjuba.ai)",
    },
  });
  if (!resp.ok) throw new Error(`Wikidata SPARQL ${resp.status}`);
  const data = (await resp.json()) as { results: { bindings: SparqlResultRow[] } };
  return data.results.bindings;
}

/** Q-ID de Piracanjuba-GO no Wikidata. */
export const Q_PIRACANJUBA = "Q1535478";

/** Info enriquecida do município (população, área, prefeito, brasão, geo). */
export const SPARQL_PIRACANJUBA_INFO = `
SELECT ?prop ?propLabel ?value ?valueLabel WHERE {
  wd:${Q_PIRACANJUBA} ?p ?value .
  ?prop wikibase:directClaim ?p .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "pt-br,pt,en" . }
}
LIMIT 50
`;
