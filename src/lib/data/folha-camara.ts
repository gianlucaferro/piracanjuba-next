import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

export type FolhaServidor = {
  id: string;
  ano: number;
  mes: number;
  referencia: string;
  matricula: string;
  nome: string;
  cargo: string;
  lotacao: string | null;
  data_admissao: string | null;
  tipo_admissao: string | null;
  situacao: string | null;
  vereador_id: string | null;
};

export const fetchFolhaUltimaCompetencia = unstable_cache(
  async (): Promise<FolhaServidor[]> => {
    const supabase = createPublicSupabaseClient();
    const { data: ultima } = await supabase
      .from("folha_servidor")
      .select("ano, mes")
      .order("ano", { ascending: false })
      .order("mes", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!ultima) return [];
    const { data } = await supabase
      .from("folha_servidor")
      .select("id, ano, mes, referencia, matricula, nome, cargo, lotacao, data_admissao, tipo_admissao, situacao, vereador_id")
      .eq("ano", ultima.ano)
      .eq("mes", ultima.mes)
      .order("cargo", { ascending: true })
      .order("nome", { ascending: true });
    return (data ?? []) as FolhaServidor[];
  },
  ["folha-ultima"],
  { revalidate: 3600, tags: ["folha-camara"] },
);

export const fetchFolhaStats = unstable_cache(
  async () => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("folha_servidor")
      .select("ano, mes, cargo, lotacao");
    if (!data) return null;
    const ultimaRef = data
      .map((r) => ({ ano: r.ano, mes: r.mes }))
      .sort((a, b) => b.ano - a.ano || b.mes - a.mes)[0];
    const ultimos = data.filter((r) => r.ano === ultimaRef.ano && r.mes === ultimaRef.mes);
    const porCargo = new Map<string, number>();
    const porLotacao = new Map<string, number>();
    for (const r of ultimos) {
      porCargo.set(r.cargo, (porCargo.get(r.cargo) ?? 0) + 1);
      if (r.lotacao) porLotacao.set(r.lotacao, (porLotacao.get(r.lotacao) ?? 0) + 1);
    }
    return {
      ultima_referencia: `${String(ultimaRef.mes).padStart(2, "0")}/${ultimaRef.ano}`,
      total_servidores_ultima: ultimos.length,
      por_cargo: Array.from(porCargo.entries()).map(([cargo, q]) => ({ cargo, quantidade: q })).sort((a, b) => b.quantidade - a.quantidade),
      por_lotacao: Array.from(porLotacao.entries()).map(([lotacao, q]) => ({ lotacao, quantidade: q })).sort((a, b) => b.quantidade - a.quantidade),
    };
  },
  ["folha-stats"],
  { revalidate: 3600, tags: ["folha-camara"] },
);
