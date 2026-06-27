import Link from "next/link";
import { ArrowLeft, FileText, Calendar } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { fetchLicitacoesRecentes, fetchLicitacoesStats } from "@/lib/data/licitacoes-camara";

export const metadata = pageMetadata({
  title: "Licitações da Câmara — Piracanjuba GO",
  description:
    "Histórico completo de licitações (pregões, dispensas, inexigibilidades) da Câmara de Piracanjuba. ~632 licitações com modalidade, situação e valor.",
  path: "/transparencia/licitacoes-camara",
});

export const revalidate = 3600;

function fmtBRL(n: number | null) {
  if (n == null || n === 0) return "—";
  return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return d; }
}

const SITUACAO_COR: Record<string, string> = {
  Homologada: "bg-emerald-500/15 text-emerald-700",
  Adjudicada: "bg-blue-500/15 text-blue-700",
  Deserta: "bg-amber-500/15 text-amber-700",
  Fracassada: "bg-red-500/15 text-red-700",
  Revogada: "bg-red-500/15 text-red-700",
  Anulada: "bg-red-500/15 text-red-700",
  "Em andamento": "bg-violet-500/15 text-violet-700",
};

export default async function LicitacoesPage() {
  const [licits, stats] = await Promise.all([
    fetchLicitacoesRecentes(150),
    fetchLicitacoesStats(),
  ]);

  return (
    <div className="container py-6 md:py-10 max-w-5xl space-y-6">
      <Link href="/transparencia" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Transparência
      </Link>
      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold inline-flex items-center gap-2">
          <FileText className="w-7 h-7 text-purple-600" />
          Licitações da Câmara
        </h1>
        <p className="text-sm text-muted-foreground">
          Pregões, dispensas, inexigibilidades e demais processos de
          contratação da Câmara Municipal de Piracanjuba.
        </p>
      </header>

      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="stat-card">
              <p className="text-xs uppercase text-muted-foreground tracking-wider">Total</p>
              <p className="text-2xl font-extrabold text-purple-700 mt-0.5">{stats.total}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs uppercase text-muted-foreground tracking-wider">Estimado total</p>
              <p className="text-sm font-extrabold text-foreground mt-0.5">{fmtBRL(stats.total_estimado)}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs uppercase text-muted-foreground tracking-wider">Homologado total</p>
              <p className="text-sm font-extrabold text-foreground mt-0.5">{fmtBRL(stats.total_homologado)}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs uppercase text-muted-foreground tracking-wider">Modalidades</p>
              <p className="text-2xl font-extrabold text-foreground mt-0.5">{stats.por_modalidade.length}</p>
            </div>
          </div>

          <section className="stat-card space-y-3">
            <h2 className="text-lg font-semibold">Modalidades mais usadas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {stats.por_modalidade.slice(0, 10).map((m) => (
                <div key={m.modalidade} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 text-foreground">{m.modalidade}</span>
                  <span className="font-bold text-purple-700">{m.quantidade}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="stat-card space-y-3">
            <h2 className="text-lg font-semibold">Por situação</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {stats.por_situacao.slice(0, 10).map((s) => (
                <div key={s.situacao} className="flex items-center gap-2 text-sm">
                  <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded ${SITUACAO_COR[s.situacao] ?? "bg-slate-500/15 text-slate-700"}`}>
                    {s.situacao}
                  </span>
                  <span className="font-bold text-foreground ml-auto">{s.quantidade}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Licitações recentes</h2>
        <p className="text-sm text-muted-foreground">Últimas {licits.length} licitações (de {stats?.total ?? 0} totais).</p>
        {licits.map((l) => (
          <article key={l.id} className="stat-card hover:border-purple-500/30 transition-colors">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-purple-700">{l.centi_label}</span>
                {l.modalidade && (
                  <span className="text-xs font-bold uppercase px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-700">
                    {l.modalidade}
                  </span>
                )}
                {l.situacao && (
                  <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded ${SITUACAO_COR[l.situacao] ?? "bg-slate-500/15 text-slate-700"}`}>
                    {l.situacao}
                  </span>
                )}
              </div>
              <p className="text-sm font-bold text-foreground">{fmtBRL(l.valor_homologado ?? l.valor_estimado)}</p>
            </div>
            {l.descricao && (
              <p className="text-sm text-foreground/85 leading-relaxed mt-1">
                {l.descricao.length > 220 ? l.descricao.slice(0, 220) + "..." : l.descricao}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {fmtDate(l.data_publicacao)}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
