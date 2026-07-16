import Link from "next/link";
import { ArrowLeft, Briefcase, Building2, ExternalLink, Calendar, DollarSign, MapPin } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { fetchContratosCamara, fetchContratosStats } from "@/lib/data/contratos-camara";
import AlertaContratosSancao from "@/components/transparencia/AlertaContratosSancao";
import SituacaoCadastralBadge from "@/components/transparencia/SituacaoCadastralBadge";
import GrupoEconomicoBadgeAuto from "@/components/transparencia/GrupoEconomicoBadgeAuto";
import GruposContratosAviso from "@/components/transparencia/GruposContratosAviso";

export const metadata = pageMetadata({
  title: "Contratos da Câmara — Fornecedores e Valores em Piracanjuba GO",
  description:
    "Todos os contratos firmados pela Câmara Municipal de Piracanjuba: fornecedor, valor, objeto, vigência e situação. ~54 contratos 2023-2026 (R$ 1,13 mi). Sincronização automática.",
  path: "/transparencia/contratos-camara",
});

export const revalidate = 3600;

function fmtBRL(n: number | null) {
  if (n == null) return "—";
  return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-BR");
  } catch {
    return d;
  }
}

function fmtCnpj(c: string | null) {
  if (!c) return "—";
  const limpo = c.replace(/\D/g, "");
  if (limpo.length !== 14) return c;
  return `${limpo.slice(0, 2)}.${limpo.slice(2, 5)}.${limpo.slice(5, 8)}/${limpo.slice(8, 12)}-${limpo.slice(12)}`;
}

