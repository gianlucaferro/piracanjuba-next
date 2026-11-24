import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import Instagram from "@/components/icons/InstagramIcon";
import HeaderControls from "./HeaderControls";
import DesktopNav from "./DesktopNav";
import MobileBottomNav from "./MobileBottomNav";
import QueryProvider from "@/components/providers/QueryProvider";
import ChatWidget from "@/components/chat/ChatWidget";
import FollowingBanner from "@/components/FollowingBanner";
import SomenteNoPortal from "./SomenteNoPortal";
import { CONVITE_RODAPE_EMPRESA } from "@/data/paginaEmpresa";
import { SECOES_RODAPE } from "@/data/secoesRodape";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <div className="min-h-screen min-h-[100dvh] flex flex-col bg-background overflow-x-hidden w-full max-w-[100vw]">
        <header className="sticky top-0 z-50 border-b bg-card">
          <div className="container flex items-center justify-between h-14">
            <Link href="/" className="flex items-center gap-2" aria-label="Início">
              <Image
                src="/icon-192.png"
                alt="Piracanjuba.ai"
                width={36}
                height={36}
                className="rounded-lg object-contain"
                priority
              />
              <span className="font-bold text-lg text-foreground">
                Piracanjuba<span className="text-[#25D366]">.ai</span>
              </span>
            </Link>
            <DesktopNav />
            <HeaderControls />
          </div>
        </header>

        <SomenteNoPortal>
          <FollowingBanner />
        </SomenteNoPortal>
        <main className="flex-1 pb-20 md:pb-0">{children}</main>

        <footer className="border-t bg-card">
          <div className="container pt-4 pb-24 md:py-8">
            <section
              aria-labelledby="rodape-convite-empresa"
              className="mb-6 flex flex-col items-start gap-4 rounded-xl border border-primary/15 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between md:mb-8 md:px-7 md:py-5"
            >
              <h2
                id="rodape-convite-empresa"
                className="max-w-xl text-balance text-base font-semibold leading-snug text-foreground md:text-lg"
              >
                {CONVITE_RODAPE_EMPRESA.pergunta}
              </h2>
              <Link
                href={CONVITE_RODAPE_EMPRESA.href}
                prefetch={false}
                className="inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-semibold leading-snug text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:shrink-0"
              >
                {CONVITE_RODAPE_EMPRESA.acao}
                <ArrowRight size={16} aria-hidden="true" className="shrink-0" />
              </Link>
            </section>
            {/* Seções: links fixos no HTML, com âncora descritiva, para páginas que
                não recebiam link interno (LINK-02, auditoria de SEO de 2026-11-17).
                Fica fora das páginas de empresa, que usam a moldura enxuta.
                prefetch={false}: o rodapé inteiro entra na tela de uma vez, e
                pré-carregar todas essas rotas a cada página não compensa. */}
            <SomenteNoPortal>
              <nav aria-labelledby="rodape-secoes" className="hidden md:block mb-8 pb-8 border-b">
                <h2
                  id="rodape-secoes"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4"
                >
                  Seções
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-6">
                  {SECOES_RODAPE.map((grupo) => (
                    <div key={grupo.titulo}>
                      <h3 className="text-sm font-semibold text-foreground mb-2">{grupo.titulo}</h3>
                      <ul className="space-y-1">
                        {grupo.links.map((link) => (
                          <li key={link.href}>
                            <Link
                              href={link.href}
                              prefetch={false}
                              className="inline-block py-0.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {link.rotulo}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </nav>
            </SomenteNoPortal>
            <div className="hidden md:flex items-center justify-between gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Image
                  src="/icon-192.png"
                  alt="Piracanjuba.ai"
                  width={24}
                  height={24}
                  className="rounded object-contain"
                />
                <span>Piracanjuba.ai — Piracanjuba, GO</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                <Link href="/na-midia" className="hover:text-foreground transition-colors">
                  Na mídia
                </Link>
                <Link href="/sobre#fontes" className="hover:text-foreground transition-colors">
                  Fontes oficiais
                </Link>
                <Link href="/sobre" className="hover:text-foreground transition-colors">
                  Sobre
                </Link>
                <Link href="/privacidade" className="hover:text-foreground transition-colors">
                  Privacidade
                </Link>
                <a
                  href="https://www.instagram.com/piracanjuba.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram @piracanjuba.ai"
                  className="hover:opacity-80 transition-opacity"
                  style={{ color: "#E1306C" }}
                >
                  <Instagram className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div className="text-center md:mt-4 space-y-2">
              <p className="hidden md:block text-xs text-muted-foreground">
                Informações públicas com fontes identificadas. Este app não tem vínculo com
                nenhum órgão público.
              </p>
              <p className="text-sm text-foreground/70 font-medium">
                <a
                  href="https://apareca.ai/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary underline-offset-2 hover:underline transition-colors"
                >
                  Site desenvolvido por Ferro Labs Tecnologia LTDA
                </a>
                <span className="hidden md:inline"> · CNPJ 66.034.538/0001-25 - Todos os direitos reservados.</span>
              </p>
            </div>
          </div>
        </footer>

        <SomenteNoPortal>
          <MobileBottomNav />
          <ChatWidget />
        </SomenteNoPortal>
      </div>
    </QueryProvider>
  );
}
