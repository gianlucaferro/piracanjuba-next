import { fetchDollarHistory } from "@/lib/data/cambio-historico";

export const runtime = "nodejs";

const historyHeaders = { "Cache-Control": "no-store" };

export async function GET(request: Request): Promise<Response> {
  // Este recurso serve somente o gráfico de 30 dias do dólar em /economia.
  if (new URL(request.url).search) {
    return Response.json({ error: "Esta consulta não aceita parâmetros." }, { status: 400, headers: historyHeaders });
  }
  try {
    return Response.json(await fetchDollarHistory(), { headers: historyHeaders });
  } catch {
    return Response.json(
      { error: "Histórico do dólar temporariamente indisponível." },
      { status: 503, headers: { ...historyHeaders, "Retry-After": "300" } },
    );
  }
}
