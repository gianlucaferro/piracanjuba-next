import { DollarSign, ExternalLink } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { fetchEmendas } from "@/lib/data/listings";

export const metadata = pageMetadata({
  title: "Emendas Parlamentares para Piracanjuba GO",
  description:
    "Emendas parlamentares federais e estaduais destinadas a Piracanjuba: parlamentar autor, valor empenhado, valor pago e objeto.",
  path: "/emendas",
});

export const revalidate = 3600;

function fmtBRL(n: number | string | null | undefined) {
  if (n == null) return "—";
  return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function EmendasPage() {
  const emendas = await fetchEmendas();

  // Aggregate by parlamentar
  const byParlamentar = emendas.reduce<Record<string, { total_empenhado: number; total_pago: number; count: number; esfera: string }>>(
    (acc, e) => {
      const nome = e.parlamentar_nome || "Desconhecido";
      if (!acc[nome]) {
        acc[nome] = { total_empenhado: 0, total_pago: 0, count: 0, esfera: e.parlamentar_esfera || "" };
      }
      acc[nome].total_empenhado += Number(e.valor_empenhado || 0);
      acc[nome].total_pago += Number(e.valor_pago || 0);
      acc[nome].count += 1;
      return acc;
    },
    {}
  );

  const totalEmpenhado = emendas.reduce((s, e) => s + Number(e.valor_empenhado || 0), 0);
  const totalPago = emendas.reduce((s, e) => s + Number(e.valor_pago || 0), 0);

  const ranking = Object.entries(byParlamentar).sort((a, b) => b[1].total_pago - a[1].total_pago);

  return (
    <>
      <section className="bg-gradient-to-br from-primary/15 to-primary/5 border-b border-border">
        <div className="container py-10 md:py-14">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-primary" />
            Emendas Parlamentares
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            {emendas.length} emendas parlamentares destinadas a Piracanjuba,
            totalizando {fmtBRL(totalEmpenhado)} empenhados e {fmtBRL(totalPago)} pagos.
          </p>
        </div>
      </section>

      <div className="container py-8 space-y-8">
        {/* Stats */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="stat-card text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total empenhado</p>
            <p className="text-2xl font-bold text-foreground mt-1">{fmtBRL(totalEmpenhado)}</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total pago</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{fmtBRL(totalPago)}</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Parlamentares</p>
            <p className="text-2xl font-bold text-foreground mt-1">{ranking.length}</p>
          </div>
        </section>

        {/* Ranking parlamentares */}
        {ranking.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              Ranking por parlamentar (valor pago)
            </h2>
            <div className="overflow-x-auto stat-card p-0">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr className="text-left">
                    <th className="px-4 py-2 font-medium text-muted-foreground">Parlamentar</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground">Esfera</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground text-right">Empenhado</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground text-right">Pago</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground text-right">Emendas</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map(([nome, dados]) => (
                    <tr key={nome} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-2 text-foreground">{nome}</td>
                      <td className="px-4 py-2 text-muted-foreground capitalize">{dados.esfera || "—"}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{fmtBRL(dados.total_empenhado)}</td>
                      <td className="px-4 py-2 text-right text-foreground font-medium">{fmtBRL(dados.total_pago)}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{dados.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Detalhes individuais */}
        {emendas.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              Todas as emendas ({emendas.length})
            </h2>
            <div className="space-y-2">
              {emendas.map((e) => (
                <article key={e.id} className="stat-card">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{e.parlamentar_nome}</span>
                        {e.parlamentar_esfera && ` · ${e.parlamentar_esfera}`}
                        {e.ano && ` · ${e.ano}`}
                      </p>
                      <p className="text-sm text-foreground mt-1">
                        {e.objeto?.slice(0, 280) || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Empenhado: <span className="text-foreground">{fmtBRL(e.valor_empenhado)}</span>
                        {" · "}
                        Pago: <span className="text-foreground">{fmtBRL(e.valor_pago)}</span>
                      </p>
                    </div>
                    {e.fonte_url && (
                      <a
                        href={e.fonte_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
                      >
                        Fonte <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
