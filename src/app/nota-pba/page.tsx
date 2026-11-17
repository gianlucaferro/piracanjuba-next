import { pageMetadata, SCHEMA_IDS } from "@/lib/seo";
import {
  NOTA_PNTP,
  MUNICIPIO,
  CORTE_ELEVADO,
  temSelo,
  vizinhosNoRanking,
  variacaoPosicao,
  nivelMaisComum,
  type PoderNota,
  type RankingItem,
} from "@/data/notaTransparencia";
import { Trophy, ExternalLink, Download, Building2, Landmark, Scale, History } from "lucide-react";

const N = NOTA_PNTP;
const A = N.anterior;

const pct = (x: number | null) =>
  x == null ? "sem dado" : `${(x * 100).toFixed(2).replace(".", ",")}%`;
// Diferença entre índices (frações) em pontos percentuais, com duas casas: 0.2038 vira "20,38".
const pontos = (x: number) => (Math.round(x * 10000) / 100).toFixed(2).replace(".", ",");
const pontosTexto = (x: number) => `${pontos(x)} ${Math.round(x * 10000) >= 200 ? "pontos percentuais" : "ponto percentual"}`;
const nivelTexto = (nivel: PoderNota["nivel"]) => (temSelo(nivel) ? `selo ${nivel}` : `nível ${nivel}`);

export const metadata = pageMetadata({
  title: `Nota de transparência de Piracanjuba (GO): Ranking da Transparência ${N.ano}`,
  description:
    `Ranking da Transparência ${N.ano} do TCM-GO (PNTP): Prefeitura de Piracanjuba em ${N.executivo.posicao}º de ${N.executivo.total} municípios de Goiás, com ${pct(N.executivo.indice)}; ` +
    `Câmara em ${N.legislativo.posicao}º, ${nivelTexto(N.legislativo.nivel)}. Em ${A.ano}, a Prefeitura foi ${A.executivo.posicao}º.`,
  path: "/nota-pba",
});

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

// Cor do número no card: selo e Elevado em verde, Intermediário em âmbar, abaixo disso em vermelho.
const corDoNivel = (nivel: PoderNota["nivel"]) =>
  temSelo(nivel) || nivel === "Elevado" ? "#16a34a" : nivel === "Intermediário" ? "#e08e0b" : "#dc2626";

const datasetJsonLd = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: `Ranking da Transparência ${N.ano} de Piracanjuba (PNTP, TCM-GO)`,
  description:
    `Posição, índice geral, índice essencial e nível de transparência da Prefeitura e da Câmara de Piracanjuba-GO no Ranking da Transparência ${N.ano} do TCM-GO ` +
    `(Programa Nacional de Transparência Pública, ATRICON), com o ranking completo dos ${N.executivo.total} municípios de Goiás e a comparação com ${A.ano}.`,
  url: "https://piracanjuba.ai/nota-pba",
  inLanguage: "pt-BR",
  isAccessibleForFree: true,
  keywords: "ranking da transparência, PNTP, TCM-GO, ATRICON, Piracanjuba, transparência pública",
  temporalCoverage: `${A.ano}/${N.ano}`,
  spatialCoverage: "Goiás, Brasil",
  dateModified: N.conferidoEm,
  variableMeasured: [
    "Índice de transparência geral",
    "Índice de transparência essencial",
    "Nível de transparência",
    "Posição no ranking estadual",
  ],
  creator: [
    {
      "@type": "GovernmentOrganization",
      name: "Tribunal de Contas dos Municípios do Estado de Goiás (TCM-GO)",
      url: "https://www.tcmgo.tc.br",
    },
    {
      "@type": "Organization",
      name: "Associação dos Membros dos Tribunais de Contas do Brasil (ATRICON)",
      url: "https://atricon.org.br",
    },
  ],
  publisher: { "@type": "NewsMediaOrganization", "@id": SCHEMA_IDS.org, name: "Piracanjuba.ai", url: "https://piracanjuba.ai" },
  isBasedOn: [
    {
      "@type": "CreativeWork",
      name: `Ranking da Transparência ${N.ano}: Poder Executivo Municipal, Estado de Goiás`,
      url: N.fonte.rankingExecutivo,
      datePublished: N.publicadoEm,
      publisher: { "@type": "GovernmentOrganization", name: "TCM-GO" },
    },
    {
      "@type": "CreativeWork",
      name: `Ranking da Transparência ${N.ano}: Poder Legislativo Municipal, Estado de Goiás`,
      url: N.fonte.rankingLegislativo,
      datePublished: N.publicadoEm,
      publisher: { "@type": "GovernmentOrganization", name: "TCM-GO" },
    },
  ],
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
          <p className="text-sm mt-1">
            {temSelo(poder.nivel) ? "Selo" : "Nível"}: <span className="font-semibold" style={{ color: cor }}>{poder.nivel}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground leading-none">{poder.posicao}º</p>
          <p className="text-sm text-muted-foreground mt-1">de {poder.total} em Goiás</p>
        </div>
      </div>
    </div>
  );
}

