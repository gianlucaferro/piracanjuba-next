import { Heart, Activity, MapPin, Phone, ExternalLink } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { fetchSaudeData } from "@/lib/data/setores";

export const metadata = pageMetadata({
  title: "Saúde Pública de Piracanjuba GO",
  description:
    "Indicadores de saúde de Piracanjuba: dengue (InfoDengue), estabelecimentos CNES, profissionais, leitos e dados SES-GO.",
  path: "/saude",
});

export const revalidate = 3600;

function fmt(n: number | string | null) {
  if (n == null || n === "") return "—";
  return Number(n).toLocaleString("pt-BR");
}

export default async function SaudePage() {
  const { indicadores, estabelecimentos, dengue } = await fetchSaudeData();

  const dengueByYear = dengue.reduce<Record<number, number>>((acc, d) => {
    const y = d.ano || 0;
    acc[y] = (acc[y] || 0) + Number(d.valor || 0);
    return acc;
  }, {});

  const indicadoresPorCategoria = indicadores.reduce<Record<string, typeof indicadores>>(
    (acc, i) => {
      const c = i.categoria || "Geral";
      if (!acc[c]) acc[c] = [];
      acc[c].push(i);
      return acc;
    },
    {}
  );

  return (
    <>
      <section className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-b border-border">
        <div className="container py-10 md:py-14">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Heart className="w-8 h-8 text-red-500" />
            Saúde Pública
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Dados públicos de saúde de Piracanjuba: estabelecimentos CNES, indicadores
            SES-GO, casos de dengue e leitos hospitalares.
          </p>
        </div>
      </section>

      <div className="container py-8 space-y-8">
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card label="Estabelecimentos" value={estabelecimentos.length} />
          <Card label="Profissionais" value={estabelecimentos.reduce((s, e) => s + (e.profissionais_count || 0), 0)} />
          <Card label="Leitos" value={estabelecimentos.reduce((s, e) => s + (e.leitos_count || 0), 0)} />
          <Card label="Indicadores" value={indicadores.length} />
        </section>

        {Object.keys(dengueByYear).length > 0 && (
          <section className="stat-card">
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-500" />
              Casos de Dengue
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(dengueByYear)
                .sort((a, b) => Number(b[0]) - Number(a[0]))
                .slice(0, 4)
                .map(([ano, total]) => (
                  <div key={ano} className="text-center">
                    <p className="text-xs uppercase text-muted-foreground">{ano}</p>
                    <p className="text-2xl font-bold text-foreground">{fmt(total)}</p>
                  </div>
                ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">Fonte: InfoDengue / SES-GO</p>
          </section>
        )}

        {estabelecimentos.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-primary" />
              Estabelecimentos de saúde ({estabelecimentos.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {estabelecimentos.map((e) => (
                <article key={e.id} className="stat-card">
                  <h3 className="font-semibold text-foreground text-sm">{e.nome}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{e.tipo}</p>
                  {e.endereco && <p className="text-xs text-muted-foreground mt-1">{e.endereco}</p>}
                  <div className="flex flex-wrap gap-3 mt-2 text-xs">
                    {e.telefone && (
                      <a href={`tel:${e.telefone}`} className="text-primary inline-flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {e.telefone}
                      </a>
                    )}
                    {e.profissionais_count != null && (
                      <span className="text-muted-foreground">{e.profissionais_count} profissionais</span>
                    )}
                    {e.leitos_count != null && (
                      <span className="text-muted-foreground">{e.leitos_count} leitos</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {Object.entries(indicadoresPorCategoria).map(([cat, items]) => (
          <section key={cat}>
            <h2 className="text-lg font-semibold text-foreground mb-3 capitalize">{cat}</h2>
            <div className="overflow-x-auto stat-card p-0">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium text-muted-foreground">Indicador</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground text-right">Valor</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground text-right">Ano</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground">Fonte</th>
                  </tr>
                </thead>
                <tbody>
                  {items.slice(0, 30).map((i) => (
                    <tr key={i.id} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-2 text-foreground">{i.indicador}</td>
                      <td className="px-4 py-2 text-right text-foreground">{i.valor_texto || fmt(i.valor)}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{i.ano}</td>
                      <td className="px-4 py-2 text-muted-foreground text-[11px]">
                        {i.fonte_url ? (
                          <a href={i.fonte_url} target="_blank" rel="noopener noreferrer" className="text-primary inline-flex items-center gap-1">
                            {i.fonte || "Fonte"} <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          i.fonte || "—"
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

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card text-center">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-foreground mt-1">{value.toLocaleString("pt-BR")}</p>
    </div>
  );
}
