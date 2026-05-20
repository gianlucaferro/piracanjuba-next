"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bug, AlertTriangle, ArrowRight, Share2, TrendingUp, TrendingDown } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

async function fetchDengueHistorico() {
  const supabase = createBrowserSupabaseClient();
  // Últimos 12 meses de casos pra comparar e detectar tendência
  const { data } = await supabase
    .from("saude_indicadores")
    .select("valor, valor_texto, ano, mes")
    .eq("categoria", "dengue")
    .eq("indicador", "casos_mes")
    .not("valor", "is", null)
    .order("ano", { ascending: false })
    .order("mes", { ascending: false, nullsFirst: false })
    .limit(13);
  return data ?? [];
}

const MESES = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function DengueAlert() {
  const { data: historico } = useQuery({
    queryKey: ["dengue-alert-historico"],
    queryFn: fetchDengueHistorico,
  });

  if (!historico || historico.length === 0) return null;
  const atual = historico[0];
  if (!atual.valor) return null;

  const nivelMatch = atual.valor_texto?.match(/(\d)/);
  const nivel = nivelMatch ? parseInt(nivelMatch[1]) : 0;
  const valor = Number(atual.valor);
  if (nivel < 2 && valor < 20) return null;

  // Comparativos
  const ultimosTres = historico.slice(1, 4).filter((d) => d.valor !== null);
  const media3meses = ultimosTres.length > 0
    ? ultimosTres.reduce((s, d) => s + Number(d.valor), 0) / ultimosTres.length
    : 0;
  const variacao = media3meses > 0
    ? ((valor - media3meses) / media3meses) * 100
    : 0;

  // Mesmo mês ano passado
  const anoAnterior = historico.find((d) => d.ano === (atual.ano ?? 0) - 1 && d.mes === atual.mes);
  const variacaoAnoAnterior = anoAnterior && Number(anoAnterior.valor) > 0
    ? ((valor - Number(anoAnterior.valor)) / Number(anoAnterior.valor)) * 100
    : null;

  // Pico no histórico
  const pico = historico.reduce((max, d) => Math.max(max, Number(d.valor) || 0), 0);
  const percentualDoPico = pico > 0 ? (valor / pico) * 100 : 0;

  const mesNome = MESES[atual.mes || 0];
  const isRed = nivel >= 3;
  const shareText = `Alerta Dengue em Piracanjuba: ${valor} casos em ${mesNome}/${atual.ano}. Nível ${nivel}/4. Elimine focos de água parada!`;

  return (
    <section>
      <div
        className={`stat-card border-l-4 ${
          isRed ? "border-l-red-500 bg-red-500/5" : "border-l-yellow-500 bg-yellow-500/5"
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${isRed ? "bg-red-500/10" : "bg-yellow-500/10"}`}>
            <Bug className={`w-5 h-5 ${isRed ? "text-red-500" : "text-yellow-500"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className={`w-4 h-4 ${isRed ? "text-red-500" : "text-yellow-500"}`} />
              <p className={`text-sm font-semibold ${isRed ? "text-red-500" : "text-yellow-500"}`}>
                Alerta de Dengue em Piracanjuba
              </p>
            </div>
            <p className="text-sm text-foreground">
              <span className="font-bold">{valor} casos</span> registrados em {mesNome}/{atual.ano}.
              {nivel >= 3 && " Nível de alerta máximo."}
              {nivel === 2 && " Nível de alerta moderado."}
            </p>

            {/* Comparativos */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px]">
              {media3meses > 0 && (
                <span className={`inline-flex items-center gap-1 font-semibold ${
                  variacao > 0 ? "text-red-600" : "text-emerald-600"
                }`}>
                  {variacao > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {variacao > 0 ? "+" : ""}{variacao.toFixed(0)}% vs média dos 3 meses anteriores
                </span>
              )}
              {variacaoAnoAnterior !== null && (
                <span className={`inline-flex items-center gap-1 ${
                  variacaoAnoAnterior > 0 ? "text-red-600" : "text-emerald-600"
                }`}>
                  {variacaoAnoAnterior > 0 ? "+" : ""}{variacaoAnoAnterior.toFixed(0)}% vs {mesNome}/{atual.ano! - 1}
                </span>
              )}
              {percentualDoPico > 50 && percentualDoPico < 100 && (
                <span className="text-amber-700 font-semibold">
                  {percentualDoPico.toFixed(0)}% do pico histórico ({pico} casos)
                </span>
              )}
              {percentualDoPico >= 100 && (
                <span className="text-red-700 font-bold">
                  ⚠️ Pico histórico recente
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Elimine focos de água parada. Use repelente. Procure atendimento se tiver febre alta.
            </p>
            <div className="flex items-center gap-3 mt-2">
              <Link
                href="/saude"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
              >
                Ver dados completos <ArrowRight className="w-3 h-3" />
              </Link>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  shareText + "\n\nVeja mais em: https://piracanjuba.ai/saude"
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[#25D366] hover:underline font-medium"
              >
                <Share2 className="w-3 h-3" /> Compartilhar
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
