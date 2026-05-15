import Link from "next/link";
import { ArrowLeft, Users, Briefcase } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import {
  fetchFolhaUltimaCompetencia,
  fetchFolhaStats,
} from "@/lib/data/folha-camara";

export const metadata = pageMetadata({
  title: "Folha de Pagamento da Câmara — Piracanjuba GO",
  description:
    "Lista completa de servidores e vereadores da Câmara Municipal de Piracanjuba: cargo, lotação, data de admissão, situação. Atualização mensal.",
  path: "/transparencia/folha-camara",
});

export const revalidate = 3600;

function fmtDate(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return d; }
}

export default async function FolhaCamaraPage() {
  const [folha, stats] = await Promise.all([
    fetchFolhaUltimaCompetencia(),
    fetchFolhaStats(),
  ]);

  return (
    <div className="container py-6 md:py-10 max-w-5xl space-y-6">
      <Link href="/transparencia" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Transparência
      </Link>
      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold inline-flex items-center gap-2">
          <Users className="w-7 h-7 text-blue-600" />
          Folha de Pagamento da Câmara
        </h1>
        <p className="text-sm text-muted-foreground">
          Servidores, comissionados e vereadores que recebem pela Câmara
          Municipal de Piracanjuba (Poder Legislativo). Atualização mensal via
          portal LAI Centi.
        </p>
      </header>

      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="stat-card">
              <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Competência atual</p>
              <p className="text-base font-bold text-foreground mt-0.5">{stats.ultima_referencia}</p>
            </div>
            <div className="stat-card">
              <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Servidores na folha</p>
              <p className="text-2xl font-extrabold text-blue-700 mt-0.5">{stats.total_servidores_ultima}</p>
            </div>
            <div className="stat-card">
              <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Cargos diferentes</p>
              <p className="text-2xl font-extrabold text-foreground mt-0.5">{stats.por_cargo.length}</p>
            </div>
          </div>

          <section className="stat-card space-y-3">
            <h2 className="text-lg font-semibold inline-flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              Por cargo
            </h2>
            <div className="space-y-1">
              {stats.por_cargo.map((c) => (
                <div key={c.cargo} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 text-foreground">{c.cargo}</span>
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${(c.quantidade / stats.total_servidores_ultima) * 100}%` }} />
                  </div>
                  <span className="font-bold text-foreground w-8 text-right">{c.quantidade}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <section className="stat-card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/30">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium text-muted-foreground">Nome</th>
              <th className="px-3 py-2 font-medium text-muted-foreground">Cargo</th>
              <th className="px-3 py-2 font-medium text-muted-foreground">Lotação</th>
              <th className="px-3 py-2 font-medium text-muted-foreground">Admissão</th>
              <th className="px-3 py-2 font-medium text-muted-foreground">Situação</th>
            </tr>
          </thead>
          <tbody>
            {folha.map((f) => (
              <tr key={f.id} className="border-b border-border/50 last:border-0">
                <td className="px-3 py-2 text-foreground">{f.nome}</td>
                <td className="px-3 py-2 text-muted-foreground text-xs">{f.cargo}</td>
                <td className="px-3 py-2 text-muted-foreground text-xs">{f.lotacao ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground text-xs">{fmtDate(f.data_admissao)}</td>
                <td className="px-3 py-2">
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${f.situacao === "ATIVO" ? "bg-emerald-500/15 text-emerald-700" : "bg-slate-500/15 text-slate-700"}`}>
                    {f.situacao ?? "—"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="text-xs text-muted-foreground border-t border-border pt-4">
        Dados sincronizados mensalmente do portal LAI Centi.
      </footer>
    </div>
  );
}
