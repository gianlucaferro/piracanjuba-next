import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export interface GrupoSocioConector {
  nome: string;
  doc: string | null;
  n_empresas: number;
  cnpjs: string[];
}

export interface GrupoMembro {
  cnpj: string;
  razao_social: string | null;
  poderes: string[];
  n_contratos: number;
  valor: number;
}

export interface GrupoEconomico {
  id: string;
  rotulo: string;
  setor: string | null;
  tipo: string;
  n_empresas: number;
  valor_total: number;
  socios_conectores: GrupoSocioConector[];
  membros: GrupoMembro[];
}

interface GrupoRow {
  id: string;
  rotulo: string;
  setor: string | null;
  tipo: string;
  n_empresas: number;
  valor_total: number;
  socios_conectores: GrupoSocioConector[] | null;
  grupo_economico_membro: GrupoMembro[] | null;
}

export async function fetchGrupos(): Promise<GrupoEconomico[]> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from("grupo_economico")
    .select(
      "id, rotulo, setor, tipo, n_empresas, valor_total, socios_conectores, grupo_economico_membro(cnpj, razao_social, poderes, n_contratos, valor)"
    )
    .order("valor_total", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as GrupoRow[]).map((g) => ({
    id: g.id,
    rotulo: g.rotulo,
    setor: g.setor,
    tipo: g.tipo,
    n_empresas: g.n_empresas,
    valor_total: g.valor_total,
    socios_conectores: (g.socios_conectores ?? []).slice().sort((a, b) => b.n_empresas - a.n_empresas),
    membros: (g.grupo_economico_membro ?? []).slice().sort((a, b) => b.valor - a.valor),
  }));
}

// Índice CNPJ -> resumo do grupo, para o selo nos cards de contrato.
export interface GrupoResumo {
  grupo_id: string;
  rotulo: string;
  setor: string | null;
  n_empresas: number;
}

export function indexarPorCnpj(grupos: GrupoEconomico[]): Map<string, GrupoResumo> {
  const mapa = new Map<string, GrupoResumo>();
  for (const g of grupos) {
    for (const m of g.membros) {
      const chave = (m.cnpj || "").replace(/\D/g, "");
      if (chave.length === 14) {
        mapa.set(chave, {
          grupo_id: g.id,
          rotulo: g.rotulo,
          setor: g.setor,
          n_empresas: g.n_empresas,
        });
      }
    }
  }
  return mapa;
}
