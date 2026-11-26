import Link from "next/link";
import { ArrowRight, Car, ExternalLink } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import ConsultaFipe from "@/components/fipe/ConsultaFipe";

export const metadata = pageMetadata({
  title: "PBAFipe: consulta da tabela FIPE de carros, motos e caminhões",
  description:
    "Consulte grátis o preço médio de carros, motos e caminhões na tabela FIPE do mês, por marca, modelo e ano. Referência para comprar e vender veículos em Piracanjuba, Goiás.",
  path: "/pba-fipe",
});

export default function PbaFipePage() {
  return (
    <div className="container max-w-2xl py-6 space-y-6">
      <header className="text-center space-y-3 pb-1">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          <Car className="h-4 w-4" aria-hidden /> Ver tabela FIPE
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">PBAFipe</h1>
        <p className="mx-auto max-w-md text-base leading-relaxed text-muted-foreground">
          Consulte o preço médio de carros, motos e caminhões na tabela FIPE do mês, antes de comprar
          ou vender um veículo em Piracanjuba.
        </p>
      </header>

      <section aria-label="Consulta da tabela FIPE" className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <ConsultaFipe />
      </section>

      <section aria-labelledby="como-usar-fipe" className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <h2 id="como-usar-fipe" className="text-base font-semibold text-foreground">
          Como usar a tabela FIPE
        </h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            O valor é o preço médio do veículo no mercado nacional, levantado todo mês pela Fundação
            Instituto de Pesquisas Econômicas (FIPE). Serve como parâmetro para negociar, não é o preço
            de uma venda.
          </li>
          <li>
            Estado de conservação, quilometragem, opcionais e a procura na região fazem o preço de
            negociação ficar acima ou abaixo da tabela.
          </li>
          <li>
            A tabela muda uma vez por mês, e o mês de referência aparece junto do preço consultado.
          </li>
        </ul>
      </section>

      <Link
        href="/compra-e-venda?cat=veiculos"
        className="stat-card card-hover flex items-center gap-3 group"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366]/10">
          <Car className="h-5 w-5 text-[#25D366]" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            Veículos à venda no Compra e Venda <span className="text-[#25D366]">PBA</span>
          </p>
          <p className="text-sm text-muted-foreground">Carros e motos anunciados em Piracanjuba</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-[#25D366]" aria-hidden />
      </Link>

      <p className="border-t border-border/60 pt-3 text-xs leading-relaxed text-muted-foreground">
        Fonte: Tabela FIPE, da Fundação Instituto de Pesquisas Econômicas, consultada pela{" "}
        <a
          href="https://deividfortuna.github.io/fipe/v2/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 underline underline-offset-4 hover:text-foreground"
        >
          API FIPE de Deivid Fortuna <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
        . Os valores são atualizados uma vez por mês, quando a FIPE publica a nova tabela.
      </p>
    </div>
  );
}
