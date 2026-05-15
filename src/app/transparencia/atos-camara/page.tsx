import Link from "next/link";
import { ArrowLeft, Megaphone, MessageSquareWarning } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { fetchAtosPorTipo, fetchAtosStats } from "@/lib/data/atos-camara";

export const metadata = pageMetadata({
  title: "Moções e Requerimentos — Câmara de Piracanjuba GO",
  description:
    "Todas as Moções e Requerimentos da Câmara de Piracanjuba. Pedidos formais, manifestações públicas e solicitações de informação.",
  path: "/transparencia/atos-camara",
});

export const revalidate = 3600;

function fmtDate(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return d; }
}

export default async function AtosCamaraPage() {
  const [mocoes, requerimentos, stats] = await Promise.all([
    fetchAtosPorTipo("MOCAO", 100),
    fetchAtosPorTipo("REQUERIMENTO", 100),
    fetchAtosStats(),
  ]);

  return (
    <div className="container py-6 md:py-10 max-w-5xl space-y-6">
      <Link href="/transparencia" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Transparência
      </Link>
      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold inline-flex items-center gap-2">
          <Megaphone className="w-7 h-7 text-amber-600" />
          Moções e Requerimentos
        </h1>
        <p className="text-sm text-muted-foreground">
          <strong>Moção</strong>: manifestação formal pública (aplauso, pesar, repúdio).{" "}
          <strong>Requerimento</strong>: pedido formal ao Executivo de informações ou providências.
        </p>
      </header>

      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card">
            <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Total atos</p>
            <p className="text-2xl font-extrabold text-amber-700 mt-0.5">{stats.total}</p>
          </div>
          <div className="stat-card">
            <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Moções</p>
            <p className="text-2xl font-extrabold text-foreground mt-0.5">{stats.por_tipo.find((t) => t.tipo === "MOCAO")?.quantidade ?? 0}</p>
          </div>
          <div className="stat-card">
            <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Requerimentos</p>
            <p className="text-2xl font-extrabold text-foreground mt-0.5">{stats.por_tipo.find((t) => t.tipo === "REQUERIMENTO")?.quantidade ?? 0}</p>
          </div>
        </div>
      )}

      <section className="stat-card space-y-3">
        <h2 className="text-lg font-semibold inline-flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-amber-600" />
          Moções ({mocoes.length})
        </h2>
        <div className="space-y-2">
          {mocoes.map((m) => (
            <article key={m.id} className="p-3 rounded-lg border border-border bg-background/40">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <p className="font-semibold text-amber-700 text-sm">{m.numero}</p>
                <p className="text-[11px] text-muted-foreground">{fmtDate(m.data_publicacao)}</p>
              </div>
              {m.ementa && (
                <p className="text-xs text-foreground/85 leading-relaxed">{m.ementa}</p>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="stat-card space-y-3">
        <h2 className="text-lg font-semibold inline-flex items-center gap-2">
          <MessageSquareWarning className="w-5 h-5 text-blue-600" />
          Requerimentos ({requerimentos.length})
        </h2>
        <div className="space-y-2">
          {requerimentos.map((r) => (
            <article key={r.id} className="p-3 rounded-lg border border-border bg-background/40">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <p className="font-semibold text-blue-700 text-sm">{r.numero}</p>
                <p className="text-[11px] text-muted-foreground">{fmtDate(r.data_publicacao)}</p>
              </div>
              {r.ementa && (
                <p className="text-xs text-foreground/85 leading-relaxed">{r.ementa}</p>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
