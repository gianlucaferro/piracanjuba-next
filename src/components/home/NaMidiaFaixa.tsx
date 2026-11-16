import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { MATERIAS_DESTAQUE_HOME } from "@/data/naMidia";

// Altura de cada logo na faixa: logos largos ficam mais baixos e logos
// compactos mais altos, para que todos tenham o mesmo peso visual.
function alturaLogo(largura: number, altura: number) {
  const proporcao = largura / altura;
  if (proporcao >= 5) return 26;
  if (proporcao >= 3) return 30;
  if (proporcao >= 2.4) return 34;
  return 40;
}

export default function NaMidiaFaixa() {
  if (MATERIAS_DESTAQUE_HOME.length === 0) return null;

  return (
    <section aria-labelledby="heading-na-midia" className="rounded-2xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2
          id="heading-na-midia"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          O Piracanjuba.ai na imprensa
        </h2>
        <Link
          href="/na-midia"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Ver todas as matérias <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 items-center gap-x-4 gap-y-5">
        {MATERIAS_DESTAQUE_HOME.map((m) => {
          const logo = m.logo!;
          const h = alturaLogo(logo.largura, logo.altura);
          const w = Math.round((logo.largura / logo.altura) * h);
          return (
            <li key={m.id} className="flex justify-center">
              <a
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${m.veiculo}: ${m.titulo} (abre em nova aba)`}
                className="flex h-11 items-center justify-center rounded-md px-1 opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Image
                  unoptimized
                  src={logo.src}
                  alt={m.veiculo}
                  width={w}
                  height={h}
                  style={{ height: h, width: "auto" }}
                  className="max-w-full object-contain brightness-0 dark:invert"
                />
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
