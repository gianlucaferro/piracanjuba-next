"use client";

import { useMemo } from "react";
import { Trophy, Info } from "lucide-react";
import Link from "next/link";
import type { AtuacaoParlamentar, Projeto, Vereador } from "@/data/api";

// Pesos por tipo de proposicao: projeto de lei (produz norma) pesa mais que indicacao
// (mero pedido ao Executivo, sem forca de lei).
const PESO = {
  projetoLei: 15,
  projetoOutro: 6, // Projeto de Resolucao / Decreto Legislativo
  requerimento: 2,
  indicacao: 1,
  mocao: 1,
} as const;

type RankingEntry = {
  name: string;
  slug?: string;
  projetosLei: number;
  projetosOutros: number;
  requerimentos: number;
  indicacoes: number;
  mocoes: number;
  score: number;
};

interface RankingChartProps {
  atuacoes: AtuacaoParlamentar[];
  projetos: Projeto[];
  vereadores: Vereador[];
  show: boolean;
  onToggle: (v: boolean) => void;
  isLoading?: boolean;
  isError?: boolean;
}

export function useRankingData(
  atuacoes: AtuacaoParlamentar[],
  projetos: Projeto[],
  vereadores: Vereador[],
): RankingEntry[] {
  return useMemo(() => {
    const vereadorMap = new Map<string, { nome: string; slug: string }>();
    vereadores.forEach((v) => vereadorMap.set(v.id, { nome: v.nome, slug: v.slug }));

    const map = new Map<string, RankingEntry>();
    // So atribui a vereadores identificados (exclui projetos de autoria do Executivo).
    const getEntry = (vereadorId: string | null) => {
      if (!vereadorId) return null;
      const info = vereadorMap.get(vereadorId);
      if (!info) return null;
      const key = info.slug || info.nome;
      if (!map.has(key)) {
        map.set(key, {
          name: info.nome, slug: info.slug,
          projetosLei: 0, projetosOutros: 0, requerimentos: 0, indicacoes: 0, mocoes: 0, score: 0,
        });
      }
      return map.get(key)!;
    };

    projetos.forEach((p) => {
      const e = getEntry(p.autor_vereador_id);
      if (!e) return;
      if (p.tipo === "Projeto de Lei") e.projetosLei++;
      else e.projetosOutros++; // Resolucao, Decreto Legislativo
    });
    atuacoes.forEach((a) => {
      const e = getEntry(a.autor_vereador_id);
      if (!e) return;
      if (a.tipo === "Requerimento") e.requerimentos++;
      else if (a.tipo === "Indicação") e.indicacoes++;
      else if (a.tipo === "Moção") e.mocoes++;
    });

    map.forEach((e) => {
      e.score =
        e.projetosLei * PESO.projetoLei +
        e.projetosOutros * PESO.projetoOutro +
        e.requerimentos * PESO.requerimento +
        e.indicacoes * PESO.indicacao +
        e.mocoes * PESO.mocao;
    });

    return Array.from(map.values()).sort((a, b) => b.score - a.score);
  }, [atuacoes, projetos, vereadores]);
}

