"use client";

import type React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect, useId } from "react";
import {
  BarChart3,
  BookOpen,
  Building2,
  HeartHandshake,
  Home,
  Info,
  Landmark,
  MoreHorizontal,
  MessageSquare,
  Phone,
  Trash2,
  Pill,
  BusFront,
  Package,
  Trophy,
  Newspaper,
  Bell,
  Users,
} from "lucide-react";

type NavItem = {
  to: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
};

const mainNav: NavItem[] = [
  { to: "/", label: "Início", icon: Home },
  { to: "/camara", label: "Câmara", icon: Landmark },
  { to: "/prefeitura", label: "Prefeitura", icon: Building2 },
];

// Dados PBA leva ao hub /dados-pba que agrega 10 categorias de dados.
// Primeiro item de "Mais" pra dar destaque visual.
const moreNav: NavItem[] = [
  { to: "/dados-pba", label: "Dados PBA", icon: BarChart3 },
  { to: "/vereadores", label: "Vereadores", icon: Users },
  { to: "/contatos", label: "Contatos Úteis", icon: Phone },
  { to: "/coleta-lixo", label: "Coleta de Lixo", icon: Trash2 },
  { to: "/plantao-farmacias", label: "Plantão Farmácias", icon: Pill },
  { to: "/horarios-onibus", label: "Horários de Ônibus", icon: BusFront },
  { to: "/compra-e-venda", label: "Compra e Venda PBA", icon: Package },
  { to: "/zap-pba", label: "Zap PBA", icon: MessageSquare },
  { to: "/historia-pba", label: "História PBA", icon: BookOpen },
  { to: "/nota-pba", label: "Nota PBA", icon: Trophy },
  { to: "/acompanhar", label: "Favoritos e avisos", icon: Bell },
  { to: "/na-midia", label: "Na mídia", icon: Newspaper },
  { to: "/sobre", label: "Sobre", icon: Info },
];

export default function DesktopNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    // Esc fecha o menu e devolve o foco ao botão "Mais".
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        botaoRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // /vereadores também está em "Mais", mas o destaque fica só em "Câmara",
  // que já cobre /vereadores e /atuacao-parlamentar.
  const isActive = (to: string) =>
    pathname === to ||
    (to === "/camara" &&
      (pathname.startsWith("/vereadores") ||
        pathname.startsWith("/atuacao-parlamentar")));

  return (
    <nav className="hidden md:flex items-center gap-1" aria-label="Navegação principal">
      {mainNav.map((item) => {
        const active = isActive(item.to);
        return (
          <Link
            key={item.to}
            href={item.to}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] flex items-center ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {item.label}
          </Link>
        );
      })}

      <Link
        href="/anuncie"
        className="px-3 py-2 rounded-md text-sm font-bold min-h-[44px] flex items-center gap-1.5 text-[#25D366] hover:text-[#1da851] transition-colors"
      >
        Anuncie
      </Link>

      <div className="relative" ref={ref}>
        <button
          ref={botaoRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] flex items-center gap-2 ${
            moreNav.some((i) => i.to !== "/vereadores" && isActive(i.to)) || open
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
          aria-label="Mais seções"
          aria-expanded={open}
          aria-controls={menuId}
        >
          <MoreHorizontal className="w-4 h-4" />
          Mais
        </button>
        {/* Os itens ficam sempre no HTML, para robôs de busca e leitura sem JS
            (achado LINK-02 da auditoria de SEO de 2026-11-17). Fechado, o painel
            some por CSS (display: none), o que também tira os links da ordem
            de tabulação e da árvore de acessibilidade. */}
        <div
          id={menuId}
          className={`absolute right-0 top-full mt-1 w-56 bg-card border rounded-lg shadow-lg overflow-hidden z-50 ${
            open ? "" : "hidden"
          }`}
        >
          {moreNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            const isCompraVenda = item.to === "/compra-e-venda";
            const isZapPba = item.to === "/zap-pba";
            const isDadosPba = item.to === "/dados-pba";
            const isHistoriaPba = item.to === "/historia-pba";
            const isNotaPba = item.to === "/nota-pba";
            return (
              <Link
                key={item.to}
                href={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-secondary text-foreground"
                }`}
              >
                {Icon && (
                  <Icon
                    className={`h-4 w-4 ${isZapPba ? "text-[#25D366]" : ""}`}
                  />
                )}
                {isCompraVenda ? (
                  <span>
                    Compra e Venda{" "}
                    <span className="text-[#25D366] font-semibold">PBA</span>
                  </span>
                ) : isZapPba ? (
                  <span>
                    Zap <span className="text-[#25D366] font-semibold">PBA</span>
                  </span>
                ) : isDadosPba ? (
                  <span>
                    Dados <span className="text-[#25D366] font-semibold">PBA</span>
                  </span>
                ) : isHistoriaPba ? (
                  <span>
                    História <span className="text-[#25D366] font-semibold">PBA</span>
                  </span>
                ) : isNotaPba ? (
                  <span>
                    Nota <span className="text-[#25D366] font-semibold">PBA</span>
                  </span>
                ) : (
                  <span>{item.label}</span>
                )}
              </Link>
            );
          })}
          <div className="border-t">
            <Link
              href="/anuncie"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary"
            >
              <HeartHandshake className="h-4 w-4 text-[#25D366]" />
              <span className="font-semibold text-[#25D366]">
                Anuncie no <span className="font-bold">PBA.ai</span>
              </span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
