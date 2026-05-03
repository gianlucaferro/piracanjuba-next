import Link from "next/link";
import {
  Users,
  FileText,
  Megaphone,
  Calendar,
  Gavel,
  Plane,
  ArrowRight,
  ScrollText,
  ExternalLink,
} from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import {
  fetchCamaraOverview,
  fetchUltimosProjetos,
  fetchUltimasAtuacoes,
} from "@/lib/data/camara";

export const metadata = pageMetadata({
  title: "Câmara Municipal de Piracanjuba GO",
  description:
    "Dados da Câmara Municipal de Piracanjuba: 11 vereadores, projetos de lei, atuação parlamentar, atos, sessões, contratos, despesas e remuneração.",
  path: "/camara",
});

export const revalidate = 3600;

function StatCard({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  href?: string;
}) {
  const inner = (
    <div className="stat-card text-center h-full">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className="text-2xl md:text-3xl font-extrabold text-foreground mt-1">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
  return href ? (
    <Link href={href} className="block card-hover">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function fmtBRL(n: number | null | undefined) {
  if (n == null) return "—";
  return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function CamaraPage() {
  const [overview, projetos, atuacoes] = await Promise.all([
    fetchCamaraOverview(),
    fetchUltimosProjetos(6),
    fetchUltimasAtuacoes(6),
  ]);

  return (
    <>
      <section className="bg-gradient-to-br from-primary/15 to-primary/5 border-b border-border">
        <div className="container py-10 md:py-14">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            Câmara Municipal de Piracanjuba
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Dados públicos sobre vereadores, projetos de lei, atuação parlamentar,
            sessões, despesas e remuneração da Câmara de Piracanjuba, GO.
          </p>
        </div>
      </section>

      <div className="container py-8 space-y-10">
        {/* Cards principais */}
        <section aria-labelledby="heading-overview">
          <h2 id="heading-overview" className="sr-only">Visão geral</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Vereadores" value={overview.vereadores.toString()} sub="Mandato atual" href="/vereadores" />
            <StatCard label="Projetos de Lei" value={overview.projetos.toString()} sub={`${overview.projetosAno} em ${overview.ano}`} />
            <StatCard label="Atuação Parlamentar" value={overview.atuacao.toString()} sub={`${overview.atuacaoAno} em ${overview.ano}`} href="/atuacao-parlamentar" />
            <StatCard label="Sessões" value={overview.sessoesAno.toString()} sub={`Sessões de ${overview.ano}`} />
          </div>
        </section>

        {/* Subsídio */}
        {overview.ultimoSubsidio && (
          <section className="stat-card">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Subsídio referência ({overview.ultimoSubsidio.competencia})
                </p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {fmtBRL(Number(overview.ultimoSubsidio.subsidio_referencia))}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Bruto último mês: <span className="font-semibold text-foreground">{fmtBRL(Number(overview.ultimoSubsidio.bruto))}</span>
              </p>
            </div>
          </section>
        )}

        {/* Cards de seções */}
        <section aria-labelledby="heading-secoes" className="space-y-3">
          <h2 id="heading-secoes" className="text-lg font-semibold text-foreground flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-primary" />
            Explorar dados da Câmara
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Link href="/vereadores" className="stat-card card-hover flex items-center gap-3 group">
              <Users className="w-6 h-6 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">Vereadores</p>
                <p className="text-xs text-muted-foreground">Lista, perfil, partido, atuação, salário</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
            <Link href="/atuacao-parlamentar" className="stat-card card-hover flex items-center gap-3 group">
              <Megaphone className="w-6 h-6 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">Atuação Parlamentar</p>
                <p className="text-xs text-muted-foreground">Indicações, requerimentos, pedidos</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          </div>
        </section>

        {/* Últimos projetos */}
        {projetos.length > 0 && (
          <section aria-labelledby="heading-projetos">
            <h2 id="heading-projetos" className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-primary" />
              Últimos Projetos de Lei
            </h2>
            <div className="space-y-2">
              {projetos.map((p) => (
                <article key={p.id} className="stat-card">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{p.tipo}</span>
                        {p.numero ? ` nº ${p.numero}` : ""} {p.ano ? `· ${p.ano}` : ""}
                        {p.status ? ` · ${p.status}` : ""}
                      </p>
                      <p className="text-sm text-foreground mt-1">{p.ementa?.slice(0, 200) || "—"}</p>
                      {p.autor_texto && (
                        <p className="text-xs text-muted-foreground mt-1">Autor: {p.autor_texto}</p>
                      )}
                    </div>
                    {p.fonte_visualizar_url && (
                      <a
                        href={p.fonte_visualizar_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
                      >
                        Ver fonte <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Últimas atuações */}
        {atuacoes.length > 0 && (
          <section aria-labelledby="heading-atuacao">
            <h2 id="heading-atuacao" className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <Megaphone className="w-5 h-5 text-primary" />
              Última atuação parlamentar
            </h2>
            <div className="space-y-2">
              {atuacoes.map((a) => (
                <article key={a.id} className="stat-card">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground capitalize">{a.tipo}</span>
                    {a.numero ? ` nº ${a.numero}` : ""} {a.ano ? `· ${a.ano}` : ""}
                  </p>
                  <p className="text-sm text-foreground mt-1">{a.descricao?.slice(0, 240) || "—"}</p>
                  {a.autor_texto && (
                    <p className="text-xs text-muted-foreground mt-1">Autor: {a.autor_texto}</p>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Stats secundárias */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Atos" value={overview.atos.toString()} sub="Resoluções e decretos" />
          <StatCard label="Contratos" value={overview.contratos.toString()} sub="Câmara" />
          <StatCard label="Diárias" value={overview.diarias.toString()} sub="Registros totais" />
          <StatCard label="Total Projetos" value={overview.projetos.toString()} />
        </section>

        <section className="text-xs text-muted-foreground pt-6 border-t border-border">
          <p>
            Fonte oficial:{" "}
            <a
              href="https://camaradepiracanjuba.go.gov.br/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              camaradepiracanjuba.go.gov.br
            </a>
            . Dados sincronizados periodicamente do portal Centi e do site oficial.
          </p>
        </section>
      </div>
    </>
  );
}
