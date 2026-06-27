import Link from "next/link";
import { ArrowLeft, Gavel } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import {
  fetchAtividadesLegislativas,
  fetchAtividadesStats,
} from "@/lib/data/atividades-legislativas";
import AtividadesLegislativasPanel from "@/components/camara/AtividadesLegislativasPanel";

export const metadata = pageMetadata({
  title: "Atividades Legislativas — Câmara de Piracanjuba GO",
  description:
    "Todos os Projetos de Lei (Legislativo + Executivo), Decretos, Resoluções e Emendas da Câmara de Piracanjuba. ~123 atos com autoria, situação e ementa. Sincronização automática semanal via portal LAI.",
  path: "/transparencia/atividades-legislativas",
});

export const revalidate = 3600;

export default async function AtividadesLegislativasPage() {
  const [atividades, stats] = await Promise.all([
    fetchAtividadesLegislativas(200),
    fetchAtividadesStats(),
  ]);

  return (
    <div className="container py-6 md:py-10 max-w-5xl space-y-6">
      <Link href="/transparencia" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Transparência
      </Link>

      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground inline-flex items-center gap-2">
          <Gavel className="w-7 h-7 text-emerald-600" />
          Atividades Legislativas
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Lista completa e consolidada dos atos legislativos da Câmara Municipal
          de Piracanjuba: Projetos de Lei (do Legislativo e do Executivo),
          Projetos de Decreto, Projetos de Resolução e Emendas. Sincronização
          automática semanal via portal LAI.
        </p>
      </header>

      {/* Stats principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="stat-card">
          <p className="text-xs uppercase text-muted-foreground tracking-wider">Total</p>
          <p className="text-2xl font-extrabold text-emerald-700 mt-0.5">{stats.total}</p>
        </div>
        {stats.por_tipo.slice(0, 3).map((t) => (
          <div key={t.tipo} className="stat-card">
            <p className="text-xs uppercase text-muted-foreground tracking-wider leading-tight">
              {t.tipo.replace("Projeto de Lei do ", "PL ").replace("Projeto de ", "")}
            </p>
            <p className="text-2xl font-extrabold text-foreground mt-0.5">{t.quantidade}</p>
          </div>
        ))}
      </div>

      {/* Por tipo (breakdown completo) */}
      {stats.por_tipo.length > 0 && (
        <section className="stat-card space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Por tipo de ato</h2>
          <div className="space-y-1">
            {stats.por_tipo.map((t) => {
              const pct = Math.round((t.quantidade / stats.total) * 100);
              return (
                <div key={t.tipo} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 text-foreground">{t.tipo}</span>
                  <span className="text-muted-foreground text-sm">{pct}%</span>
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="font-bold text-foreground w-8 text-right">{t.quantidade}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Top autores (vereadores que mais propõem) */}
      {stats.por_autor.length > 0 && (
        <section className="stat-card space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Top autores (vereadores)</h2>
          <p className="text-sm text-muted-foreground">
            Exclui atos do Poder Executivo. Quando ato tem múltiplos autores,
            todos contam.
          </p>
          <div className="space-y-1">
            {stats.por_autor.slice(0, 10).map((a) => (
              <div key={a.autor} className="flex items-center gap-2 text-sm">
                <span className="flex-1 text-foreground">{a.autor}</span>
                <span className="font-bold text-emerald-700 w-12 text-right">{a.quantidade}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Lista completa */}
      <AtividadesLegislativasPanel
        atividades={atividades}
        totalGeral={stats.total}
        variant="full"
      />

      <footer className="text-sm text-muted-foreground border-t border-border pt-4">
        <p>
          Última publicação registrada: {stats.ultima_publicacao
            ? new Date(stats.ultima_publicacao).toLocaleDateString("pt-BR")
            : "—"}
          . Atualização automática semanal via portal LAI Centi da Câmara.
        </p>
      </footer>
    </div>
  );
}
