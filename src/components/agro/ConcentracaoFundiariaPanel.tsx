"use client";

import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Scale, Landmark, Info } from "lucide-react";
import {
  CONCENTRACAO_FUNDIARIA_2017 as C,
  DISTRIBUICAO_TAMANHO_2017 as DIST,
} from "@/lib/data/series-historicas";

const COR_PROPRIA = "#2e8b57";
const COR_ARREND = "#d97706";
const COR_OUTRO = "#a3a3a3";
const COR_PORTE = ["#2e8b57", "#eab308", "#b0451f"];
const porteColor = (p: "pequena" | "media" | "grande"): string =>
  p === "pequena" ? COR_PORTE[0] : p === "media" ? COR_PORTE[1] : COR_PORTE[2];

function nf(v: number): string {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function SubHeader({ title, icon: Icon, description }: { title: string; icon: typeof Scale; description?: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        {title}
      </h3>
      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
    </div>
  );
}

export default function ConcentracaoFundiariaPanel() {
  const condicao = C.condicaoLegal.map((c) => ({
    ...c,
    cor: c.tipo === "Próprias" ? COR_PROPRIA : c.tipo === "Arrendadas" ? COR_ARREND : COR_OUTRO,
  }));
  const totalEstabPorte = C.porte.reduce((s, p) => s + p.estabelecimentos, 0);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Scale className="w-4 h-4 text-primary" />
          </div>
          Quem é dono da terra em Piracanjuba
        </h2>
        <p className="text-sm text-muted-foreground mt-1 ml-10">
          Concentração fundiária pelo Censo Agropecuário 2017: porte dos estabelecimentos e condição legal das terras.
        </p>
      </div>

      {/* 1. Gini + destaque de concentração */}
      <div className="stat-card">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg bg-gradient-to-br from-amber-50 to-transparent dark:from-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 p-3 text-center">
            <p className="text-3xl font-bold text-amber-700 dark:text-amber-400">≈ {C.giniTerra.toFixed(2).replace(".", ",")}</p>
            <p className="text-xs text-muted-foreground mt-1">Índice de Gini da terra (concentração forte)</p>
          </div>
          <div className="rounded-lg bg-background border p-3 text-center flex flex-col justify-center">
            <p className="text-2xl font-bold text-foreground">só 8%</p>
            <p className="text-xs text-muted-foreground mt-1">da área é da metade menor dos produtores</p>
          </div>
          <div className="rounded-lg bg-background border p-3 text-center flex flex-col justify-center">
            <p className="text-2xl font-bold text-foreground">{nf(C.arrendatarios)}</p>
            <p className="text-xs text-muted-foreground mt-1">estabelecimentos arrendatários</p>
          </div>
        </div>
        <p className="text-sm text-foreground/80 mt-3 leading-relaxed inline-flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
          <span>
            O Índice de Gini mede a desigualdade na posse da terra (0 = todos têm igual, 1 = um só dono). Em Piracanjuba ele
            fica em torno de <strong>0,70</strong>, faixa de concentração forte. É uma estimativa municipal a partir das classes
            de tamanho do Censo 2017, que tende a ser menor que o Gini nacional (0,86) calculado com microdados.
          </span>
        </p>
      </div>

      {/* 2. Porte dos estabelecimentos */}
      <div className="stat-card">
        <SubHeader
          title="Porte dos estabelecimentos"
          icon={Scale}
          description="Quantas unidades rurais existem em cada faixa de tamanho — Censo Agro 2017."
        />
        <div className="grid grid-cols-3 gap-2 mb-3">
          {C.porte.map((p, i) => (
            <div key={p.faixa} className="rounded-lg bg-background border p-2.5 text-center">
              <p className="text-lg font-bold text-foreground">{nf(p.estabelecimentos)}</p>
              <p className="text-xs text-muted-foreground leading-tight mt-0.5">{p.faixa}</p>
              <p className="text-xs font-medium" style={{ color: COR_PORTE[i] }}>
                {((p.estabelecimentos / totalEstabPorte) * 100).toFixed(0)}%
              </p>
            </div>
          ))}
        </div>
        <p className="text-sm font-medium text-muted-foreground mb-1">Detalhe por faixa de área (17 classes)</p>
        <ResponsiveContainer width="100%" height={Math.max(380, DIST.length * 23)}>
          <BarChart data={DIST} layout="vertical" margin={{ left: 0, right: 28, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="faixa" width={104} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [nf(v), "Estabelecimentos"]} />
            <Bar dataKey="estab" radius={[0, 5, 5, 0]}>
              {DIST.map((d, i) => <Cell key={i} fill={porteColor(d.porte)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: COR_PORTE[0] }} /> Pequenas (até 10 ha)</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: COR_PORTE[1] }} /> Médias (10 a 100 ha)</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: COR_PORTE[2] }} /> Grandes (mais de 100 ha)</span>
        </div>
        <p className="text-sm text-foreground/80 mt-2 leading-relaxed">
          A maioria das unidades é de pequeno e médio porte (a faixa de 20 a 50 ha sozinha tem 592), mas a área se concentra
          nas grandes: por isso o Gini fica alto mesmo com tantos produtores pequenos.
        </p>
        <p className="text-xs text-muted-foreground mt-1">Fonte: IBGE — Censo Agropecuário 2017 (tabela 6778).</p>
      </div>

      {/* 3. Condição legal das terras */}
      <div className="stat-card">
        <SubHeader
          title="Condição legal das terras"
          icon={Landmark}
          description="Como os produtores ocupam a terra que usam — próprias, arrendadas, comodato."
        />
        <ResponsiveContainer width="100%" height={Math.max(160, condicao.length * 40)}>
          <BarChart data={condicao} layout="vertical" margin={{ left: 0, right: 28, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k ha`} />
            <YAxis type="category" dataKey="tipo" width={130} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => [`${nf(v)} ha`, "Área"]}
            />
            <Bar dataKey="ha" radius={[0, 6, 6, 0]}>
              {condicao.map((c, i) => <Cell key={i} fill={c.cor} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-sm text-foreground/80 mt-2 leading-relaxed">
          <strong>15,5% da área</strong> (36.352 ha) é arrendada, traço marcante da soja na região: pecuaristas donos de
          pastagens arrendam a terra a produtores de grãos, com contratos muitas vezes pagos em sacas de soja por hectare.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Fonte: IBGE — Censo Agropecuário 2017 (tabela 6753). &apos;Em parceria&apos; foi omitido pelo IBGE por sigilo.
        </p>
      </div>
    </section>
  );
}