export default function RankingChart({
  atuacoes,
  projetos,
  vereadores,
  show,
  onToggle,
  isLoading = false,
  isError = false,
}: RankingChartProps) {
  const chartData = useRankingData(atuacoes, projetos, vereadores);

  if (!show) {
    return (
      <button
        onClick={() => onToggle(true)}
        className="text-xs text-primary hover:underline mb-4 flex items-center gap-1"
      >
        <Trophy className="w-3.5 h-3.5" /> Mostrar ranking
      </button>
    );
  }

  const maxScore = chartData[0]?.score || 1;

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-1">
        <h2 id="heading-ranking" className="text-lg md:text-xl font-bold text-foreground flex items-center gap-2">
          <Trophy className="w-5 h-5 text-accent" /> Ranking de atuação por vereador
        </h2>
        <button onClick={() => onToggle(false)} className="text-xs text-muted-foreground hover:text-foreground">
          Ocultar
        </button>
      </div>
      <div className="text-xs text-muted-foreground mb-5 rounded-lg bg-muted/40 border border-border p-2.5 leading-relaxed flex gap-2">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          <strong className="text-foreground">Índice ponderado por relevância da proposição.</strong>{" "}
          Um projeto de lei (que pode virar norma) pesa muito mais que uma indicação (pedido ao Executivo, sem força de lei).
          Pesos: Projeto de Lei = {PESO.projetoLei} · Resolução/Decreto Legislativo = {PESO.projetoOutro} ·
          Requerimento = {PESO.requerimento} · Indicação/Moção = {PESO.indicacao}.
        </span>
      </div>

      {isLoading && chartData.length === 0 && (
        <div className="space-y-4" aria-label="Carregando ranking de atuação">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-4 w-6 rounded bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-44 max-w-full rounded bg-muted animate-pulse" />
                <div className="h-5 rounded-full bg-muted animate-pulse" />
              </div>
              <div className="h-4 w-8 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {isError && chartData.length === 0 && !isLoading && (
        <p className="text-sm text-muted-foreground">Não foi possível carregar o ranking de atuação agora.</p>
      )}

      {!isError && chartData.length === 0 && !isLoading && (
        <p className="text-sm text-muted-foreground">Dados de atuação parlamentar ainda não disponíveis.</p>
      )}

      {chartData.length > 0 && (
        <div className="space-y-3">
          {chartData.map((v, i) => {
            const segs = [
              { val: v.projetosLei * PESO.projetoLei, cls: "bg-emerald-600", label: `${v.projetosLei} PL` },
              { val: v.projetosOutros * PESO.projetoOutro, cls: "bg-blue-500", label: `${v.projetosOutros} proj.` },
              { val: v.requerimentos * PESO.requerimento, cls: "bg-accent", label: `${v.requerimentos} req.` },
              { val: (v.indicacoes + v.mocoes) * PESO.indicacao, cls: "bg-primary/40", label: `${v.indicacoes} ind.` },
            ];
            const content = (
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm font-bold w-6 text-right flex-shrink-0 ${
                    i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-600" : "text-muted-foreground"
                  }`}
                  aria-label={`${i + 1}º lugar`}
                >
                  {i + 1}º
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-1">
                    <p className="text-sm font-medium text-foreground truncate">{v.name}</p>
                    <span className="text-sm font-bold text-primary ml-2 flex-shrink-0">{v.score}</span>
                  </div>
                  <div className="h-5 rounded-full bg-muted overflow-hidden flex" role="img" aria-label={`Índice ${v.score}`}>
                    {segs.map((s, k) => s.val > 0 && (
                      <div key={k} className={`h-full ${s.cls} transition-all duration-500`} style={{ width: `${(s.val / maxScore) * 100}%` }} />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 text-[10px] text-muted-foreground">
                    {v.projetosLei > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" aria-hidden="true" />{v.projetosLei} proj. de lei</span>}
                    {v.projetosOutros > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" aria-hidden="true" />{v.projetosOutros} resol./decreto</span>}
                    {v.requerimentos > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent inline-block" aria-hidden="true" />{v.requerimentos} req.</span>}
                    {v.indicacoes > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary/40 inline-block" aria-hidden="true" />{v.indicacoes} ind.</span>}
                    {v.mocoes > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary/40 inline-block" aria-hidden="true" />{v.mocoes} moç.</span>}
                  </div>
                </div>
              </div>
            );

            return v.slug ? (
              <Link key={v.slug} href={`/vereadores/${v.slug}`} className="block hover:bg-muted/50 rounded-lg p-1 -m-1 transition-colors">
                {content}
              </Link>
            ) : (
              <div key={v.name} className="p-1 -m-1">{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
