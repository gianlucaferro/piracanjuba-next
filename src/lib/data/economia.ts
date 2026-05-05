import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

export type EconomiaIndicador = {
  id: string;
  categoria: string;
  indicador: string;
  setor: string | null;
  ano: number | null;
  mes: number | null;
  municipio_ibge: number | null;
  valor: number | null;
  valor_texto: string | null;
  fonte: string | null;
  fonte_url: string | null;
  observacao: string | null;
  updated_at: string;
};

/**
 * Todos os indicadores economicos. Uma unica query, filtragem em memoria.
 * Tabela e' pequena (<200 rows), sem necessidade de queries especificas.
 */
export const fetchEconomiaIndicadores = unstable_cache(
  async (): Promise<EconomiaIndicador[]> => {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("economia_indicadores")
      .select("*")
      .order("ano", { ascending: false });
    if (error) {
      console.error("fetchEconomiaIndicadores error:", error);
      return [];
    }
    return ((data ?? []) as EconomiaIndicador[]).map((r) => ({
      ...r,
      valor: r.valor !== null ? Number(r.valor) : null,
    }));
  },
  ["economia-indicadores"],
  { revalidate: 3600, tags: ["economia"] },
);

// Helpers de extracao
export function getPibComparativo(rows: EconomiaIndicador[]) {
  const cidades = [
    { ibge: 5217104, nome: "Piracanjuba", destaque: true },
    { ibge: 5209705, nome: "Hidrolândia" },
    { ibge: 5203302, nome: "Bela Vista de Goiás" },
    { ibge: 5217708, nome: "Pontalina" },
    { ibge: 5206305, nome: "Cristianópolis" },
    { ibge: 5206503, nome: "Cromínia" },
  ];
  return cidades.map((c) => {
    const total = rows.find(
      (r) =>
        r.categoria === "pib" &&
        r.indicador === "pib_total_mil" &&
        r.municipio_ibge === c.ibge,
    );
    const pc = rows.find(
      (r) =>
        r.categoria === "pib" &&
        r.indicador === "pib_per_capita" &&
        r.municipio_ibge === c.ibge,
    );
    return {
      ...c,
      pib_total_mil: total?.valor ?? 0,
      pib_total_texto: total?.valor_texto ?? "—",
      pib_per_capita: pc?.valor ?? 0,
      pib_per_capita_texto: pc?.valor_texto ?? "—",
    };
  });
}

export function getComposicaoSetorial(rows: EconomiaIndicador[]) {
  const setores = ["agropecuaria", "industria", "servicos"] as const;
  return setores.map((s) => {
    const r = rows.find(
      (x) =>
        x.categoria === "composicao_setorial" &&
        x.indicador === s &&
        x.municipio_ibge === 5217104,
    );
    return {
      setor: s,
      valor_mil: r?.valor ?? 0,
      pct_texto: r?.valor_texto ?? "0%",
    };
  });
}

export function getCagedSerie(rows: EconomiaIndicador[]) {
  return rows
    .filter((r) => r.categoria === "caged" && r.indicador === "saldo_anual")
    .map((r) => ({ ano: r.ano!, saldo: r.valor!, valor_texto: r.valor_texto! }))
    .sort((a, b) => a.ano - b.ano);
}

export function getSalariosPorSetor(rows: EconomiaIndicador[]) {
  return rows
    .filter(
      (r) =>
        r.categoria === "rais" &&
        r.indicador === "salario_medio_setor" &&
        r.setor !== null,
    )
    .map((r) => ({
      setor: r.setor!,
      sm: r.valor!,
      texto: r.valor_texto!,
    }))
    .sort((a, b) => b.sm - a.sm);
}

export function getEmpresasMEIs(rows: EconomiaIndicador[]) {
  const empresas = rows.find(
    (r) => r.categoria === "empresas" && r.indicador === "cnpjs_ativos",
  );
  const meis = rows.find(
    (r) => r.categoria === "meis" && r.indicador === "meis_ativos",
  );
  return {
    empresas: empresas
      ? {
          valor: empresas.valor,
          texto: empresas.valor_texto,
          observacao: empresas.observacao,
          ano: empresas.ano,
        }
      : null,
    meis: meis
      ? {
          valor: meis.valor,
          texto: meis.valor_texto,
          observacao: meis.observacao,
          ano: meis.ano,
        }
      : null,
  };
}