function RankingTabela({ ranking, idDestaque }: { ranking: readonly RankingItem[]; idDestaque?: string }) {
  return (
    <div className="stat-card p-0 overflow-hidden">
      <div className="overflow-auto max-h-[600px]">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="sticky top-0 z-10 bg-card text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
              <th className="text-left font-semibold px-3 py-2 w-14">#</th>
              <th className="text-left font-semibold px-3 py-2">Município</th>
              <th className="text-left font-semibold px-3 py-2">Nível</th>
              <th className="text-right font-semibold px-3 py-2">Índice</th>
              <th className="hidden sm:table-cell text-right font-semibold px-3 py-2">Essencial</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((r) => {
              const isP = r.mun === MUNICIPIO;
              return (
                <tr
                  key={r.mun}
                  id={isP ? idDestaque : undefined}
                  className={`border-t border-border/60 ${isP ? "bg-red-500/15 scroll-mt-24" : "odd:bg-muted/20"}`}
                >
                  <td className={`px-3 py-1.5 tabular-nums ${isP ? "font-bold text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>{r.pos}º</td>
                  <td className={`px-3 py-1.5 ${isP ? "font-bold text-red-600 dark:text-red-400" : "text-foreground"}`}>
                    {r.mun}
                    {isP && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-red-600 text-white text-xs font-semibold px-2 py-0.5 align-middle">
                        ◄ Piracanjuba
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1.5">
                    <span className="inline-flex items-center gap-1.5 text-sm text-foreground whitespace-nowrap">
                      <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: nivelColor[r.niv] || "#9ca3af" }} />
                      {r.niv}
                    </span>
                  </td>
                  <td className={`px-3 py-1.5 text-right tabular-nums ${isP ? "font-bold text-red-600 dark:text-red-400" : "text-foreground"}`}>{pct(r.idx)}</td>
                  <td className="hidden sm:table-cell px-3 py-1.5 text-right tabular-nums text-muted-foreground">{pct(r.ess)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function linhaVariacao(antes: PoderNota, depois: PoderNota) {
  const pos = variacaoPosicao(antes.posicao, depois.posicao);
  const posTxt =
    pos > 0 ? `subiu ${pos} ${pos === 1 ? "posição" : "posições"}` : pos < 0 ? `caiu ${-pos} ${pos === -1 ? "posição" : "posições"}` : "mesma posição";
  const dif = depois.indice - antes.indice;
  const idxTxt = `${dif >= 0 ? "+" : "-"}${pontosTexto(Math.abs(dif))}`;
  return { posTxt, idxTxt };
}

export default function NotaPBAPage() {
  const exec = N.executivo;
  const leg = N.legislativo;
  const ctx = N.contexto;
  const maxCount = Math.max(...ctx.niveisExec.map((n) => n.count));
  const W = N.rankingExec.length;
  const H = 100;
  const piraIdx = N.rankingExec.findIndex((r) => r.mun === MUNICIPIO);
  const vizinhos = vizinhosNoRanking(N.rankingExec, MUNICIPIO, 3);
  const maisComum = nivelMaisComum(ctx.niveisExec);
  const mesmoNivel = ctx.niveisExec.find((n) => n.nivel === exec.nivel)?.count ?? 0;
  const ultimas = exec.total - exec.posicao + 1;
  const subiuExec = variacaoPosicao(A.executivo.posicao, exec.posicao) > 0;
  const comparacao = [
    { titulo: "Prefeitura (Executivo)", antes: A.executivo, depois: exec },
    { titulo: "Câmara (Legislativo)", antes: A.legislativo, depois: leg },
  ];

  return (
    <div className="container py-8 max-w-3xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd).replace(/</g, "\\u003c") }}
      />

      <p className="text-sm font-semibold uppercase tracking-wide text-primary mb-2">
        Nota <span className="text-[#25D366]">PBA</span>
      </p>
      <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3 leading-tight">
        Nota de transparência de Piracanjuba
      </h1>
      <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-6 max-w-2xl">
        O quão transparente Piracanjuba é? Todo ano os Tribunais de Contas avaliam os portais
        públicos do Brasil no <strong className="text-foreground">Programa Nacional de Transparência Pública (PNTP)</strong>,
        coordenado pela ATRICON. Em Goiás, o <strong className="text-foreground">TCM-GO</strong> avalia as prefeituras e
        as câmaras e divulga o Ranking da Transparência. Veja como a cidade se saiu.
      </p>

      {/* Frase em destaque */}
      <div className="stat-card border-amber-500/40 bg-amber-500/10 mb-6 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
          <Trophy className="w-5 h-5 text-amber-600" aria-hidden />
        </div>
        <div>
          <p className="text-base md:text-lg text-foreground font-semibold leading-snug">
            No Ranking da Transparência {N.ano}, a Prefeitura de Piracanjuba ficou na{" "}
            <span className="text-amber-700 dark:text-amber-400">{exec.posicao}ª posição entre os {exec.total}</span>{" "}
            municípios de Goiás, com índice de {pct(exec.indice)} ({nivelTexto(exec.nivel)}). A Câmara Municipal ficou em{" "}
            {leg.posicao}º, com {pct(leg.indice)} ({nivelTexto(leg.nivel)}).
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Divulgado pelo TCM-GO em{" "}
            <time dateTime={N.publicadoEm} className="tabular-nums">{N.publicadoEm}</time>. Em {A.ano}, a Prefeitura tinha
            ficado em {A.executivo.posicao}º e a Câmara em {A.legislativo.posicao}º.
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <KpiCard titulo={`Prefeitura (Executivo) · ${exec.ano}`} icon={Building2} poder={exec} cor={corDoNivel(exec.nivel)} />
        <KpiCard titulo={`Câmara (Legislativo) · ${leg.ano}`} icon={Landmark} poder={leg} cor={corDoNivel(leg.nivel)} />
      </div>

      {/* Comparação com o ciclo anterior */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <History className="w-4 h-4 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Comparação com {A.ano}</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Posição em Goiás, índice geral e nível de cada poder nos dois últimos rankings.
        </p>
        <div className="stat-card p-0 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                <th className="text-left font-semibold px-3 py-2">Poder</th>
                <th className="text-left font-semibold px-3 py-2">{A.ano}</th>
                <th className="text-left font-semibold px-3 py-2">{N.ano}</th>
                <th className="text-left font-semibold px-3 py-2">Variação</th>
              </tr>
            </thead>
            <tbody>
              {comparacao.map(({ titulo, antes, depois }) => {
                const v = linhaVariacao(antes, depois);
                return (
                  <tr key={titulo} className="border-t border-border/60 align-top">
                    <th scope="row" className="text-left font-semibold text-foreground px-3 py-2">{titulo}</th>
                    <td className="px-3 py-2 text-foreground">
                      <span className="tabular-nums">{antes.posicao}º · {pct(antes.indice)}</span>
                      <span className="block text-xs text-muted-foreground">{antes.nivel}</span>
                    </td>
                    <td className="px-3 py-2 text-foreground">
                      <span className="tabular-nums font-semibold">{depois.posicao}º · {pct(depois.indice)}</span>
                      <span className="block text-xs text-muted-foreground">{depois.nivel}</span>
                    </td>
                    <td className="px-3 py-2 text-foreground">
                      <span>{v.posTxt}</span>
                      <span className="block text-xs text-muted-foreground tabular-nums">{v.idxTxt} no índice</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
          Cada ciclo do PNTP tem a sua matriz de critérios (a de {N.ano} reúne 181 critérios em 22 dimensões, segundo o
          TCM-GO), então a comparação entre anos mostra a tendência, não uma diferença exata.
        </p>
      </section>

      {/* Onde Piracanjuba está */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-foreground mb-1">Onde Piracanjuba está entre as prefeituras de Goiás</h2>
        <p className="text-sm text-muted-foreground mb-3">
          As {W} prefeituras de Goiás ordenadas da maior para a menor nota de transparência em {N.ano}. A barra vermelha é Piracanjuba.
        </p>
        <div className="stat-card">
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-40" role="img"
            aria-label={`Piracanjuba ocupa a ${exec.posicao}a posicao de ${W} prefeituras de Goias`}>
            <line x1="0" y1={H * (1 - CORTE_ELEVADO)} x2={W} y2={H * (1 - CORTE_ELEVADO)} stroke="#16a34a" strokeWidth="0.4" strokeDasharray="2 2" opacity="0.7" />
            <line x1="0" y1={H * (1 - ctx.mediaExec)} x2={W} y2={H * (1 - ctx.mediaExec)} stroke="#334155" strokeWidth="0.4" strokeDasharray="2 2" opacity="0.6" />
            {N.rankingExec.map((r, i) => {
              const isP = i === piraIdx;
              const h = r.idx * H;
              return <rect key={r.mun} x={i} y={H - h} width="0.92" height={h} fill={isP ? "#dc2626" : r.idx >= CORTE_ELEVADO ? "#86c7a0" : "#cbd5e1"} />;
            })}
            <line x1={piraIdx + 0.5} y1="0" x2={piraIdx + 0.5} y2={H} stroke="#dc2626" strokeWidth="0.5" opacity="0.85" />
          </svg>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-[#16a34a]" /> 75% = mínimo para Elevado e selos</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-slate-600" /> média de Goiás: {pct(ctx.mediaExec)}</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 bg-[#dc2626] rounded-sm" /> Piracanjuba: {exec.posicao}º · {pct(exec.indice)}</span>
          </div>
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>← mais transparentes</span>
            <span>menos transparentes →</span>
          </div>
        </div>
      </section>

      {/* Distribuição por nível */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-foreground mb-1">As {exec.total} prefeituras de Goiás por nível</h2>
        <p className="text-sm text-muted-foreground mb-3">
          O nível mais comum entre as prefeituras goianas em {N.ano} é o <strong className="text-foreground">{maisComum.nivel}</strong>{" "}
          ({maisComum.count}), e {ctx.selosExec} das {exec.total} conquistaram selo (Diamante, Ouro ou Prata). Piracanjuba ficou na
          faixa <strong className="text-amber-600">{exec.nivel}</strong>, com outras {mesmoNivel - 1} prefeituras.
        </p>
        <div className="stat-card space-y-1.5">
          {ctx.niveisExec.map((n) => {
            const isP = n.nivel === exec.nivel;
            return (
              <div key={n.nivel} className="flex items-center gap-2 text-sm">
                <span className="w-24 shrink-0 text-right text-muted-foreground">{n.nivel}</span>
                <div className="flex-1 h-4 rounded bg-muted/60 overflow-hidden">
                  <div className="h-full rounded" style={{ width: `${(n.count / maxCount) * 100}%`, background: nivelColor[n.nivel] || "#9ca3af" }} />
                </div>
                <span className="w-7 text-right text-foreground tabular-nums">{n.count}</span>
                {isP && <span className="text-amber-600 font-semibold whitespace-nowrap text-xs">← Piracanjuba</span>}
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
            {vizinhos.map((v) => {
              const isP = v.mun === MUNICIPIO;
              return (
                <div key={v.mun} className={`flex items-center justify-between text-sm py-1 px-2 rounded ${isP ? "bg-red-500/10" : ""}`}>
                  <span className={isP ? "font-semibold text-red-600 dark:text-red-400" : "text-foreground"}>
                    <span className="text-muted-foreground tabular-nums">{v.pos}º</span> {v.mun}{isP ? " ◄" : ""}
                  </span>
                  <span className={`tabular-nums ${isP ? "font-semibold text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>{pct(v.idx)}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="stat-card">
          <h3 className="text-sm font-semibold text-foreground mb-2">Resumo (Executivo, Goiás, {N.ano})</h3>
          <dl className="space-y-1.5 text-sm">
            {[
              ["Índice de Piracanjuba", pct(exec.indice)],
              ["Nível", exec.nivel],
              ["Posição em Goiás", `${exec.posicao}º de ${exec.total}`],
              ["Critérios essenciais", pct(exec.essenciais)],
              ["Média das prefeituras GO", pct(ctx.mediaExec)],
              ["Prefeituras com selo", `${ctx.selosExec} de ${exec.total}`],
              ["1º lugar de Goiás", `${ctx.primeiroExec.mun} · ${pct(ctx.primeiroExec.indice)}`],
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
            A escala, do melhor para o pior, é: Diamante, Ouro, Prata (os selos, a partir de 75% e com 100% dos
            critérios essenciais), depois Elevado, Intermediário, Básico, Inicial e Inexistente.
          </p>
          <p>
            A média das prefeituras de Goiás em {N.ano} é <strong className="text-foreground">{pct(ctx.mediaExec)}</strong>.
            A Prefeitura de Piracanjuba ficou em <strong className="text-foreground">{pct(exec.indice)}</strong>, nível{" "}
            {exec.nivel}, <strong className="text-foreground">{exec.posicao}ª de {exec.total}</strong>
            {exec.indice < CORTE_ELEVADO && (
              <>
                , a {pontosTexto(CORTE_ELEVADO - exec.indice)} dos 75% do nível Elevado
              </>
            )}
            . Cumpriu {pct(exec.essenciais)} dos critérios essenciais; o selo exige 100%.{" "}
            {subiuExec ? `Mesmo com a melhora em relação a ${A.ano}, segue` : "Segue"} entre as {ultimas} últimas
            colocadas do estado, enquanto {ctx.selosExec} das {exec.total} prefeituras já têm selo.
          </p>
          <p>
            A Câmara Municipal ficou em <strong className="text-foreground">{leg.posicao}º</strong> entre as {leg.total} câmaras
            de Goiás, com {pct(leg.indice)} e {pct(leg.essenciais)} dos critérios essenciais
            {temSelo(leg.nivel) ? `, o que lhe deu o selo ${leg.nivel}` : `, nível ${leg.nivel}`}. Em {A.ano}, tinha ficado em{" "}
            {A.legislativo.posicao}º, nível {A.legislativo.nivel}.
          </p>
        </div>
      </section>

      {/* Ranking completo */}
      <section className="mb-8">
        <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
          <h2 className="text-xl font-bold text-foreground">Ranking completo das prefeituras de Goiás ({N.ano})</h2>
          <a href="#pos-piracanjuba" className="text-sm font-medium text-primary hover:underline shrink-0">
            Pular para Piracanjuba ({exec.posicao}º) ↓
          </a>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          As {exec.total} prefeituras de Goiás no Ranking da Transparência {N.ano} do TCM-GO, na ordem oficial. Empates no
          índice geral são desempatados pelo índice essencial; quem empata nos dois divide a posição. Piracanjuba está destacada.
        </p>
        <RankingTabela ranking={N.rankingExec} idDestaque="pos-piracanjuba" />
      </section>

      <details className="mb-8">
        <summary className="cursor-pointer text-base font-bold text-foreground hover:text-primary">
          Ranking completo das câmaras de Goiás ({N.ano}): Piracanjuba em {leg.posicao}º
        </summary>
        <p className="text-sm text-muted-foreground my-3">
          As {leg.total} câmaras municipais de Goiás no Ranking da Transparência {N.ano} do TCM-GO. Média das câmaras:{" "}
          {pct(ctx.mediaLeg)}; {ctx.selosLeg} conquistaram selo; 1º lugar: {ctx.primeiroLeg.mun} ({pct(ctx.primeiroLeg.indice)}).
        </p>
        <RankingTabela ranking={N.rankingLeg} idDestaque="pos-piracanjuba-camara" />
      </details>

      {/* Fonte + PDF */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 border-t border-border pt-4">
        <a href={N.fonte.rankingExecutivo} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition">
          <Download className="w-4 h-4" /> Ranking oficial das prefeituras (PDF do TCM-GO)
        </a>
        <a href={N.fonte.rankingLegislativo} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
          <Download className="w-4 h-4" /> Ranking oficial das câmaras (PDF do TCM-GO)
        </a>
        <a href={N.fonte.url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
          <ExternalLink className="w-4 h-4" /> Notícia do TCM-GO ({N.publicadoEm})
        </a>
        <a href={N.fonte.radar} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
          <ExternalLink className="w-4 h-4" /> Radar da Transparência (ATRICON)
        </a>
      </div>
      <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
        Dados do Ranking da Transparência {N.ano}, divulgado pelo TCM-GO em{" "}
        <time dateTime={N.publicadoEm}>{N.publicadoEm}</time>, com as posições oficiais. Em{" "}
        <time dateTime={N.conferidoEm}>{N.conferidoEm}</time>, os {exec.total} índices das prefeituras e os {leg.total} das
        câmaras foram conferidos um a um no Radar da Transparência da ATRICON, sem divergência. Os números de {A.ano} vêm do
        PNTP {A.ano} da ATRICON (arquivo <code>dados_pntp_2025.zip</code>) e batem com o ranking de {A.ano} do TCM-GO
        (<a href={A.fonte.rankingExecutivo} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">prefeituras</a>,{" "}
        <a href={A.fonte.rankingLegislativo} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">câmaras</a>).{" "}
        <a href={A.fonte.relatorioPdf} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          Relatório de Piracanjuba em {A.ano} (PDF, histórico)
        </a>.
      </p>
    </div>
  );
}
