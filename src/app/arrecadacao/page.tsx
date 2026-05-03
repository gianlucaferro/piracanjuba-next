import { DollarSign, ExternalLink } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { fetchArrecadacaoData } from "@/lib/data/setores";

export const metadata = pageMetadata({
  title: "Arrecadação Municipal — Piracanjuba GO",
  description:
    "Arrecadação de Piracanjuba (SICONFI): receitas próprias, IPTU, ISS, transferências federais.",
  path: "/arrecadacao",
});

export const revalidate = 3600;

function fmtBRL(n: number | string | null) {
  if (n == null) return "—";
  return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function ArrecadacaoPage() {
  const { arrecadacao, transferencias } = await fetchArrecadacaoData();
  const totalArrecadado = arrecadacao.reduce((s, a) => s + Number(a.valor || 0), 0);
  const totalTransferido = transferencias.reduce((s, t) => s + Number(t.valor_total || 0), 0);

  const byCategoria = arrecadacao.reduce<Record<string, typeof arrecadacao>>((acc, a) => {
    const c = a.categoria || a.tipo || "Geral";
    if (!acc[c]) acc[c] = [];
    acc[c].push(a);
    return acc;
  }, {});

  return (
    <>
      <section className="bg-gradient-to-br from-green-600/10 to-green-600/5 border-b border-border">
        <div className="container py-10 md:py-14">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-600" />
            Arrecadação Municipal
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Dados oficiais SICONFI sobre as receitas municipais de Piracanjuba e transferências
            federais (Portal da Transparência).
          </p>
        </div>
      </section>

      <div className="container py-8 space-y-8">
        <section className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Stat label="Total arrecadado" value={fmtBRL(totalArrecadado)} />
          <Stat label="Transferências federais" value={fmtBRL(totalTransferido)} />
          <Stat label="Registros" value={(arrecadacao.length + transferencias.length).toString()} />
        </section>

        {Object.entries(byCategoria).map(([cat, list]) => (
          <section key={cat}>
            <h2 className="text-lg font-semibold text-foreground mb-3 capitalize">{cat}</h2>
            <div className="overflow-x-auto stat-card p-0">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium text-muted-foreground">Subcategoria</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground">Competência</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground text-right">Valor</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground">Fonte</th>
                  </tr>
                </thead>
                <tbody>
                  {list.slice(0, 30).map((a) => (
                    <tr key={a.id} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-2 text-foreground">{a.subcategoria || a.tipo || "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground">{a.competencia || a.ano}</td>
                      <td className="px-4 py-2 text-right text-foreground">{fmtBRL(a.valor)}</td>
                      <td className="px-4 py-2 text-muted-foreground text-[11px]">
                        {a.fonte_url ? (
                          <a href={a.fonte_url} target="_blank" rel="noopener noreferrer" className="text-primary inline-flex items-center gap-1">
                            {a.fonte_nome || "SICONFI"} <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          a.fonte_nome || "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        {transferencias.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              Transferências federais ({transferencias.length})
            </h2>
            <div className="space-y-2">
              {transferencias.map((t) => (
                <article key={t.id} className="stat-card">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground capitalize">{t.tipo}</span>
                        {t.numero && ` · nº ${t.numero}`} {t.ano && `· ${t.ano}`}
                        {t.orgao_concedente && ` · ${t.orgao_concedente}`}
                      </p>
                      <p className="text-sm text-foreground mt-1">{t.objeto?.slice(0, 240) || "—"}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Total: <span className="text-foreground">{fmtBRL(t.valor_total)}</span>
                        {" · "}
                        Liberado: <span className="text-foreground">{fmtBRL(t.valor_liberado)}</span>
                        {t.situacao && ` · ${t.situacao}`}
                      </p>
                    </div>
                    {t.fonte_url && (
                      <a href={t.fonte_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary inline-flex items-center gap-1 shrink-0">
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card text-center">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
    </div>
  );
}
