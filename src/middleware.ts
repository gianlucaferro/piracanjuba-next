import { NextResponse, type NextRequest } from "next/server";
import { caminhoCanonicoEmpresa } from "@/data/empresas-slugs";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Página de empresa digitada com maiúscula ou acento: redireciona para o endereço certo.
  const destino = caminhoCanonicoEmpresa(request.nextUrl.pathname);
  if (destino) {
    const url = request.nextUrl.clone();
    url.pathname = destino;
    return NextResponse.redirect(url, 308);
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public assets (images, icons, etc)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.png$|.*\\.webp$|.*\\.svg$|.*\\.ico$).*)",
  ],
};
