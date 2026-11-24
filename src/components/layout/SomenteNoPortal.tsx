"use client";

import { usePathname } from "next/navigation";
import { ehPaginaDeEmpresa } from "@/data/empresas-slugs";

/**
 * Renderiza os filhos em todo o portal, menos nas páginas de empresa
 * (piracanjuba.ai/<slug>), que usam a moldura enxuta: cabeçalho e rodapé do
 * portal, com o convite para anunciantes no rodapé compartilhado.
 */
export default function SomenteNoPortal({ children }: { children: React.ReactNode }) {
  const caminho = usePathname();
  if (ehPaginaDeEmpresa(caminho) || /^\/zap-pba\/[^/]+\/?$/.test(caminho ?? "")) return null;
  return <>{children}</>;
}
