import { Megaphone, ExternalLink } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { fetchAtuacoesAll } from "@/lib/data/listings";

export const metadata = pageMetadata({
  title: "Atuação Parlamentar — Câmara de Piracanjuba GO",
  description:
    "Requerimentos, indicações, moções e proposições dos vereadores da Câmara Municipal de Piracanjuba.",
  path: "/atuacao-parlamentar",
});

export const revalidate = 3600;

export default async function AtuacaoParlamentarPage() {
  const atuacoes = await fetchAtuacoesAll(100);

  // Group by year
  const byYear = atuacoes.reduce<Record<string, typeof atuacoes>>((acc, a) => {
    const year = String(a.ano || "Sem ano");
    if (!acc[year]) acc[year] = [];
    acc[year].push(a);
    return acc;
  }, {});
  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));

  return (
    <>
      <section className="bg-gradient-to-br from-primary/15 to-primary/5 border-b border-border">
        <div className="container py-10 md:py-14">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Megaphone className="w-8 h-8 text-primary" />
            Atuação Parlamentar
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            {atuacoes.length} indicações, requerimentos, moções e proposições recentes
            apresentadas pelos vereadores da Câmara Municipal de Piracanjuba.
          </p>
        </div>
      </section>

      <div className="container py-8 space-y-8">
        {atuacoes.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">
            Nenhuma atuação parlamentar registrada ainda.
          </p>
        ) : (
          years.map((year) => (
            <section key={year}>
              <h2 className="text-xl font-bold text-foreground mb-3 sticky top-0 bg-background/80 backdrop-blur py-2">
                {year}
              </h2>
              <div className="space-y-2">
                {byYear[year].map((a) => (
                  <article key={a.id} className="stat-card">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground capitalize">{a.tipo}</span>
                          {a.numero ? ` nº ${a.numero}` : ""}
                          {a.data && ` · ${new Date(a.data).toLocaleDateString("pt-BR")}`}
                        </p>
                        <p className="text-sm text-foreground mt-1">
                          {a.descricao?.slice(0, 280) || "—"}
                        </p>
                        {a.resumo && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            {a.resumo.slice(0, 220)}
                          </p>
                        )}
                        {a.autor_texto && (
                          <p className="text-xs text-primary mt-1">{a.autor_texto}</p>
                        )}
                      </div>
                      {a.fonte_url && (
                        <a
                          href={a.fonte_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
                        >
                          Ver fonte <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </>
  );
}
