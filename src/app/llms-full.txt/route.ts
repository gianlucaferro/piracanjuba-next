import sitemap from "@/app/sitemap";
import { EMPRESAS } from "@/data/empresas";
import { SLUGS_EMPRESAS } from "@/data/empresas-slugs";
import { empresasParaLlms, montarLlmsFullTxt } from "@/data/llms";

// Versão ampliada do /llms.txt, gerada da mesma fonte do sitemap.xml, com o
// detalhe de cada página, os dados do município e as fontes oficiais.
// Estático e revalidado a cada hora, como o sitemap.
export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  const urls = (await sitemap()).map((entrada) => entrada.url);
  const texto = montarLlmsFullTxt({
    urls,
    empresas: empresasParaLlms(SLUGS_EMPRESAS.map((slug) => EMPRESAS[slug])),
    atualizadoEm: new Date(),
  });
  return new Response(texto, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
