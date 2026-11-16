import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Newspaper } from "lucide-react";
import { breadcrumbJsonLd, jsonLdScript, pageMetadata } from "@/lib/seo";
import { MATERIAS_NA_MIDIA, REPUBLICACOES_NA_MIDIA } from "@/data/naMidia";

export const metadata = pageMetadata({
  title: "Na mídia: o Piracanjuba.ai na imprensa",
  description:
    "Reportagens, entrevistas e citações sobre o Piracanjuba.ai na revista piauí, CartaCapital, Times Brasil, UOL, O Popular, CBN Goiânia e Mais Goiás, em ordem de relevância e com link para cada matéria.",
  path: "/na-midia",
});

export default function NaMidiaPage() {
  return (
    <div className="container py-8 space-y-8 max-w-4xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(
          breadcrumbJsonLd([
            { name: "Início", path: "/" },
            { name: "Na mídia", path: "/na-midia" },
          ])
        )}
      />

      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Newspaper className="w-6 h-6 text-primary" aria-hidden />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Na mídia</h1>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Reportagens, entrevistas e citações sobre o Piracanjuba.ai na imprensa. A lista segue a
          ordem de relevância: alcance nacional antes de regional e, dentro de cada grupo, matéria
          dedicada ao projeto antes de citação, seguida do peso editorial do veículo.
        </p>
      </header>

      <ol className="space-y-4">
        {MATERIAS_NA_MIDIA.map((m, i) => (
          <li key={m.id} className="rounded-2xl border bg-card p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-sm font-semibold text-muted-foreground tabular-nums">
                  {i + 1}.
                </span>
                {m.logo ? (
                  <Image
                    unoptimized
                    src={m.logo.src}
                    alt=""
                    width={Math.round((m.logo.largura / m.logo.altura) * 24)}
                    height={24}
                    style={{ height: 24, width: "auto" }}
                    className="max-w-[160px] object-contain brightness-0 dark:invert opacity-80"
                  />
                ) : (
                  <span className="text-base font-bold">{m.veiculo}</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                  {m.tipo}
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                  {m.abrangencia}
                </span>
                <time dateTime={m.data} className="text-muted-foreground tabular-nums">
                  {m.data}
                </time>
              </div>
            </div>
            <h2 className="text-base sm:text-lg font-bold leading-snug">
              <a
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary hover:underline"
              >
                {m.titulo}
                <span className="sr-only"> (abre em nova aba)</span>
              </a>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {m.veiculo}
              {m.autor ? `, por ${m.autor}` : ""}
            </p>
            <p className="text-sm leading-relaxed mt-3">{m.resumo}</p>
            <a
              href={m.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-primary hover:underline"
            >
              {m.tipo.startsWith("Entrevista") ? "Ouvir a entrevista" : "Ler a matéria"}{" "}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">(abre em nova aba, em {m.veiculo})</span>
            </a>
          </li>
        ))}
      </ol>

      {REPUBLICACOES_NA_MIDIA.length > 0 && (
        <section aria-labelledby="heading-republicacoes" className="space-y-3">
          <h2 id="heading-republicacoes" className="text-lg font-bold">
            Também republicaram
          </h2>
          <ul className="rounded-2xl border bg-card divide-y">
            {REPUBLICACOES_NA_MIDIA.map((r) => (
              <li key={r.url} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:text-primary hover:underline"
                >
                  {r.veiculo}
                </a>
                <span className="text-sm text-muted-foreground">
                  Reportagem do {r.origem} ·{" "}
                  <time dateTime={r.data} className="tabular-nums">
                    {r.data}
                  </time>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-muted-foreground leading-relaxed">
        Esta página lista o que a imprensa publicou sobre o projeto. Os veículos citados não têm
        vínculo com o Piracanjuba.ai e não endossam o conteúdo do site. Os logos pertencem aos
        respectivos veículos. Para falar com o projeto, veja a página{" "}
        <Link href="/sobre" className="text-primary hover:underline">
          Sobre
        </Link>
        .
      </p>
    </div>
  );
}
