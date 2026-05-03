import { ShieldAlert, ExternalLink } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { fetchSegurancaData } from "@/lib/data/setores";

export const metadata = pageMetadata({
  title: "Segurança Pública de Piracanjuba GO",
  description:
    "Indicadores de segurança pública de Piracanjuba: ocorrências, vítimas, taxas por 100 mil habitantes, fonte SSP-GO/SINESP.",
  path: "/seguranca",
});

export const revalidate = 3600;

export default async function SegurancaPage() {
  const indicadores = await fetchSegurancaData();
  const byIndicador = indicadores.reduce<Record<string, typeof indicadores>>((acc, i) => {
    const k = i.indicador || "Outros";
    if (!acc[k]) acc[k] = [];
    acc[k].push(i);
    return acc;
  }, {});
  const totalOcorrencias = indicadores.reduce((s, i) => s + (i.ocorrencias || 0), 0);

  return (
    <>
      <section className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-b border-border">
        <div className="container py-10 md:py-14">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-orange-500" />
            Segurança Pública
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Estatísticas de segurança pública de Piracanjuba — SSP-GO e SINESP/MJ.
          </p>
        </div>
      </section>

      <div className="container py-8 space-y-8">
        <section className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Stat label="Indicadores" value={indicadores.length.toString()} />
          <Stat label="Tipos" value={Object.keys(byIndicador).length.toString()} />
          <Stat label="Total ocorrências" value={totalOcorrencias.toLocaleString("pt-BR")} />
        </section>

        {Object.entries(byIndicador).map(([indicador, items]) => (
          <section key={indicador}>
            <h2 className="text-lg font-semibold text-foreground mb-3 capitalize">{indicador}</h2>
            <div className="overflow-x-auto stat-card p-0">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium text-muted-foreground">Período</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground text-right">Ocorrências</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground text-right">Vítimas</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground text-right">Taxa /100k</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground">Fonte</th>
                  </tr>
                </thead>
                <tbody>
                  {items.slice(0, 24).map((i) => (
                    <tr key={i.id} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-2 text-foreground">
                        {i.ano}
                        {i.mes ? `/${String(i.mes).padStart(2, "0")}` : ""}
                      </td>
                      <td className="px-4 py-2 text-right text-foreground">
                        {i.ocorrencias?.toLocaleString("pt-BR") ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-right text-muted-foreground">
                        {i.vitimas?.toLocaleString("pt-BR") ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-right text-muted-foreground">
                        {i.taxa_por_100k ? Number(i.taxa_por_100k).toFixed(1) : "—"}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-[11px]">
                        {i.fonte_url ? (
                          <a href={i.fonte_url} target="_blank" rel="noopener noreferrer" className="text-primary inline-flex items-center gap-1">
                            {i.fonte_nome || "Fonte"} <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          i.fonte_nome || "—"
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card text-center">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
    </div>
  );
}