export default async function ContratosCamaraPage() {
  const [contratos, stats] = await Promise.all([
    fetchContratosCamara(200),
    fetchContratosStats(),
  ]);

  return (
    <div className="container py-6 md:py-10 max-w-5xl space-y-6">
      <Link href="/transparencia" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Transparência
      </Link>

      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground inline-flex items-center gap-2">
          <Briefcase className="w-7 h-7 text-orange-600" />
          Contratos da Câmara
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Contratos firmados pela Câmara Municipal de Piracanjuba (Poder
          Legislativo) com fornecedores, objeto e valor. Inclui aquisição de
          bens, serviços, locações e obras. Atualização mensal automática via
          portal LAI.
        </p>
      </header>

      {/* Alerta cívico: contratos × empresas em CEIS/CNEP (cruzamento Portal da Transparência Federal) */}
      <AlertaContratosSancao />

      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="stat-card">
              <p className="text-xs uppercase text-muted-foreground tracking-wider">Total contratos</p>
              <p className="text-2xl font-extrabold text-orange-700 mt-0.5">{stats.total}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs uppercase text-muted-foreground tracking-wider">Em vigor</p>
              <p className="text-2xl font-extrabold text-emerald-700 mt-0.5">{stats.em_vigor}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs uppercase text-muted-foreground tracking-wider">Valor total</p>
              <p className="text-base font-extrabold text-foreground mt-0.5">{fmtBRL(stats.total_valor)}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs uppercase text-muted-foreground tracking-wider">Fornecedores</p>
              <p className="text-2xl font-extrabold text-foreground mt-0.5">{stats.top_fornecedores.length}+</p>
            </div>
          </div>

          {/* Por ano */}
          <section className="stat-card space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Contratos por ano</h2>
            <div className="space-y-1.5">
              {stats.por_ano.map((a) => (
                <div key={a.ano} className="flex items-center gap-3 text-sm">
                  <span className="font-bold text-foreground w-12">{a.ano}</span>
                  <span className="text-muted-foreground text-sm w-20">{a.qtde} contratos</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500"
                      style={{
                        width: `${Math.max(5, (a.soma / Math.max(...stats.por_ano.map((x) => x.soma))) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="font-mono text-sm text-orange-700 w-28 text-right">{fmtBRL(a.soma)}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Top fornecedores */}
          <section className="stat-card space-y-3">
            <h2 className="text-lg font-semibold text-foreground inline-flex items-center gap-2">
              <Building2 className="w-5 h-5 text-orange-600" />
              Top 10 fornecedores
            </h2>
            <p className="text-sm text-muted-foreground">
              Empresas que mais receberam pagamentos da Câmara (soma de contratos por CNPJ).
            </p>
            <div className="space-y-2">
              {stats.top_fornecedores.map((f, i) => (
                <div key={f.cnpj ?? f.nome} className="flex items-start gap-3 p-2 rounded-lg border border-border bg-background/40">
                  <span className="text-lg font-bold text-orange-600 w-6">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{f.nome}</p>
                    <p className="text-xs text-muted-foreground font-mono">{fmtCnpj(f.cnpj)} · {f.qtde} contrato{f.qtde > 1 ? "s" : ""}</p>
                  </div>
                  <p className="text-sm font-bold text-orange-700 whitespace-nowrap">{fmtBRL(f.soma)}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Contratos detalhados</h2>
        <p className="text-sm text-muted-foreground">Mostrando {contratos.length} contratos mais recentes.</p>
        <GruposContratosAviso poder="camara" />
        {contratos.map((c) => (
          <article key={c.id} className="stat-card hover:border-orange-500/30 transition-colors">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-orange-700">{c.label}</span>
                {c.situacao && (
                  <span className={`text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    c.situacao.toLowerCase().includes("vigor")
                      ? "bg-emerald-500/15 text-emerald-700"
                      : "bg-slate-500/15 text-slate-700"
                  }`}>
                    {c.situacao}
                  </span>
                )}
              </div>
              <p className="font-bold text-orange-700 inline-flex items-center gap-1 text-sm">
                <DollarSign className="w-3.5 h-3.5" />
                {fmtBRL(c.valor)}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground">{c.fornecedor_nome}</p>
              <SituacaoCadastralBadge
                situacao={c.empresa_situacao_cadastral}
                razaoSocial={c.empresa_razao_social}
                cnae={c.empresa_cnae_descricao}
              />
              <GrupoEconomicoBadgeAuto cnpj={c.fornecedor_cnpj} />
            </div>
            {c.empresa_razao_social &&
              c.empresa_razao_social.trim().toUpperCase() !==
                c.fornecedor_nome.trim().toUpperCase() && (
                <p className="text-xs text-muted-foreground">
                  Razão social: <span className="font-medium text-foreground/80">{c.empresa_razao_social}</span>
                </p>
              )}
            <p className="text-xs text-muted-foreground font-mono mb-1">{fmtCnpj(c.fornecedor_cnpj)}</p>
            {c.objeto && (
              <p className="text-sm text-foreground/85 leading-relaxed mt-1">
                {c.objeto.length > 240 ? c.objeto.slice(0, 240) + "..." : c.objeto}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
              {c.inicio_vigencia && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Vigência: {fmtDate(c.inicio_vigencia)} → {fmtDate(c.fim_vigencia)}
                </span>
              )}
              {c.fiscal_contrato && (
                <span>Fiscal: <strong>{c.fiscal_contrato}</strong></span>
              )}
              {c.tipo && <span>Tipo: {c.tipo}</span>}
              {(c.empresa_municipio || c.empresa_uf) && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {[c.empresa_municipio, c.empresa_uf].filter(Boolean).join("/")}
                </span>
              )}
              {c.empresa_cnae_descricao && (
                <span title={c.empresa_cnae_descricao}>
                  CNAE: <span className="text-foreground/70">
                    {c.empresa_cnae_descricao.length > 50
                      ? c.empresa_cnae_descricao.slice(0, 50) + "..."
                      : c.empresa_cnae_descricao}
                  </span>
                </span>
              )}
            </div>
          </article>
        ))}
      </section>

      <footer className="text-sm text-muted-foreground border-t border-border pt-4">
        <p>
          Dados sincronizados mensalmente do portal LAI Centi da Câmara. Filtro
          aplicado: Poder Legislativo (órgão 3).
        </p>
      </footer>
    </div>
  );
}
