import { Wheat, ExternalLink } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { fetchAgroData } from "@/lib/data/setores";

export const metadata = pageMetadata({
  title: "Agro em Piracanjuba GO",
  description:
    "Dados agropecuários de Piracanjuba (IBGE SIDRA): pecuária, lavoura, produção de leite, comparativo regional.",
  path: "/agro",
});

export const revalidate = 3600;

export default async function AgroPage() {
  const items = await fetchAgroData();
  const byCategoria = items.reduce<Record<string, typeof items>>((acc, i) => {
    const c = i.categoria || "Geral";
    if (!acc[c]) acc[c] = [];
    acc[c].push(i);
    return acc;
  }, {});

  return (
    <>
      <section className="bg-gradient-to-br from-amber-600/10 to-amber-600/5 border-b border-border">
        <div className="container py-10 md:py-14">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Wheat className="w-8 h-8 text-amber-600" />
            Agropecuária
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Dados agropecuários oficiais de Piracanjuba — IBGE SIDRA, ranking municipal e
            histórico anual de produção.
          </p>
        </div>
      </section>

      <div className="container py-8 space-y-8">
        {Object.entries(byCategoria).map(([categoria, list]) => (
          <section key={categoria}>
            <h2 className="text-lg font-semibold text-foreground mb-3 capitalize">
              {categoria.replace(/_/g, " ")}
            </h2>
            <div className="overflow-x-auto stat-card p-0">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium text-muted-foreground">Indicador</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground text-right">Valor</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground text-right">Unidade</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground text-right">Ano</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground">Fonte</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((i) => (
                    <tr key={i.id} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-2 text-foreground">{i.chave?.replace(/_/g, " ")}</td>
                      <td className="px-4 py-2 text-right text-foreground">
                        {i.valor_texto || (i.valor != null ? Number(i.valor).toLocaleString("pt-BR") : "—")}
                      </td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{i.unidade || "—"}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{i.ano_referencia}</td>
                      <td className="px-4 py-2 text-muted-foreground text-[11px]">
                        {i.fonte_url ? (
                          <a href={i.fonte_url} target="_blank" rel="noopener noreferrer" className="text-primary inline-flex items-center gap-1">
                            IBGE <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
