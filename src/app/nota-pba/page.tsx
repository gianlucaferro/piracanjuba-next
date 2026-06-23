import { pageMetadata } from "@/lib/seo";
import { NOTA_PNTP, type PoderNota } from "@/data/notaTransparencia";
import { Trophy, ExternalLink, Download, Building2, Landmark, Scale } from "lucide-react";

export const metadata = pageMetadata({
  title: "Nota de transparência de Piracanjuba GO — Ranking PNTP 2025",
  description:
    "Em 2025, Piracanjuba ficou em 231º de 246 municípios de Goiás no Ranking da Transparência (PNTP/ATRICON). Veja a nota da Prefeitura e da Câmara, o ranking estadual e a fonte oficial.",
  path: "/nota-pba",
});

const N = NOTA_PNTP;

const pct = (x: number | null) =>
  x == null ? "—" : `${(x * 100).toFixed(2).replace(".", ",")}%`;
const pct1 = (x: number | null) =>
  x == null ? "—" : `${(x * 100).toFixed(1).replace(".", ",")}%`;

const nivelColor: Record<string, string> = {
  Diamante: "#22d3ee",
  Ouro: "#d4af37",
  Prata: "#94a3b8",
  Elevado: "#16a34a",
  Intermediário: "#e08e0b",
  Básico: "#ea580c",
  Inicial: "#dc2626",
  Inexistente: "#7f1d1d",
  "Não Avaliado": "#9ca3af",
};

const datasetJsonLd = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Nota de transparência de Piracanjuba (PNTP 2025)",
  description:
    "Resultado do município de Piracanjuba-GO no Programa Nacional de Transparência Pública (PNTP) 2025 / Radar da Transparência da ATRICON.",
  isBasedOn: N.fonte.url,
  creator: { "@type": "Organization", name: "ATRICON / Tribunais de Contas" },
  temporalCoverage: "2025",
  spatialCoverage: "Piracanjuba, Goiás, Brasil",
};

function KpiCard({
  titulo,
  icon: Icon,
  poder,
  cor,
}: {
  titulo: string;
  icon: React.ElementType;
  poder: PoderNota;
  cor: string;
}) {
  return (
    <div className="stat-card flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-semibold text-foreground">{titulo}</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-3xl font-extrabold leading-none" style={{ color: cor }}>
            {pct(poder.indice)}
          </p>
          <p className="text-xs mt-1">
            Nível: <span className="font-semibold" style={{ color: cor }}>{poder.nivel}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground leading-none">{poder.posicao}º</p>
          <p className="text-xs text-muted-foreground mt-1">de {poder.total} em Goiás</p>
        </div>
      </div>
    </div>
  );
}

