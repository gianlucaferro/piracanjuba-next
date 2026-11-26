import { fetchExchangeSnapshot } from "@/lib/data/cambio";

export const runtime = "nodejs";

const headers = { "Cache-Control": "no-store" };

export async function GET(request: Request): Promise<Response> {
  // Este recurso serve somente o painel da home, não uma API de moedas genérica.
  if (new URL(request.url).search) {
    return Response.json({ error: "Esta consulta não aceita parâmetros." }, { status: 400, headers });
  }
  try {
    return Response.json(await fetchExchangeSnapshot(), { headers });
  } catch {
    return Response.json(
      { error: "Cotações temporariamente indisponíveis." },
      { status: 503, headers: { ...headers, "Retry-After": "60" } },
    );
  }
}
