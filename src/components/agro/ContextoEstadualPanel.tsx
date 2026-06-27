"use client";

import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Map, TrendingUp, Milk } from "lucide-react";
import { SOJA_GOIAS, LEITE_PIRA_VS_GOIAS } from "@/lib/data/series-historicas";

const COR_AREA = "#16a34a";
const COR_PROD = "#b45309";
const COR_PIRA = "#0ea5e9";
const COR_GOIAS = "#16a34a";

function nf(v: number): string {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function SubHeader({ title, icon: Icon, description }: { title: string; icon: typeof Map; description?: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        {title}
      </h3>
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
    </div>
  );
}

export default function ContextoEstadualPanel() {
  const sojaIni = SOJA_GOIAS[0];
  const sojaFim = SOJA_GOIAS[SOJA_GOIAS.length - 1];
  const multProd = sojaFim.producaoT / sojaIni.producaoT;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Map className="w-4 h-4 text-primary" />
          </div>
          Piracanjuba dentro de Goiás
        </h2>
        <p className="text-xs text-muted-foreground mt-1 ml-10">
          O município é parte de um movimento estadual: a soja que explodiu em Goiás e a bacia leiteira que se reconfigurou.
        </p>
      </div>

      {/* 1. Soja em Goiás */}
      <div className="stat-card">
        <SubHeader
          title="A explosão da soja em Goiás (1975–2024)"
          icon={TrendingUp}
          description="Área plantada (verde, eixo esquerdo) e produção (laranja, eixo direito) no estado."
        />
        <ResponsiveContainer width="100%" height={290}>
          <ComposedChart data={SOJA_GOIAS} margin={{ left: 0, right: 8, top: 6, bottom: 4 }}>
            <defs>
              <linearGradient id="gradSojaGo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COR_AREA} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COR_AREA} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="ano" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="area" tick={{ fontSize: 10 }} width={46} tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(1)}M`} />
            <YAxis yAxisId="prod" orientation="right" tick={{ fontSize: 10 }} width={46} tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(0)}M`} />
            <Tooltip
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
              formatter={(v: number, name: string) =>
                name === "areaHa" ? [`${nf(v)} ha`, "Área plantada"] : [`${nf(v)} t`, "Produção"]
              }
              labelFormatter={(l) => `Ano ${l}`}
            />
            <Area yAxisId="area" type="monotone" dataKey="areaHa" stroke={COR_AREA} strokeWidth={2.4} fill="url(#gradSojaGo)" />
            <Line yAxisId="prod" type="monotone" dataKey="producaoT" stroke={COR_PROD} strokeWidth={2.4} strokeDasharray="5 4" dot={{ r: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
        <p className="text-xs text-foreground/80 mt-3 leading-relaxed">
          A produção de soja em Goiás saltou de <strong>{nf(sojaIni.producaoT)} t</strong> (1975) para{" "}
          <strong>{nf(sojaFim.producaoT)} t</strong> (2024), um aumento de mais de <strong>{multProd.toFixed(0)} vezes</strong>.
          Piracanjuba é uma peça desse tabuleiro, no eixo da microrregião Meia Ponte.
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">Fonte: IBGE — Produção Agrícola Municipal (tabela 1612), série compatível com a CONAB.</p>
      </div>

      {/* 2. Leite Piracanjuba vs Goiás */}
      <div className="stat-card">
        <SubHeader
          title="Leite: Piracanjuba recua enquanto Goiás cresce (1990–2023)"
          icon={Milk}
          description="Produção de leite de Piracanjuba (azul, eixo esquerdo) vs Goiás (verde, eixo direito), em milhões de litros."
        />
        <ResponsiveContainer width="100%" height={290}>
          <ComposedChart data={LEITE_PIRA_VS_GOIAS} margin={{ left: 0, right: 8, top: 6, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="ano" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="pira" tick={{ fontSize: 10 }} width={44} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}mi`} />
            <YAxis yAxisId="goias" orientation="right" tick={{ fontSize: 10 }} width={46} tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(1)}bi`} />
            <Tooltip
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
              formatter={(v: number, name: string) =>
                name === "piraMilL"
                  ? [`${nf(v / 1000)} mi litros`, "Piracanjuba"]
                  : [`${nf(v / 1000)} mi litros`, "Goiás"]
              }
              labelFormatter={(l) => `Ano ${l}`}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => (v === "piraMilL" ? "Piracanjuba" : "Goiás")} />
            <Line yAxisId="pira" type="monotone" dataKey="piraMilL" stroke={COR_PIRA} strokeWidth={2.6} dot={{ r: 2.5 }} />
            <Line yAxisId="goias" type="monotone" dataKey="goiasMilL" stroke={COR_GOIAS} strokeWidth={2.6} strokeDasharray="5 4" dot={{ r: 2.5 }} />
          </ComposedChart>
        </ResponsiveContainer>
        <p className="text-xs text-foreground/80 mt-3 leading-relaxed">
          Piracanjuba subiu até o pico de <strong>154,8 milhões de litros em 2014</strong> e depois recuou para{" "}
          <strong>83,5 milhões em 2023</strong>, enquanto Goiás mais que dobrou a produção desde 1990. O recuo local coincide
          com o avanço da soja sobre as terras de pastagem.
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">Fonte: IBGE — Pesquisa da Pecuária Municipal (tabela 74).</p>
      </div>
    </section>
  );
}
