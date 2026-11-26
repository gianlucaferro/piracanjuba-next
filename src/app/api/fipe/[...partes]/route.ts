import { consultarFipe, FipeLimiteAtingido, FipeNaoEncontrada } from "@/lib/data/fipe";
import { parseConsultaFipe } from "@/lib/fipe";

export const runtime = "nodejs";

const semCache = { "Cache-Control": "no-store" };
// A tabela muda uma vez por mês: a CDN pode guardar a resposta por 6 horas.
const comCache = { "Cache-Control": "public, max-age=0, s-maxage=21600, stale-while-revalidate=86400" };

// Atende somente a página PBAFipe: /api/fipe/<tipo>[/<marca>[/<modelo>[/<ano>]]].
export async function GET(request: Request, { params }: { params: Promise<{ partes: string[] }> }): Promise<Response> {
  if (new URL(request.url).search) {
    return Response.json({ error: "Esta consulta não aceita parâmetros." }, { status: 400, headers: semCache });
  }
  const consulta = parseConsultaFipe((await params).partes);
  if (!consulta) {
    return Response.json({ error: "Consulta FIPE inválida." }, { status: 404, headers: semCache });
  }
  try {
    return Response.json(await consultarFipe(consulta), { headers: comCache });
  } catch (error) {
    if (error instanceof FipeNaoEncontrada) {
      return Response.json({ error: "Veículo não encontrado na tabela FIPE." }, { status: 404, headers: semCache });
    }
    if (error instanceof FipeLimiteAtingido) {
      return Response.json(
        { error: "A consulta à tabela FIPE atingiu o limite do dia. Tente de novo mais tarde." },
        { status: 503, headers: { ...semCache, "Retry-After": "3600" } },
      );
    }
    return Response.json(
      { error: "Tabela FIPE indisponível no momento." },
      { status: 503, headers: { ...semCache, "Retry-After": "300" } },
    );
  }
}
