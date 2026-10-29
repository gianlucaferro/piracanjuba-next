"use client";

import {
  AreaChart, Area, BarChart, Bar, Cell, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Activity, Baby, Building2, Bed, Droplets, HeartPulse, Stethoscope } from "lucide-react";
import {
  REDE_CNES, REDE_TOTAL, HOSPITAIS, COBERTURA_ESF, NATALIDADE,
  INTERNACOES_2025_CAUSAS, INTERNACOES_2025_TOTAL, INTERNACOES_2024_TOTAL,
  ESGOTO_2022, SANEAMENTO_TOTAL_DOM, AGUA_2022, LEITOS_1000,
} from "@/lib/data/saude-series";

const COR = {
  ubs: "#0d8a6a", hosp: "#1f6fb2", esf: "#0d7a8a", nasc: "#1f6fb2", pre: "#e0a526",
  int: "#b23a48", adequado: "#2e8b57", rud: "#c0392b", outro: "#9aa0a6", leito: "#0d7a8a", agua: "#2980b9",
};

function nf(v: number): string {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function SubHeader({ title, icon: Icon, description }: { title: string; icon: typeof Activity; description?: string }) {
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

function Fonte({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground mt-2">Fonte: {children}</p>;
}

export default function IndicadoresSaudePanel() {
  const ubs = REDE_CNES.find((r) => r.tipo.startsWith("UBS"))?.qtd ?? 0;
  const esgAdeq = ESGOTO_2022.filter((e) => e.adequado).reduce((s, e) => s + e.domicilios, 0);
  const esgRud = ESGOTO_2022.find((e) => e.categoria.includes("rudimentar"))?.domicilios ?? 0;
  const aguaRede = AGUA_2022[0].domicilios;
  const pctAguaRede = (aguaRede / SANEAMENTO_TOTAL_DOM) * 100;
  const pctEsgAdeq = (esgAdeq / SANEAMENTO_TOTAL_DOM) * 100;
  const pctRud = (esgRud / SANEAMENTO_TOTAL_DOM) * 100;
  const variacaoInt = ((INTERNACOES_2025_TOTAL - INTERNACOES_2024_TOTAL) / INTERNACOES_2024_TOTAL) * 100;

  const internacoes = [...INTERNACOES_2025_CAUSAS].sort((a, b) => a.n - b.n);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <HeartPulse className="w-4 h-4 text-primary" />
          </div>
          Indicadores de saude de Piracanjuba
        </h2>
        <p className="text-sm text-muted-foreground mt-1 ml-10">
          Rede de servicos, atencao primaria, natalidade, internacoes e determinantes, das fontes oficiais (DATASUS, IBGE, Ministerio da Saude).
        </p>
      </div>

      {/* Rede de saude - resumo */}
      <div className="stat-card">
        <SubHeader title="Rede de saude" icon={Building2} description={`${REDE_TOTAL} estabelecimentos cadastrados no CNES.`} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "UBS / Centros de Saude", valor: ubs, icon: Stethoscope },
            { label: "Hospitais gerais", valor: 2, icon: Building2 },
            { label: "Leitos (Hosp. Municipal)", valor: 34, icon: Bed },
            { label: "CAPS + SAMU + Acad. Saude", valor: 3, icon: Activity },
          ].map((s) => (
            <div key={s.label} className="rounded-lg bg-background border border-border p-3 text-center">
              <s.icon className="w-4 h-4 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold text-foreground">{s.valor}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {HOSPITAIS.map((h) => (
            <div key={h.cnes} className="rounded-lg bg-background border border-border p-3">
              <p className="text-sm font-semibold text-foreground">{h.nome}</p>
              <p className="text-xs text-muted-foreground">{h.natureza}{h.leitos ? ` · ${h.leitos} leitos` : ""} · CNES {h.cnes}</p>
            </div>
          ))}
        </div>
        <Fonte>Ministerio da Saude, CNES (Cadastro Nacional de Estabelecimentos de Saude), 2026.</Fonte>
      </div>

      {/* Cobertura ESF */}
      <div className="stat-card">
        <SubHeader title="Cobertura da Saude da Familia" icon={HeartPulse}
          description="Cobertura estimada da atencao primaria (e-Gestor AB). A serie municipal consolidada vai ate 2020." />
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={COBERTURA_ESF} margin={{ left: 0, right: 8, top: 6, bottom: 4 }}>
              <defs>
                <linearGradient id="gradEsf" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COR.esf} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COR.esf} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="ano" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} width={42} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${v}%`, "Cobertura eSF"]} labelFormatter={(l) => `Ano ${l}`} />
              <Area type="monotone" dataKey="pct" stroke={COR.esf} strokeWidth={2.6} fill="url(#gradEsf)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-foreground/80 mt-2">
          A cobertura subiu de cerca de <strong>70%</strong> (ate 2018) para <strong>98,5%</strong> (2019-2020).
          A serie tradicional por municipio foi descontinuada no e-Gestor apos 2020.
        </p>
        <Fonte>Ministerio da Saude, e-Gestor Atencao Basica (cobertura estimada de Saude da Familia).</Fonte>
      </div>

      {/* Natalidade + pre-natal */}
      <div className="stat-card">
        <SubHeader title="Natalidade e pre-natal" icon={Baby}
          description="Nascidos vivos (barras) e gestantes com 7+ consultas de pre-natal (linha)." />
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={NATALIDADE} margin={{ left: 0, right: 8, top: 6, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="ano" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="n" tick={{ fontSize: 11 }} width={40} />
              <YAxis yAxisId="p" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} width={42} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }}
                formatter={(v: number, name: string) => name === "nascidos" ? [nf(v), "Nascidos vivos"] : [`${v}%`, "Pre-natal 7+"]}
                labelFormatter={(l) => `Ano ${l}`} />
              <Bar yAxisId="n" dataKey="nascidos" fill={COR.nasc} fillOpacity={0.85} radius={[4, 4, 0, 0]} />
              <Line yAxisId="p" type="monotone" dataKey="prenatal7" stroke={COR.pre} strokeWidth={2.8} dot={{ r: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-foreground/80 mt-2">
          O pre-natal adequado (7+ consultas) avancou de <strong>49% (2010)</strong> para cerca de <strong>80% (2022-2024)</strong>,
          melhora consistente da atencao materno-infantil.
        </p>
        <Fonte>DATASUS, SINASC (nascidos vivos e pre-natal, por residencia da mae).</Fonte>
      </div>

      {/* Internacoes 2025 */}
      <div className="stat-card">
        <SubHeader title="Internacoes hospitalares (SUS), 2025" icon={Activity}
          description={`${nf(INTERNACOES_2025_TOTAL)} internacoes de residentes em 2025 (${variacaoInt.toFixed(0)}% vs 2024).`} />
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={internacoes} layout="vertical" margin={{ left: 0, right: 24, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="causa" width={150} tick={{ fontSize: 10.5 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [nf(v), "Internacoes 2025"]} />
              <Bar dataKey="n" radius={[0, 4, 4, 0]}>
                {internacoes.map((_, i) => <Cell key={i} fill={COR.int} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <Fonte>DATASUS, SIH/SUS (internacoes de residentes por capitulo CID-10, 2025), consulta direta ao TabNet.</Fonte>
      </div>

      {/* Saneamento */}
      <div className="stat-card">
        <SubHeader title="Saneamento basico (determinante de saude)" icon={Droplets}
          description="Acesso a agua e esgoto adequados reduz doencas de veiculacao hidrica." />
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-lg bg-background border border-border p-2.5 text-center">
            <p className="text-lg font-bold text-foreground">{pctAguaRede.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">agua de rede geral</p>
          </div>
          <div className="rounded-lg bg-background border border-border p-2.5 text-center">
            <p className="text-lg font-bold text-foreground">{pctEsgAdeq.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">esgoto adequado</p>
          </div>
          <div className="rounded-lg bg-background border border-border p-2.5 text-center">
            <p className="text-lg font-bold" style={{ color: COR.rud }}>{pctRud.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">fossa rudimentar</p>
          </div>
        </div>
        <div className="h-[210px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ESGOTO_2022} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="categoria" tick={{ fontSize: 9 }} interval={0} />
              <YAxis tick={{ fontSize: 11 }} width={44} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [nf(v) + " domicilios", "Esgoto"]} />
              <Bar dataKey="domicilios" radius={[4, 4, 0, 0]}>
                {ESGOTO_2022.map((e, i) => <Cell key={i} fill={e.adequado ? COR.adequado : COR.rud} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-foreground/80 mt-2">
          Apesar de {pctEsgAdeq.toFixed(0)}% dos domicilios terem esgotamento adequado, <strong>{pctRud.toFixed(0)}% ({nf(esgRud)} domicilios)</strong> ainda
          dependem de fossa rudimentar.
        </p>
        <Fonte>IBGE, Censo Demografico 2022 (abastecimento de agua e esgotamento sanitario).</Fonte>
      </div>

      {/* Leitos por 1000 */}
      <div className="stat-card">
        <SubHeader title="Leitos por 1.000 habitantes" icon={Bed}
          description="Considerando apenas os 34 leitos do Hospital Municipal (um piso); o total sobe com o Hospital Sao Vicente." />
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={LEITOS_1000} margin={{ left: 0, right: 8, top: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="rotulo" tick={{ fontSize: 9 }} interval={0} />
              <YAxis tick={{ fontSize: 11 }} width={36} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [v.toFixed(2), "Leitos/1.000 hab"]} />
              <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                {LEITOS_1000.map((l, i) => <Cell key={i} fill={l.destaque ? COR.leito : COR.outro} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <Fonte>Leitos do Hospital Municipal (documento da prefeitura, 2025) e populacao IBGE 2022; referencias nacionais CNES/Demografia Medica.</Fonte>
      </div>

      <p className="text-xs text-muted-foreground italic">
        Atualidade: agravos (dengue), internacoes (SIH) e a rede (CNES) estao em 2025-2026; mortalidade e natalidade (SIM/SINASC) tem
        defasagem de 1 a 2 anos. Dados compilados de fontes oficiais para o dossie de saude de Piracanjuba.
      </p>
    </div>
  );
}