export default function NotaPBAPage() {
  const exec = N.executivo;
  const leg = N.legislativo;
  const ctx = N.contexto;
  const maxCount = Math.max(...ctx.niveisExec.map((n) => n.count));
  const W = N.rankingExec.length;
  const H = 100;
  const piraPos = exec.posicao;

  return (
    <div className="container py-8 max-w-3xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }} />

      <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-2">
        Nota <span className="text-[#25D366]">PBA</span>
      </p>
      <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3 leading-tight">
        Nota de transparência de Piracanjuba
      </h1>
      <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-6 max-w-2xl">
        O quão transparente Piracanjuba é? Todo ano os Tribunais de Contas avaliam os portais
        públicos do Brasil no <strong className="text-foreground">Programa Nacional de Transparência Pública (PNTP)</strong>,
        e o resultado vai para o <strong className="text-foreground">Radar da Transparência da ATRICON</strong>. Veja como a
        cidade se saiu.
      </p>

      {/* Frase em destaque */}
      <div className="stat-card border-amber-500/40 bg-amber-500/10 mb-6 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
          <Trophy className="w-5 h-5 text-amber-600" aria-hidden />
        </div>
        <p className="text-base md:text-lg text-foreground font-semibold leading-snug">
          Em {N.ano}, Piracanjuba ficou na{" "}
          <span className="text-amber-700 dark:text-amber-400">{exec.posicao}ª posição de {exec.total}</span>{" "}
          municípios de Goiás no Ranking da Transparência.
        </p>
      </div>

      {/* KPI cards */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <KpiCard titulo="Prefeitura (Executivo)" icon={Building2} poder={exec} cor="#dc2626" />
        <KpiCard titulo="Câmara (Legislativo)" icon={Landmark} poder={leg} cor="#e08e0b" />
      </div>

      {/* Onde Piracanjuba está */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-foreground mb-1">Onde Piracanjuba está entre as prefeituras de Goiás</h2>
        <p className="text-sm text-muted-foreground mb-3">
          As {W} prefeituras de Goiás ordenadas da maior para a menor nota de transparência. A barra vermelha é Piracanjuba.
        </p>
        <div className="stat-card">
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-40" role="img"
            aria-label={`Piracanjuba ocupa a ${piraPos}a posicao de ${W} prefeituras de Goias`}>
            <line x1="0" y1={H * (1 - 0.75)} x2={W} y2={H * (1 - 0.75)} stroke="#16a34a" strokeWidth="0.4" strokeDasharray="2 2" opacity="0.7" />
            <line x1="0" y1={H * (1 - ctx.mediaExec)} x2={W} y2={H * (1 - ctx.mediaExec)} stroke="#334155" strokeWidth="0.4" strokeDasharray="2 2" opacity="0.6" />
            {N.rankingExec.map((r) => {
              const i = r.pos - 1;
              const isP = r.pos === piraPos;
              const h = r.idx * H;
              return <rect key={r.pos} x={i} y={H - h} width="0.92" height={h} fill={isP ? "#dc2626" : r.idx >= 0.75 ? "#86c7a0" : "#cbd5e1"} />;
            })}
            <line x1={piraPos - 0.5} y1="0" x2={piraPos - 0.5} y2={H} stroke="#dc2626" strokeWidth="0.5" opacity="0.85" />
          </svg>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-[#16a34a]" /> 75% = faixa de selo</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-slate-600" /> média de Goiás: {pct1(ctx.mediaExec)}</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 bg-[#dc2626] rounded-sm" /> Piracanjuba: {piraPos}º · {pct1(exec.indice)}</span>
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
            <span>← mais transparentes</span>
            <span>menos transparentes →</span>
          </div>
        </div>
      </section>

      {/* Distribuição por nível */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-foreground mb-1">As {exec.total} prefeituras de Goiás por nível</h2>
        <p className="text-sm text-muted-foreground mb-3">
          A maioria das cidades goianas está no nível <strong className="text-foreground">Elevado</strong>. Piracanjuba caiu na
          faixa <strong className="text-amber-600">Intermediário</strong>, abaixo do grosso do estado.
        </p>
        <div className="stat-card space-y-1.5">
          {ctx.niveisExec.map((n) => {
            const isP = n.nivel === exec.nivel;
            return (
              <div key={n.nivel} className="flex items-center gap-2 text-xs">
                <span className="w-24 shrink-0 text-right text-muted-foreground">{n.nivel}</span>
                <div className="flex-1 h-4 rounded bg-muted/60 overflow-hidden">
                  <div className="h-full rounded" style={{ width: `${(n.count / maxCount) * 100}%`, background: nivelColor[n.nivel] || "#9ca3af" }} />
                </div>
                <span className="w-7 text-right text-foreground tabular-nums">{n.count}</span>
                {isP && <span className="text-amber-600 font-semibold whitespace-nowrap text-[11px]">← Piracanjuba</span>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Vizinhos + resumo */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="stat-card">
          <h3 className="text-sm font-semibold text-foreground mb-2">Vizinhos no ranking (Executivo)</h3>
          <div className="space-y-0.5">
            {ctx.vizinhosExec.map((v) => {
              const isP = v.pos === exec.posicao;
              return (
                <div key={v.pos} className={`flex items-center justify-between text-sm py-1 px-2 rounded ${isP ? "bg-red-500/10" : ""}`}>
                  <span className={isP ? "font-semibold text-red-600 dark:text-red-400" : "text-foreground"}>
                    <span className="text-muted-foreground tabular-nums">{v.pos}º</span> {v.mun}{isP ? " ◄" : ""}
                  </span>
                  <span className={`tabular-nums ${isP ? "font-semibold text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>{pct1(v.idx)}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="stat-card">
          <h3 className="text-sm font-semibold text-foreground mb-2">Resumo (Executivo, Goiás)</h3>
          <dl className="space-y-1.5 text-sm">
            {[
              ["Índice de Piracanjuba", pct(exec.indice)],
              ["Nível", exec.nivel],
              ["Posição em Goiás", `${exec.posicao}º de ${exec.total}`],
              ["Critérios essenciais", pct(exec.essenciais)],
              ["Média das prefeituras GO", pct(ctx.mediaExec)],
              ["1º lugar de Goiás", `${ctx.primeiroExec.mun} · ${pct1(ctx.primeiroExec.indice)}`],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-semibold text-foreground text-right">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* O que significa */}
      <section className="stat-card mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Scale className="w-4 h-4 text-primary" />
          <h2 className="text-base font-bold text-foreground">O que significa esse resultado</h2>
        </div>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
          <p>
            O PNTP mede a <strong className="text-foreground">transparência ativa</strong>: o que o poder público publica
            por conta própria no portal (receitas, despesas, contratos, licitações, folha, prestação de contas, etc.).
            A escala, do melhor para o pior, é: Diamante, Ouro, Prata (os selos, acima de 75%), depois Elevado,
            Intermediário, Básico, Inicial e Inexistente.
          </p>
          <p>
            A média das prefeituras de Goiás é <strong className="text-foreground">{pct1(ctx.mediaExec)}</strong>
            {" "}(nível Elevado). Piracanjuba ficou em <strong className="text-foreground">{pct1(exec.indice)}</strong>,
            nível Intermediário, <strong className="text-foreground">{exec.posicao}ª de {exec.total}</strong>. Não é só
            estar abaixo da média: é estar entre as cidades menos transparentes do estado, enquanto a maioria já
            cumpre boa parte do que a lei exige.
          </p>
        </div>
      </section>

      {/* Ranking completo */}
      <section className="mb-8">
        <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
          <h2 className="text-xl font-bold text-foreground">Ranking completo das prefeituras de Goiás</h2>
          <a href="#pos-piracanjuba" className="text-sm font-medium text-primary hover:underline shrink-0">
            Pular para Piracanjuba ({exec.posicao}º) ↓
          </a>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          As {exec.total} prefeituras de Goiás avaliadas no PNTP {N.ano}, do 1º ao último lugar por índice de transparência. Piracanjuba está destacada.
        </p>
        <div className="stat-card p-0 overflow-hidden">
          <div className="overflow-auto max-h-[600px]">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="sticky top-0 z-10 bg-card text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border">
                  <th className="text-left font-semibold px-3 py-2 w-14">#</th>
                  <th className="text-left font-semibold px-3 py-2">Município</th>
                  <th className="text-left font-semibold px-3 py-2">Nível</th>
                  <th className="text-right font-semibold px-3 py-2">Índice</th>
                </tr>
              </thead>
              <tbody>
                {N.rankingExec.map((r) => {
                  const isP = r.pos === exec.posicao;
                  return (
                    <tr
                      key={r.pos}
                      id={isP ? "pos-piracanjuba" : undefined}
                      className={`border-t border-border/60 ${isP ? "bg-red-500/15 scroll-mt-24" : "odd:bg-muted/20"}`}
                    >
                      <td className={`px-3 py-1.5 tabular-nums ${isP ? "font-bold text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>{r.pos}º</td>
                      <td className={`px-3 py-1.5 ${isP ? "font-bold text-red-600 dark:text-red-400" : "text-foreground"}`}>
                        {r.mun}
                        {isP && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-red-600 text-white text-[10px] font-semibold px-2 py-0.5 align-middle">
                            ◄ Piracanjuba
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        <span className="inline-flex items-center gap-1.5 text-xs text-foreground whitespace-nowrap">
                          <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: nivelColor[r.niv] || "#9ca3af" }} />
                          {r.niv}
                        </span>
                      </td>
                      <td className={`px-3 py-1.5 text-right tabular-nums ${isP ? "font-bold text-red-600 dark:text-red-400" : "text-foreground"}`}>{pct1(r.idx)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Fonte + PDF */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 border-t border-border pt-4">
        <a href="/Piracanjuba-PNTP-2025-Transparencia.pdf" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition">
          <Download className="w-4 h-4" /> Baixar relatório em PDF
        </a>
        <a href={N.fonte.url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
          <ExternalLink className="w-4 h-4" /> Fonte oficial: Radar da Transparência (ATRICON)
        </a>
      </div>
      <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
        Dados do PNTP {N.ano} (arquivo oficial <code>dados_pntp_2025.zip</code> → <code>avaliacoes_pntp_2025.xlsx</code>).
        A posição no ranking foi calculada por ordenação dos índices oficiais dos {exec.total} municípios de Goiás.
        O PNTP divulga o índice e o nível; a posição é uma leitura do Piracanjuba.ai a partir desses números.
      </p>
    </div>
  );
}
