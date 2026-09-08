import Link from "next/link";
import { ArrowLeft, BusFront, MapPin } from "lucide-react";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import HorariosOnibusClient from "./HorariosOnibusClient";

export const revalidate = 300;

export const metadata = pageMetadata({
  title: "Horários de ônibus de Piracanjuba GO",
  description:
    "Consulte horários de ônibus saindo de Piracanjuba por destino e data, com fontes da consulta, pontos de embarque e contatos das transportadoras.",
  path: "/horarios-onibus",
});

const breadcrumbs = breadcrumbJsonLd([
  { name: "Início", path: "/" },
  { name: "Horários de ônibus", path: "/horarios-onibus" },
]);

export default function HorariosOnibusPage() {
  const serverNow = new Date().toISOString();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbs).replace(/</g, "\\u003c"),
        }}
      />
      <div className="container space-y-6 py-6 pb-12">
        <Link
          href="/"
          className="inline-flex min-h-10 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar ao início
        </Link>

        <header className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-8">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/5 blur-3xl" aria-hidden="true" />
          <div className="relative flex items-start gap-4">
            <div className="hidden rounded-2xl bg-primary/10 p-4 text-primary sm:block">
              <BusFront className="h-8 w-8" aria-hidden="true" />
            </div>
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Rodoviária de Piracanjuba
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Horários de ônibus
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Encontre uma saída para o seu destino. Escolha a data e confira
                os horários consultados, o embarque e os canais das empresas.
              </p>
            </div>
          </div>
        </header>

        <HorariosOnibusClient serverNow={serverNow} />
      </div>
    </>
  );
}
