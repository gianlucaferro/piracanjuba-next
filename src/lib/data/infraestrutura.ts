import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

export type InfraIndicador = {
  id: string;
  categoria: string;
  indicador: string;
  subcategoria: string | null;
  bairro: string | null;
  ano: number | null;
  mes: number | null;
  valor: number | null;
  valor_texto: string | null;
  unidade: string | null;
  fonte: string | null;
  fonte_url: string | null;
  observacao: string | null;
  updated_at: string;
};

export const fetchInfraestruturaIndicadores = unstable_cache(
  async (): Promise<InfraIndicador[]> => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("infraestrutura_indicadores")
      .select("*")
      .order("categoria", { ascending: true });
    return ((data ?? []) as InfraIndicador[]).map((r) => ({
      ...r,
      valor: r.valor !== null ? Number(r.valor) : null,
    }));
  },
  ["infraestrutura-indicadores"],
  { revalidate: 3600, tags: ["infraestrutura"] },
);

// Helpers de extracao por categoria/subcategoria
export function getSaneamento(rows: InfraIndicador[], sub: "agua" | "esgoto" | "lixo" | "drenagem") {
  return rows.filter((r) => r.categoria === "saneamento" && r.subcategoria === sub);
}

export function getEnergiaTarifas(rows: InfraIndicador[]) {
  return rows.filter((r) => r.categoria === "energia");
}

export function getTelecom(rows: InfraIndicador[]) {
  return rows.filter((r) => r.categoria === "telecom");
}

export function getIluminacaoPavimentacao(rows: InfraIndicador[]) {
  return rows.filter(
    (r) => r.categoria === "iluminacao" || r.categoria === "pavimentacao",
  );
}

export function getPolitica(rows: InfraIndicador[]) {
  return rows.filter(
    (r) => r.subcategoria === "politica",
  );
}

/**
 * Buscar indicador especifico facilmente: helpers tipados.
 */
export function findInfra(
  rows: InfraIndicador[],
  cat: string,
  ind: string,
  sub?: string,
): InfraIndicador | undefined {
  return rows.find(
    (r) =>
      r.categoria === cat &&
      r.indicador === ind &&
      (sub === undefined || r.subcategoria === sub),
  );
}
