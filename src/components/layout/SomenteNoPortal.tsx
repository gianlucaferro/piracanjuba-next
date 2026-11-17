"use client";

import { usePathname } from "next/navigation";
import { ehPaginaDeEmpresa } from "@/data/empresas-slugs";

/**
 * Renderiza os filhos em todo o portal, menos nas páginas de empresa
 * (piracanjuba.ai/<slug>), que usam a moldura enxuta: cabeçalho e rodapé do
 * portal, sem barra inferior, chat nem chamada "Anuncie".
 */
export default function SomenteNoPortal({ children }: { children: React.ReactNode }) {
  const caminho = usePathname();
  if (ehPaginaDeEmpresa(caminho)) return null;
  return <>{children}</>;
}
