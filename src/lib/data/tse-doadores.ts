import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

export type TseDoador = {
  id: number;
  ano_eleicao: number;
  cpf_cnpj_doador: string;
  nome_doador: string;
  tipo_doador: string | null;
  vr_receita: number;
  ds_recurso: string | null;
  dt_receita: string | null;
};

export type TseResumoCandidato = {
  ano_eleicao: number;
  cpf_candidato: string | null;
  nome_candidato: string;
  ds_cargo: string;
  pessoa_publica_id: string | null;
  total_doacoes: number;
  total_arrecadado: number;
  doacoes_pj: number;
  doacoes_pf: number;
};

export const fetchDoadoresPorVereadorSlug = unstable_cache(
  async (slug: string): Promise<{ resumo: TseResumoCandidato | null; topDoadores: TseDoador[] }> => {
    const supabase = createPublicSupabaseClient();
    const { data: pessoa } = await supabase
      .from("pessoa_publica")
      .select("id, nome")
      .eq("vereador_slug", slug)
      .maybeSingle();
    if (!pessoa) return { resumo: null, topDoadores: [] };

    const [resumoResp, doadoresResp] = await Promise.all([
      supabase
        .from("tse_resumo_candidato")
        .select("*")
        .eq("pessoa_publica_id", pessoa.id)
        .order("ano_eleicao", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("tse_doador_campanha")
        .select("id, ano_eleicao, cpf_cnpj_doador, nome_doador, tipo_doador, vr_receita, ds_recurso, dt_receita")
        .eq("pessoa_publica_id", pessoa.id)
        .order("vr_receita", { ascending: false })
        .limit(10),
    ]);

    return {
      resumo: (resumoResp.data as TseResumoCandidato | null) ?? null,
      topDoadores: (doadoresResp.data as TseDoador[] | null) ?? [],
    };
  },
  ["tse-doadores-por-vereador"],
  { revalidate: 60 * 60 * 24, tags: ["tse-doadores"] },
);
