import Link from "next/link";
import { ArrowLeft, Megaphone, Calendar, FileText } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import {
  fetchIndicacoesRecentes,
  fetchIndicacoesStats,
} from "@/lib/data/indicacoes-camara";

export const metadata = pageMetadata({
  title: "Indicações Parlamentares — Câmara de Piracanjuba GO",
  description:
    "Todas as indicações dos vereadores da Câmara de Piracanjuba: pedidos ao Executivo, com data, autor e ementa. Atualização semanal via portal LAI.",
  path: "/transparencia/indicacoes",
});

export const revalidate = 3600;

function fmtDate(d: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-BR");
  } catch {
    return d;
  }
}

export default async function IndicacoesPage() {
  const [indicacoes, stats] = await Promise.all([
    fetchIndicacoesRecentes(200),
    fetchIndicacoesStats(),
  ]);

  return (
    <div className="container py-6 md:py-10 max-w-4xl space-y-6">
      <Link
        href="/transparencia"
        className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
      >
        <ArrowLeft className="w-4 h-4" /> Transparência
      </Link>

      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground inline-flex items-center gap-2">
          <Megaphone className="w-7 h-7 text-violet-600" />
          Indicações Parlamentares
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Lista completa de indicações apresentadas por vereadores à Câmara
          Municipal de Piracanjuba. Indicação é um pedido formal ao Executivo
          (Prefeitura) <strong>sem força de lei</strong> — solicita providências
          em obras, saúde, educação, segurança ou outras áreas.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="stat-card">
          <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Total</p>
          <p className="text-2xl font-extrabold text-violet-700 mt-0.5">{stats.total}</p>
        </div>
        <div className="stat-card">
          <p className="text-[10px] uppercase text-muted-foreground tracking-wider">2026</p>
          <p className="text-2xl font-extrabold text-foreground mt-0.5">{stats.ano_2026}</p>
        </div>
        <div className="stat-card">
          <p className="text-[10px] uppercase text-muted-foreground tracking-wider">2025</p>
          <p className="text-2xl font-extrabold text-foreground mt-0.5">{stats.ano_2025}</p>
        </div>
        <div className="stat-card">
          <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Última publicação</p>
          <p className="text-base font-bold text-foreground mt-0.5">{fmtDate(stats.ultima_data)}</p>
        </div>
      </div>

      {indicacoes.length === 0 ? (
        <div className="stat-card text-center py-10">
          <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground">
            Nenhuma indicação carregada ainda
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Aguardando próxima sincronização semanal.
          </p>
        </div>
      ) : (
        <section className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Mostrando {indicacoes.length} indicações mais recentes (de {stats.total} totais).
          </p>
          {indicacoes.map((i) => (
            <article key={i.id} className="stat-card hover:border-violet-500/30 transition-colors">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <p className="font-semibold text-violet-700 text-sm">{i.numero}</p>
                <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {fmtDate(i.data_publicacao)}
                </p>
              </div>
              {i.ementa && (
                <p className="text-sm text-foreground/90 leading-relaxed mt-1">
                  {i.ementa}
                </p>
              )}
              {i.autor && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Autor: <strong>{i.autor}</strong>
                </p>
              )}
            </article>
          ))}
        </section>
      )}

      <footer className="text-xs text-muted-foreground border-t border-border pt-4">
        <p>
          Dados sincronizados semanalmente do portal de Acesso à Informação da
          Câmara Municipal de Piracanjuba via API estruturada. Atualização
          automática toda segunda-feira.
        </p>
      </footer>
    </div>
  );
}
