import sitemap from "@/app/sitemap";
import { EMPRESAS } from "@/data/empresas";
import { SLUGS_EMPRESAS } from "@/data/empresas-slugs";
import { empresasParaLlms, montarLlmsTxt } from "@/data/llms";

// Índice para LLMs e agentes de IA (llmstxt.org), gerado da mesma fonte do
// sitemap.xml: página nova no sitemap entra aqui sozinha, com a descrição de
// src/data/llms.ts. Estático e revalidado a cada hora, como o sitemap.
export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  const urls = (await sitemap()).map((entrada) => entrada.url);
  const texto = montarLlmsTxt({
    urls,
    empresas: empresasParaLlms(SLUGS_EMPRESAS.map((slug) => EMPRESAS[slug])),
    atualizadoEm: new Date(),
  });
  return new Response(texto, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
