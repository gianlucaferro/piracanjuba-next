"use client";

import { useQuery } from "@tanstack/react-query";
import MortalidadeHistoricaChart from "./MortalidadeHistoricaChart";
import CovidPiracanjubaChart from "./CovidPiracanjubaChart";
import MortesPorCausaChart from "./MortesPorCausaChart";

type Row = { ano: number; valor: number };
type CovidRow = {
  ano: number;
  mes: number;
  internacoes: number;
  obitos: number;
  internacoes_srag: number;
};
type CausaRow = { causa: string; total: number };

/**
 * Aba "Mortalidade" — agrega 3 gráficos de saúde pública profunda:
 * 1. Mortalidade Infantil + Geral 1996-2026 (30 anos)
 * 2. COVID-19 mensal 2020-2026
 * 3. Mortes por Causa CID-10 (top 10 + outras)
 *
 * Dados pré-hidratados via SSR em /saude/page.tsx.
 */
export default function MortalidadeTab() {
  const { data: infantil = [] } = useQuery<Row[]>({
    queryKey: ["saude-mortalidade-infantil"],
    queryFn: () => Promise.resolve([]),
    staleTime: Infinity,
  });
  const { data: geral = [] } = useQuery<Row[]>({
    queryKey: ["saude-mortalidade-geral"],
    queryFn: () => Promise.resolve([]),
    staleTime: Infinity,
  });
  const { data: covid = [] } = useQuery<CovidRow[]>({
    queryKey: ["saude-covid-mensal"],
    queryFn: () => Promise.resolve([]),
    staleTime: Infinity,
  });
  const { data: causas = [] } = useQuery<CausaRow[]>({
    queryKey: ["saude-mortes-causa"],
    queryFn: () => Promise.resolve([]),
    staleTime: Infinity,
  });

  const temMortalidade = infantil.length > 0 || geral.length > 0;
  const temCovid = covid.length > 0;
  const temCausas = causas.length > 0;

  return (
    <div className="space-y-6">
      {/* Header explicativo */}
      <header>
        <h2 className="text-lg font-semibold text-foreground mb-1">
          Mortalidade & COVID-19
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Indicadores históricos de saúde pública em Piracanjuba. Mortalidade infantil é o
          principal sinalizador de qualidade do sistema de saúde local; mortes por causa
          mostram onde a prevenção pode atuar; histórico COVID-19 documenta como a pandemia
          afetou o município.
        </p>
      </header>

      {temMortalidade && (
        <MortalidadeHistoricaChart infantil={infantil} geral={geral} />
      )}

      {temCausas && <MortesPorCausaChart rows={causas} />}

      {temCovid && <CovidPiracanjubaChart rows={covid} />}

      {!temMortalidade && !temCovid && !temCausas && (
        <div className="stat-card text-sm text-muted-foreground">
          Carregando dados de mortalidade...
        </div>
      )}
    </div>
  );
}
