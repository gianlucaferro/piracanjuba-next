"use client";

import {
  Droplets,
  Trash2,
  Zap,
  Smartphone,
  Lightbulb,
  Construction,
  Wifi,
  AlertTriangle,
  Bug,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Building2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  LabelList,
} from "recharts";
import type { InfraIndicador } from "@/lib/data/infraestrutura";

type Props = {
  rows: InfraIndicador[];
  /** Casos de dengue 2024-2026 pra cruzamento com saneamento */
  dengue2024_2026: { ano: number; total: number }[];
};

function findVal(
  rows: InfraIndicador[],
  cat: string,
  ind: string,
  sub?: string,
) {
  return rows.find(
    (r) =>
      r.categoria === cat &&
      r.indicador === ind &&
      (sub === undefined || r.subcategoria === sub),
  );
}

function formatPct(v: number | null) {
  if (v === null) return "—";
  return `${v.toFixed(1)}%`;
}

function StatusBadge({
  pct,
  invertSemantics = false,
}: {
  pct: number;
  invertSemantics?: boolean;
}) {
  // Para cobertura: alto = bom; pra "sem coleta": alto = ruim
  const score = invertSemantics ? 100 - pct : pct;
  const label =
    score >= 90 ? "Excelente" : score >= 70 ? "Adequado" : score >= 50 ? "Atenção" : "Crítico";
  const color =
    score >= 90
      ? "text-green-700 bg-green-500/10 border-green-500/30"
      : score >= 70
      ? "text-emerald-700 bg-emerald-500/10 border-emerald-500/30"
      : score >= 50
      ? "text-amber-700 bg-amber-500/10 border-amber-500/30"
      : "text-red-700 bg-red-500/10 border-red-500/30";
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${color}`}>
      {label}
    </span>
  );
}

export default function InfraestruturaPanel({ rows, dengue2024_2026 }: Props) {
  // SANEAMENTO
  const aguaCob = findVal(rows, "saneamento", "cobertura_pct", "agua");
  const aguaPopAtend = findVal(rows, "saneamento", "pop_atendida", "agua");
  const aguaPopNao = findVal(rows, "saneamento", "pop_nao_atendida", "agua");
  const aguaUrbana = findVal(rows, "saneamento", "cobertura_urbana_pct", "agua");
  const aguaConsumo = findVal(rows, "saneamento", "consumo_per_capita", "agua");

  const esgotoCob = findVal(rows, "saneamento", "cobertura_pct", "esgoto");
  const esgotoPopNao = findVal(rows, "saneamento", "pop_nao_atendida", "esgoto");
  const esgotoColeta = findVal(rows, "saneamento", "indice_coleta_pct", "esgoto");
  const esgotoTrat = findVal(rows, "saneamento", "indice_tratamento_pct", "esgoto");
  const esgotoSemTrat = findVal(rows, "saneamento", "volume_sem_tratamento", "esgoto");

  const lixoCob = findVal(rows, "saneamento", "cobertura_pct", "lixo");
  const lixoPopAtend = findVal(rows, "saneamento", "pop_atendida", "lixo");
  const lixoPopNao = findVal(rows, "saneamento", "pop_nao_atendida", "lixo");
  const lixoUrbana = findVal(rows, "saneamento", "cobertura_urbana_pct", "lixo");
  const lixoRural = findVal(rows, "saneamento", "cobertura_rural_pct", "lixo");
  const lixoCobranca = findVal(rows, "saneamento", "cobranca_taxa", "lixo");

  const drenVias = findVal(rows, "saneamento", "vias_pavimentadas_pct", "drenagem");
  const drenRedes = findVal(rows, "saneamento", "redes_pluviais_pct", "drenagem");
  const drenRisco = findVal(rows, "saneamento", "domicilios_risco_inundacao", "drenagem");

  // ENERGIA
  const tarifa = findVal(rows, "energia", "tarifa_residencial_b1");
  const baixaRendaAlta = findVal(rows, "energia", "tarifa_baixa_renda_acima_80");
  const reajuste = findVal(rows, "energia", "reajuste_2025_pct");
  const consumoMedio = findVal(rows, "energia", "consumo_medio_residencial_go");

  // TELECOM
  const cob4G = findVal(rows, "telecom", "cobertura_4g_urbana");
  const cob5G = findVal(rows, "telecom", "cobertura_5g");
  const op4G = findVal(rows, "telecom", "operadoras_4g");
  const fibra = findVal(rows, "telecom", "fibra_otica");
  const cobRural = findVal(rows, "telecom", "cobertura_rural_4g");

  // POLITICA MUNICIPAL
  const planoMun = findVal(rows, "saneamento", "plano_municipal", "politica");
  const polMun = findVal(rows, "saneamento", "politica_municipal", "politica");
  const conselho = findVal(rows, "saneamento", "conselho_municipal", "politica");
  const fundoMun = findVal(rows, "saneamento", "fundo_municipal", "politica");

  // CRUZAMENTO SANEAMENTO × DENGUE
  const lixoNaoAtend = lixoPopNao?.valor ?? 0; // 11.309 hab.
  const denguePicoAno = dengue2024_2026.reduce<{ ano: number; total: number }>(
    (max, d) => (d.total > max.total ? d : max),
    { ano: 0, total: 0 },
  );

  // Saneamento bar chart agregado
  const saneamentoChartData = [
    { categoria: "Água", valor: aguaCob?.valor ?? 0, cor: "#0ea5e9" },
    { categoria: "Esgoto coletado", valor: esgotoCob?.valor ?? 0, cor: "#06b6d4" },
    { categoria: "Lixo", valor: lixoCob?.valor ?? 0, cor: "#16a34a" },
    { categoria: "Vias pavimentadas", valor: drenVias?.valor ?? 0, cor: "#a855f7" },
  ];

  return (
    <div className="space-y-6">
      {/* SUMARIO geral */}
      <div className="stat-card border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
        <h2 className="text-lg font-semibold text-foreground mb-1">
          Cobertura de Infraestrutura Básica · 2023
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Snapshot dos 4 pilares fundamentais. Fonte SNIS 2023 (Sistema Nacional de
          Informações sobre Saneamento) — relatório oficial Ministério das Cidades.
        </p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={saneamentoChartData}
              layout="vertical"
              margin={{ top: 8, right: 60, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
              <YAxis type="category" dataKey="categoria" tick={{ fontSize: 11 }} width={130} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => [`${v.toFixed(1)}%`, "Cobertura"]}
              />
              <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                {saneamentoChartData.map((d, i) => (
                  <Cell key={i} fill={d.cor} />
                ))}
                <LabelList
                  dataKey="valor"
                  position="right"
                  formatter={(v: number) => `${v.toFixed(1)}%`}
                  style={{ fontSize: 10, fill: "hsl(var(--foreground))" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* PAINEL 1: ÁGUA */}
      {aguaCob && (
        <section className="stat-card border-sky-500/20 bg-gradient-to-br from-sky-500/5 to-transparent">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
              <Droplets className="w-5 h-5 text-sky-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-foreground">
                Água Tratada · {aguaCob.ano}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                Cobertura de abastecimento de água tratada por SANEAGO.
                Estado GO: 88,4% · Brasil: 83,1%.
              </p>
            </div>
            <StatusBadge pct={aguaCob.valor ?? 0} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="stat-card border-sky-500/30">
              <p className="text-[10px] uppercase text-muted-foreground">Cobertura</p>
              <p className="text-2xl font-extrabold text-sky-600 mt-0.5">
                {formatPct(aguaCob.valor)}
              </p>
              <p className="text-[10px] text-muted-foreground">{aguaPopAtend?.valor_texto}</p>
            </div>
            {aguaPopNao && (
              <div className="stat-card border-amber-500/30 bg-amber-500/5">
                <p className="text-[10px] uppercase text-muted-foreground">⚠️ Sem água</p>
                <p className="text-2xl font-extrabold text-amber-700 mt-0.5">
                  {aguaPopNao.valor_texto}
                </p>
                <p className="text-[10px] text-muted-foreground">não atendidos</p>
              </div>
            )}
            {aguaUrbana && (
              <div className="stat-card">
                <p className="text-[10px] uppercase text-muted-foreground">Urbana</p>
                <p className="text-2xl font-extrabold text-foreground mt-0.5">
                  {formatPct(aguaUrbana.valor)}
                </p>
                <p className="text-[10px] text-muted-foreground">cobertura zona urbana</p>
              </div>
            )}
            {aguaConsumo && (
              <div className="stat-card">
                <p className="text-[10px] uppercase text-muted-foreground">Consumo</p>
                <p className="text-2xl font-extrabold text-foreground mt-0.5">
                  {aguaConsumo.valor_texto}
                </p>
                <p className="text-[10px] text-muted-foreground">per capita</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* PAINEL 2: ESGOTO */}
      {esgotoCob && (
        <section className="stat-card border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-transparent">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0">
              <Droplets className="w-5 h-5 text-cyan-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-foreground">
                Esgotamento Sanitário · {esgotoCob.ano}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                Apenas 69% da população tem coleta de esgoto pela rede pública.
                Demais usam fossas, lançam direto em cursos d'água ou solo.
              </p>
            </div>
            <StatusBadge pct={esgotoCob.valor ?? 0} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="stat-card border-cyan-500/30">
              <p className="text-[10px] uppercase text-muted-foreground">Cobertura</p>
              <p className="text-2xl font-extrabold text-cyan-600 mt-0.5">
                {formatPct(esgotoCob.valor)}
              </p>
            </div>
            {esgotoPopNao && (
              <div className="stat-card border-red-500/30 bg-red-500/5">
                <p className="text-[10px] uppercase text-muted-foreground">⚠️ Sem coleta</p>
                <p className="text-2xl font-extrabold text-red-700 mt-0.5">
                  {esgotoPopNao.valor_texto}
                </p>
              </div>
            )}
            {esgotoColeta && (
              <div className="stat-card">
                <p className="text-[10px] uppercase text-muted-foreground">Índice coleta</p>
                <p className="text-2xl font-extrabold text-foreground mt-0.5">
                  {formatPct(esgotoColeta.valor)}
                </p>
              </div>
            )}
            {esgotoTrat && (
              <div className="stat-card">
                <p className="text-[10px] uppercase text-muted-foreground">Índice tratamento</p>
                <p className="text-2xl font-extrabold text-foreground mt-0.5">
                  {formatPct(esgotoTrat.valor)}
                </p>
              </div>
            )}
          </div>
          {esgotoSemTrat && (
            <div className="stat-card border-red-500/30 bg-red-500/5 mt-3">
              <p className="text-xs font-semibold text-red-700 inline-flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> ALERTA AMBIENTAL
              </p>
              <p className="text-sm text-foreground mt-1">
                <strong>{esgotoSemTrat.valor_texto}</strong> de esgoto vai sem tratamento por
                ano — lançado em cursos d'água ou solo. Impacto direto no Rio Piracanjuba e
                aquíferos. {esgotoSemTrat.observacao}
              </p>
            </div>
          )}
        </section>
      )}

      {/* PAINEL 3: LIXO */}
      {lixoCob && (
        <section className="stat-card border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-foreground">
                Coleta de Lixo · {lixoCob.ano}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                Coleta operada pela Secretaria Municipal de Agricultura. Cobertura
                muito baixa na zona rural — apenas 3,4%.
              </p>
            </div>
            <StatusBadge pct={lixoCob.valor ?? 0} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="stat-card border-emerald-500/30">
              <p className="text-[10px] uppercase text-muted-foreground">Cobertura geral</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-0.5">
                {formatPct(lixoCob.valor)}
              </p>
              <p className="text-[10px] text-muted-foreground">{lixoPopAtend?.valor_texto}</p>
            </div>
            {lixoUrbana && (
              <div className="stat-card">
                <p className="text-[10px] uppercase text-muted-foreground">Urbana</p>
                <p className="text-2xl font-extrabold text-foreground mt-0.5">
                  {formatPct(lixoUrbana.valor)}
                </p>
              </div>
            )}
            {lixoRural && (
              <div className="stat-card border-red-500/30 bg-red-500/5">
                <p className="text-[10px] uppercase text-muted-foreground">⚠️ Rural</p>
                <p className="text-2xl font-extrabold text-red-700 mt-0.5">
                  {formatPct(lixoRural.valor)}
                </p>
                <p className="text-[10px] text-muted-foreground">quase zero</p>
              </div>
            )}
          </div>
          {lixoPopNao && (
            <div className="stat-card border-amber-500/30 bg-amber-500/5 mt-3">
              <p className="text-sm text-foreground inline-flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <strong>{lixoPopNao.valor_texto}</strong> sem coleta de lixo —{" "}
                {lixoPopNao.observacao}
              </p>
            </div>
          )}
          {lixoCobranca && (
            <p className="text-xs text-muted-foreground italic mt-3">
              💰 Taxa de coleta: <strong>{lixoCobranca.valor_texto}</strong> —{" "}
              {lixoCobranca.observacao}
            </p>
          )}
        </section>
      )}

      {/* PAINEL 4: ENERGIA */}
      {tarifa && (
        <section className="stat-card border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-transparent">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-foreground">
                Energia Elétrica · Equatorial Goiás · {tarifa.ano}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                Tarifa B1 residencial em vigor desde 22/10/2025 (Resolução ANEEL 3.544/2025).
                Reajuste anual de {reajuste?.valor_texto} aprovado.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="stat-card border-yellow-500/30">
              <p className="text-[10px] uppercase text-muted-foreground">Tarifa B1 residencial</p>
              <p className="text-xl font-extrabold text-yellow-700 mt-0.5">
                {tarifa.valor_texto}
              </p>
            </div>
            {baixaRendaAlta && (
              <div className="stat-card border-green-500/30 bg-green-500/5">
                <p className="text-[10px] uppercase text-muted-foreground">Baixa renda &gt;80kWh</p>
                <p className="text-xl font-extrabold text-green-700 mt-0.5">
                  {baixaRendaAlta.valor_texto}
                </p>
                <p className="text-[10px] text-muted-foreground">isento até 80 kWh</p>
              </div>
            )}
            {reajuste && (
              <div className="stat-card border-red-500/30 bg-red-500/5">
                <p className="text-[10px] uppercase text-muted-foreground">Reajuste 2025</p>
                <p className="text-xl font-extrabold text-red-700 mt-0.5">
                  {reajuste.valor_texto}
                </p>
              </div>
            )}
            {consumoMedio && (
              <div className="stat-card">
                <p className="text-[10px] uppercase text-muted-foreground">Consumo médio GO</p>
                <p className="text-xl font-extrabold text-foreground mt-0.5">
                  {consumoMedio.valor_texto}
                </p>
                <p className="text-[10px] text-muted-foreground">residencial · nov/25</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* PAINEL 5: TELECOM */}
      {cob4G && (
        <section className="stat-card border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Telecomunicações · {cob4G.ano}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                Cobertura móvel e fibra óptica em Piracanjuba.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="stat-card border-green-500/30 bg-green-500/5">
              <p className="text-[10px] uppercase text-muted-foreground inline-flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> 4G urbana
              </p>
              <p className="text-2xl font-extrabold text-green-600 mt-0.5">
                {cob4G.valor_texto}
              </p>
              <p className="text-[10px] text-muted-foreground">{op4G?.valor_texto}</p>
            </div>
            {cob5G && (
              <div className="stat-card border-red-500/30 bg-red-500/5">
                <p className="text-[10px] uppercase text-muted-foreground inline-flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> 5G
                </p>
                <p className="text-2xl font-extrabold text-red-600 mt-0.5">
                  {cob5G.valor_texto}
                </p>
                <p className="text-[10px] text-muted-foreground">{cob5G.observacao}</p>
              </div>
            )}
            {fibra && (
              <div className="stat-card">
                <p className="text-[10px] uppercase text-muted-foreground">Fibra óptica</p>
                <p className="text-base font-bold text-foreground mt-0.5">
                  {fibra.valor_texto}
                </p>
                <p className="text-[10px] text-muted-foreground leading-snug">{fibra.observacao}</p>
              </div>
            )}
          </div>
          {cobRural && (
            <div className="stat-card border-amber-500/30 bg-amber-500/5 mt-3">
              <p className="text-sm text-foreground inline-flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Zona rural: <strong>{cobRural.valor_texto}</strong> de cobertura 4G.{" "}
                {cobRural.observacao}
              </p>
            </div>
          )}
        </section>
      )}

      {/* PAINEL 6: DRENAGEM + ILUMINAÇÃO + PAVIMENTAÇÃO */}
      <section className="stat-card border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
            <Construction className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Drenagem, Pavimentação, Iluminação
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
              Infraestrutura urbana viária e drenagem (SNIS) + dados que dependem de Lei
              de Acesso à Informação à Prefeitura (não publicados em portal).
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {drenVias && (
            <div className="stat-card">
              <p className="text-[10px] uppercase text-muted-foreground">Vias pavimentadas</p>
              <p className="text-2xl font-extrabold text-foreground mt-0.5">
                {formatPct(drenVias.valor)}
              </p>
              <p className="text-[10px] text-muted-foreground">malha urbana</p>
            </div>
          )}
          {drenRedes && (
            <div className="stat-card border-amber-500/30 bg-amber-500/5">
              <p className="text-[10px] uppercase text-muted-foreground">⚠️ Redes pluviais</p>
              <p className="text-2xl font-extrabold text-amber-700 mt-0.5">
                {formatPct(drenRedes.valor)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                galerias subterrâneas — risco de alagamento
              </p>
            </div>
          )}
          {drenRisco && (
            <div className="stat-card">
              <p className="text-[10px] uppercase text-muted-foreground">Risco inundação</p>
              <p className="text-2xl font-extrabold text-foreground mt-0.5">
                {drenRisco.valor_texto}
              </p>
              <p className="text-[10px] text-muted-foreground">domicílios identificados</p>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground italic mt-3">
          📋 Dados pendentes (LAI à Prefeitura): pontos totais de iluminação pública,
          LEDs instalados, km exatos asfaltados por bairro, pontos de Wi-Fi gratuito.
        </p>
      </section>

      {/* PAINEL 7: CRUZAMENTO SANEAMENTO × DENGUE */}
      {dengue2024_2026.length > 0 && lixoNaoAtend > 0 && (
        <section className="stat-card border-red-500/20 bg-gradient-to-br from-red-500/5 via-amber-500/5 to-transparent">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
              <Bug className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Cruzamento · Saneamento × Dengue
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                Áreas sem coleta regular de lixo e com saneamento precário concentram
                criadouros de Aedes aegypti. Cruzamento entre cobertura de lixo SNIS e
                casos de dengue.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="stat-card border-amber-500/30 bg-amber-500/5">
              <p className="text-[10px] uppercase text-muted-foreground">Pop. sem coleta de lixo</p>
              <p className="text-2xl font-extrabold text-amber-700 mt-0.5">
                {lixoPopNao?.valor_texto}
              </p>
              <p className="text-[10px] text-muted-foreground">~45% da população</p>
            </div>
            <div className="stat-card border-red-500/30 bg-red-500/5">
              <p className="text-[10px] uppercase text-muted-foreground">
                Pico anual de dengue
              </p>
              <p className="text-2xl font-extrabold text-red-700 mt-0.5">
                {denguePicoAno.total} casos
              </p>
              <p className="text-[10px] text-muted-foreground">em {denguePicoAno.ano}</p>
            </div>
            <div className="stat-card">
              <p className="text-[10px] uppercase text-muted-foreground">Esgoto não tratado/ano</p>
              <p className="text-2xl font-extrabold text-foreground mt-0.5">
                {esgotoSemTrat?.valor_texto}
              </p>
              <p className="text-[10px] text-muted-foreground">lançado na natureza</p>
            </div>
          </div>
          <div className="stat-card mt-4 border-blue-500/30 bg-blue-500/5">
            <p className="text-sm font-semibold text-foreground mb-2">
              💡 Hipótese epidemiológica
            </p>
            <p className="text-xs text-foreground/85 leading-relaxed">
              Dos {lixoPopNao?.valor_texto} sem coleta de lixo, parte significativa está em
              área rural ou periferia urbana — áreas com mais terrenos baldios, água parada
              e descarte irregular. Essas áreas tipicamente registram <strong>2-5×</strong>{" "}
              mais casos de dengue por habitante que zonas com saneamento completo.
              Quando tivermos dados georreferenciados de casos de dengue por bairro, vamos
              cruzar diretamente.
            </p>
          </div>
        </section>
      )}

      {/* PAINEL POLITICA MUNICIPAL */}
      <section className="stat-card border-slate-500/20 bg-gradient-to-br from-slate-500/5 to-transparent">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Política Municipal de Saneamento
            </h3>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {planoMun && (
            <div
              className={`stat-card ${
                planoMun.valor === 1
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-red-500/30 bg-red-500/5"
              }`}
            >
              <p className="text-[10px] uppercase text-muted-foreground">Plano Municipal</p>
              <p
                className={`text-base font-bold mt-0.5 ${
                  planoMun.valor === 1 ? "text-green-700" : "text-red-700"
                }`}
              >
                {planoMun.valor_texto}
              </p>
            </div>
          )}
          {polMun && (
            <div
              className={`stat-card ${
                polMun.valor === 1
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-red-500/30 bg-red-500/5"
              }`}
            >
              <p className="text-[10px] uppercase text-muted-foreground">Política Municipal</p>
              <p
                className={`text-base font-bold mt-0.5 ${
                  polMun.valor === 1 ? "text-green-700" : "text-red-700"
                }`}
              >
                {polMun.valor_texto}
              </p>
            </div>
          )}
          {conselho && (
            <div
              className={`stat-card ${
                conselho.valor === 1
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-red-500/30 bg-red-500/5"
              }`}
            >
              <p className="text-[10px] uppercase text-muted-foreground">Conselho Municipal</p>
              <p
                className={`text-base font-bold mt-0.5 ${
                  conselho.valor === 1 ? "text-green-700" : "text-red-700"
                }`}
              >
                {conselho.valor_texto}
              </p>
            </div>
          )}
          {fundoMun && (
            <div
              className={`stat-card ${
                fundoMun.valor === 1
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-red-500/30 bg-red-500/5"
              }`}
            >
              <p className="text-[10px] uppercase text-muted-foreground">Fundo Municipal</p>
              <p
                className={`text-base font-bold mt-0.5 ${
                  fundoMun.valor === 1 ? "text-green-700" : "text-red-700"
                }`}
              >
                {fundoMun.valor_texto}
              </p>
            </div>
          )}
        </div>
      </section>

      <p className="text-[10px] text-muted-foreground italic mt-6 text-center">
        Atualização mensal automática via cron <code>sync-infraestrutura-mensal</code> · primeira
        segunda do mês 07:00 UTC. Snapshots SNIS 2023 (Instituto Água e Saneamento), ANEEL 2025
        (Resolução 3.544), ANATEL Painel Cobertura Móvel.
      </p>
    </div>
  );
}
