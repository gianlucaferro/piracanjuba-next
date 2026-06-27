"use client";

import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { MapPin, Users, Sprout, Landmark, History, Info } from "lucide-react";
import {
  SUL_GOIANO_SOJA_2024, SUL_GOIANO_LEITE_2023, COMUNIDADES_RURAIS,
  PNAE_AGRICULTURA_FAMILIAR as PNAE, type MunicipioValor,
} from "@/lib/data/series-historicas";

const COR_SOJA = "#16a34a";
const COR_LEITE = "#0ea5e9";
const COR_OUTRO = "#a3a3a3";

function nf(v: number): string {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function rankPiracanjuba(rows: MunicipioValor[]): number {
  return [...rows].sort((a, b) => b.valor - a.valor).findIndex((r) => r.mun === "Piracanjuba") + 1;
}

function SubHeader({ title, icon: Icon, description }: { title: string; icon: typeof MapPin; description?: string }) {
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

function RankingBar({ rows, cor, unidade, fmtTick }: {
  rows: MunicipioValor[]; cor: string; unidade: string; fmtTick: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(170, rows.length * 30)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 0, right: 26, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fmtTick} />
        <YAxis type="category" dataKey="mun" width={108} tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${nf(v)} ${unidade}`, ""]} />
        <Bar dataKey="valor" radius={[0, 6, 6, 0]}>
          {rows.map((r) => <Cell key={r.mun} fill={r.mun === "Piracanjuba" ? cor : COR_OUTRO} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function TerritorioRuralPanel() {
  const soja = [...SUL_GOIANO_SOJA_2024].sort((a, b) => b.valor - a.valor);
  const leite = [...SUL_GOIANO_LEITE_2023].sort((a, b) => b.valor - a.valor);
  const rankSoja = rankPiracanjuba(SUL_GOIANO_SOJA_2024);
  const rankLeite = rankPiracanjuba(SUL_GOIANO_LEITE_2023);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          Território, comunidades e políticas
        </h2>
        <p className="text-sm text-muted-foreground mt-1 ml-10">
          Onde Piracanjuba se posiciona no Sul Goiano, suas comunidades rurais e a compra pública da agricultura familiar.
        </p>
      </div>

      {/* 1. Piracanjuba no Sul Goiano */}
      <div className="stat-card">
        <SubHeader
          title="Piracanjuba no Sul Goiano"
          icon={Sprout}
          description="Posição do município entre os vizinhos em soja e em leite."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Soja: área plantada (ha), 2024</p>
            <RankingBar rows={soja} cor={COR_SOJA} unidade="ha" fmtTick={(v) => `${(v / 1000).toFixed(0)}k`} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Leite: produção (mil litros), 2023</p>
            <RankingBar rows={leite} cor={COR_LEITE} unidade="mil L" fmtTick={(v) => `${(v / 1000).toFixed(0)}mi`} />
          </div>
        </div>
        <p className="text-sm text-foreground/80 mt-3 leading-relaxed inline-flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
          <span>
            Perfil produtivo duplo: Piracanjuba é <strong>{rankSoja}º em área de soja</strong> e{" "}
            <strong>{rankLeite}º em produção de leite</strong> entre os municípios vizinhos. É um dos poucos que combina
            a fronteira de grãos com a maior bacia leiteira da região.
          </span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">Fonte: IBGE — PAM (tabela 1612, soja 2024) e PPM (tabela 74, leite 2023).</p>
      </div>

      {/* 2. Comunidades rurais */}
      <div className="stat-card">
        <SubHeader
          title="Comunidades rurais"
          icon={Users}
          description="Localidades do campo de Piracanjuba documentadas na cartografia do IBGE e em estudos acadêmicos."
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {COMUNIDADES_RURAIS.map((c) => (
            <div key={c.nome} className="rounded-lg bg-background border p-3">
              <p className="text-sm font-semibold text-foreground">{c.nome}</p>
              <p className="text-xs font-medium text-primary mt-0.5">{c.tipo}</p>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{c.descricao}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Fonte: IBGE — Mapa Municipal Estatístico (Censo 2022) e estudos acadêmicos sobre a bacia do Piracanjuba.
        </p>
      </div>

      {/* 3. PNAE — agricultura familiar nas compras públicas */}
      <div className="stat-card border-l-4 border-l-amber-500">
        <SubHeader
          title="Agricultura familiar na merenda escolar (PNAE)"
          icon={Landmark}
          description="A Lei 11.947/2009 exige que pelo menos 30% dos recursos federais da merenda comprem da agricultura familiar."
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {PNAE.anos.map((a) => (
            <div key={a.ano} className="rounded-lg bg-background border p-3 text-center">
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{a.pct.toLocaleString("pt-BR")}%</p>
              <p className="text-xs text-muted-foreground mt-0.5">comprado da agricultura familiar em {a.ano}</p>
              <p className="text-xs text-muted-foreground mt-1">{brl(a.valorAF)} de {brl(a.valorTotal)}</p>
            </div>
          ))}
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 p-3 text-center flex flex-col justify-center">
            <p className="text-2xl font-bold text-foreground">{PNAE.minimoLegalPct}%</p>
            <p className="text-xs text-muted-foreground mt-0.5">é o mínimo exigido por lei</p>
          </div>
        </div>
        <p className="text-sm text-foreground/80 mt-3 leading-relaxed">
          Nos anos com planilhas consolidadas do FNDE, Piracanjuba ficou <strong>abaixo do mínimo legal de 30%</strong>:
          24,8% em 2013 e 11,8% em 2016. Ainda assim, há continuidade institucional: a Prefeitura abriu chamadas públicas
          para a agricultura familiar em {PNAE.chamadasRecentes.join(", ")}, sempre citando a Feira do Produtor como ponto
          de entrega. O percentual efetivamente executado nos anos recentes não foi localizado nas bases públicas consultadas.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Fonte: FNDE — planilhas de aquisição da agricultura familiar (2013, 2016); editais de chamada pública da Prefeitura de Piracanjuba.
        </p>
      </div>

      {/* 4. Como a soja chegou */}
      <div className="stat-card">
        <SubHeader
          title="Como a soja chegou ao Sul Goiano"
          icon={History}
          description="O contexto histórico por trás da transformação do campo de Piracanjuba."
        />
        <div className="space-y-2.5 text-sm text-foreground/80 leading-relaxed">
          <p>
            A soja era praticamente inexistente em Goiás em 1970. A expansão veio de programas federais de ocupação do
            Cerrado: o <strong>POLOCENTRO</strong> (1975) e o <strong>PRODECER</strong> (idealizado em 1974, implementado a
            partir de 1978), que ofereceram crédito subsidiado, infraestrutura e correção dos solos ácidos.
          </p>
          <p>
            Em paralelo, a Embrapa liderou a <strong>tropicalização da soja</strong>, adaptando a planta ao clima e ao solo
            do Cerrado. A microrregião Meia Ponte, onde fica Piracanjuba, virou eixo da expansão, apoiada na BR-153 e na
            chegada de produtores e capitais do Sul do país.
          </p>
          <p>
            O <strong>arrendamento de terras</strong> foi a chave: pecuaristas donos de grandes pastagens arrendaram a terra
            a produtores de grãos, em contratos frequentemente pagos em sacas de soja por hectare. Foi uma modernização
            conservadora, que elevou a produção sem mudar a estrutura de posse e acelerou o êxodo rural.
          </p>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Fonte: literatura acadêmica sobre a modernização agrícola em Goiás (teses UFU/UFSC) e Embrapa.
        </p>
      </div>
    </section>
  );
}
