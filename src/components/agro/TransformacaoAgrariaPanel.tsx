"use client";

import { useMemo } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, Leaf, Scale, Tractor, Info } from "lucide-react";
import {
  SOJA_AREA_PIRACANJUBA, SOJA_X_LEITE, ESTRUTURA_FUNDIARIA_2017, CONCENTRACAO_FUNDIARIA_2017,
} from "@/lib/data/series-historicas";

const COR_SOJA = "#16a34a";
const COR_LEITE = "#0ea5e9";
const COR_FAMILIAR = "#2e8b57";
const COR_NAOFAM = "#b0451f";

function nf(v: number): string {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function SubHeader({ title, icon: Icon, description }: { title: string; icon: typeof Leaf; description?: string }) {
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

export default function TransformacaoAgrariaPanel() {
  const tesoura = SOJA_X_LEITE;
  const sojaArea = SOJA_AREA_PIRACANJUBA;
  const ef = ESTRUTURA_FUNDIARIA_2017;

  const { sojaIni, sojaFim, leitePico, leiteFim, sojaMult } = useMemo(() => {
    const sIni = sojaArea.find((p) => p.ano === 1991) ?? sojaArea[0];
    const sFim = sojaArea[sojaArea.length - 1];
    const picoPt = tesoura.reduce((a, b) => (b.leiteMilLitros > a.leiteMilLitros ? b : a), tesoura[0]);
    const lFim = tesoura[tesoura.length - 1];
    return {
      sojaIni: sIni,
      sojaFim: sFim,
      leitePico: picoPt,
      leiteFim: lFim,
      sojaMult: sFim.ha / sIni.ha,
    };
  }, [sojaArea, tesoura]);

  const estabData = [
    { nome: "Agricultura familiar", valor: ef.familiar.estabelecimentos, cor: COR_FAMILIAR },
    { nome: "Não familiar", valor: ef.naoFamiliar.estabelecimentos, cor: COR_NAOFAM },
  ];
  const areaData = [
    { nome: "Agricultura familiar", valor: ef.familiar.areaHa, cor: COR_FAMILIAR },
    { nome: "Não familiar", valor: ef.naoFamiliar.areaHa, cor: COR_NAOFAM },
  ];
  const pctFamEstab = (ef.familiar.estabelecimentos / ef.totalEstabelecimentos) * 100;
  const pctFamArea = (ef.familiar.areaHa / (ef.familiar.areaHa + ef.naoFamiliar.areaHa)) * 100;
  // % oficial da área arrendada (Censo Agro 2017, tabela 6753) — fonte única, igual ao painel de concentração.
  const pctArrend = CONCENTRACAO_FUNDIARIA_2017.condicaoLegal.find((c) => c.tipo === "Arrendadas")?.pct ?? 15.5;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          A transformação agrária de Piracanjuba (1985–2024)
        </h2>
        <p className="text-sm text-muted-foreground mt-1 ml-10">
          Séries históricas longas do IBGE: o avanço da soja, o recuo do leite e a estrutura da terra.
        </p>
      </div>

      {/* 1. Tesoura soja x leite */}
      <div className="stat-card">
        <SubHeader
          title="Avanço da soja e recuo do leite (2000–2024)"
          icon={Scale}
          description="Área plantada de soja (verde, eixo esquerdo) vs produção de leite (azul, eixo direito)."
        />
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={tesoura} margin={{ left: 0, right: 8, top: 6, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="ano" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="soja" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k ha`} width={48} />
            <YAxis yAxisId="leite" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}mi L`} width={48} />
            <Tooltip
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
              formatter={(v: number, name: string) =>
                name === "sojaHa"
                  ? [`${nf(v)} ha`, "Soja (área plantada)"]
                  : [`${nf(v / 1000)} mi litros`, "Leite (produção)"]
              }
              labelFormatter={(l) => `Ano ${l}`}
            />
            <Line yAxisId="soja" type="monotone" dataKey="sojaHa" stroke={COR_SOJA} strokeWidth={2.6} dot={{ r: 2 }} />
            <Line yAxisId="leite" type="monotone" dataKey="leiteMilLitros" stroke={COR_LEITE} strokeWidth={2.6} strokeDasharray="5 4" dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-sm text-foreground/80 mt-3 leading-relaxed">
          Entre 2000 e 2024 a área de soja saltou de <strong>{nf(tesoura[0].sojaHa)} ha</strong> para{" "}
          <strong>{nf(leiteFim.sojaHa)} ha</strong>, enquanto a produção de leite, após o pico de{" "}
          <strong>{nf(leitePico.leiteMilLitros / 1000)} milhões de litros</strong> em {leitePico.ano}, recuou para{" "}
          <strong>{nf(leiteFim.leiteMilLitros / 1000)} milhões</strong> em {leiteFim.ano}. É a substituição da
          pecuária leiteira pelos grãos no município.
        </p>
        <p className="text-xs text-muted-foreground mt-1">Fonte: IBGE — PAM (tabela 1612) e PPM (tabela 74).</p>
      </div>

      {/* 2. Soja área longo prazo */}
      <div className="stat-card">
        <SubHeader
          title="Área plantada de soja em 40 anos"
          icon={Leaf}
          description="A lavoura que redesenhou o campo de Piracanjuba."
        />
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={sojaArea} margin={{ left: 0, right: 8, top: 6, bottom: 4 }}>
            <defs>
              <linearGradient id="gradSojaHist" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COR_SOJA} stopOpacity={0.32} />
                <stop offset="95%" stopColor={COR_SOJA} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="ano" tick={{ fontSize: 12 }} ticks={[1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020, 2024]} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} width={40} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${nf(v)} ha`, "Área plantada"]} labelFormatter={(l) => `Ano ${l}`} />
            <Area type="monotone" dataKey="ha" stroke={COR_SOJA} strokeWidth={2.4} fill="url(#gradSojaHist)" />
          </AreaChart>
        </ResponsiveContainer>
        <p className="text-sm text-foreground/80 mt-3 leading-relaxed">
          A área plantada de soja multiplicou-se cerca de <strong>{sojaMult.toFixed(0)} vezes</strong> desde 1991
          ({nf(sojaIni.ha)} ha) até {sojaFim.ano} (<strong>{nf(sojaFim.ha)} ha</strong>).
        </p>
        <p className="text-xs text-muted-foreground mt-1">Fonte: IBGE — Produção Agrícola Municipal (tabela 1612).</p>
      </div>

      {/* 3. Estrutura fundiária Censo Agro 2017 */}
      <div className="stat-card">
        <SubHeader
          title="Estrutura fundiária — Censo Agropecuário 2017"
          icon={Tractor}
          description="Quem são os estabelecimentos e quanta terra ocupam."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1 text-center">Estabelecimentos</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={estabData} margin={{ left: 0, right: 8, top: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={36} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [nf(v), "Estabelecimentos"]} />
                <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                  {estabData.map((d) => <Cell key={d.nome} fill={d.cor} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1 text-center">Área ocupada (ha)</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={areaData} margin={{ left: 0, right: 8, top: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} width={36} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${nf(v)} ha`, "Área"]} />
                <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                  {areaData.map((d) => <Cell key={d.nome} fill={d.cor} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-background p-2.5 text-center">
            <p className="text-lg font-bold text-foreground">{pctFamEstab.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">dos estabelecimentos são familiares</p>
          </div>
          <div className="rounded-lg bg-background p-2.5 text-center">
            <p className="text-lg font-bold text-foreground">{pctFamArea.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">da área é da agricultura familiar</p>
          </div>
          <div className="rounded-lg bg-background p-2.5 text-center">
            <p className="text-lg font-bold text-foreground">{pctArrend.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</p>
            <p className="text-xs text-muted-foreground">da área é arrendada</p>
          </div>
        </div>
        <p className="text-sm text-foreground/80 mt-3 leading-relaxed inline-flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
          <span>
            Concentração fundiária: a agricultura familiar reúne a <strong>maioria dos produtores</strong> ({nf(ef.familiar.estabelecimentos)} de {nf(ef.totalEstabelecimentos)} estabelecimentos),
            mas ocupa só <strong>{pctFamArea.toFixed(0)}% da área</strong>. Os {nf(ef.naoFamiliar.estabelecimentos)} estabelecimentos não familiares controlam o restante.
          </span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">Fonte: IBGE — Censo Agropecuário 2017 (tabela 6753), critério da Lei 11.326/2006.</p>
      </div>
    </section>
  );
}
