import { NextResponse, type NextRequest } from "next/server";
import { caminhoCanonicoEmpresa } from "@/data/empresas-slugs";
import { hostSemIndexacao } from "@/lib/host-indexavel";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Página de empresa digitada com maiúscula ou acento: redireciona para o endereço certo.
  const destino = caminhoCanonicoEmpresa(request.nextUrl.pathname);
  if (destino) {
    const url = request.nextUrl.clone();
    url.pathname = destino;
    return semIndexacaoForaDoDominio(request, NextResponse.redirect(url, 308));
  }
  return semIndexacaoForaDoDominio(request, await updateSession(request));
}

// Cópias do site em *.vercel.app saem com X-Robots-Tag: noindex, para não concorrer com
// piracanjuba.ai no índice (auditoria SEO de 2026-11-17, IDX-01). O robots.txt continua
// liberado nesses hosts: o robô precisa rastrear a página para ver o noindex.
function semIndexacaoForaDoDominio(request: NextRequest, response: NextResponse) {
  if (hostSemIndexacao(request.headers.get("host") ?? request.nextUrl.host)) {
    response.headers.set("X-Robots-Tag", "noindex");
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public assets (images, icons, etc)
     * - descadastro de e-mail, sem cookies de sessão
     */
    "/((?!descadastro/|_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.png$|.*\\.webp$|.*\\.svg$|.*\\.ico$).*)",
  ],
};
