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
  nome_candidato: string;
  ds_cargo: string;
  pessoa_publica_id: string | null;
  total_doacoes: number;
  total_arrecadado: number;
  doacoes_pj: number;
  doacoes_pf: number;
};

export type DoadoresResult = { resumo: TseResumoCandidato | null; topDoadores: TseDoador[] };

const COLS =
  "id, ano_eleicao, ds_cargo, cpf_cnpj_doador:documento_doador_publico, nome_doador, tipo_doador, vr_receita, ds_recurso, dt_receita";

function ehPj(d: { tipo_doador: string | null; cpf_cnpj_doador: string | null }): boolean {
  if ((d.tipo_doador ?? "").toLowerCase().includes("jurid")) return true;
  return (d.cpf_cnpj_doador ?? "").replace(/\D/g, "").length === 14;
}

// O resumo (tse_resumo_candidato) nao e populado pela ingestao; agregamos as doacoes aqui.
async function agregarPorPessoa(pessoaId: string, nome: string): Promise<DoadoresResult> {
  const supabase = createPublicSupabaseClient();
  const { data } = await supabase
    .from("tse_doador_campanha")
    .select(COLS)
    .eq("pessoa_publica_id", pessoaId)
    .order("vr_receita", { ascending: false });
  const rows = (data ?? []) as (TseDoador & { ds_cargo: string | null })[];
  if (!rows.length) return { resumo: null, topDoadores: [] };
  const pj = rows.filter(ehPj).length;
  const resumo: TseResumoCandidato = {
    ano_eleicao: rows[0].ano_eleicao ?? 2024,
    nome_candidato: nome,
    ds_cargo: rows[0].ds_cargo ?? "",
    pessoa_publica_id: pessoaId,
    total_doacoes: rows.length,
    total_arrecadado: rows.reduce((s, r) => s + (Number(r.vr_receita) || 0), 0),
    doacoes_pj: pj,
    doacoes_pf: rows.length - pj,
  };
  return { resumo, topDoadores: rows.slice(0, 10) };
}

export const fetchDoadoresPorVereadorSlug = unstable_cache(
  async (slug: string): Promise<DoadoresResult> => {
    const supabase = createPublicSupabaseClient();
    const { data: pessoa } = await supabase
      .from("pessoa_publica")
      .select("id, nome")
      .eq("vereador_slug", slug)
      .maybeSingle();
    if (!pessoa) return { resumo: null, topDoadores: [] };
    return agregarPorPessoa(pessoa.id as string, pessoa.nome as string);
  },
  ["tse-doadores-por-vereador"],
  { revalidate: 60 * 60 * 24, tags: ["tse-doadores"] },
);

// Doadores da chapa do Executivo (titular prefeito; o vice nao presta contas separadas).
export const fetchDoadoresDoExecutivo = unstable_cache(
  async (): Promise<DoadoresResult & { nome: string | null }> => {
    const supabase = createPublicSupabaseClient();
    const { data: pessoa } = await supabase
      .from("pessoa_publica")
      .select("id, nome")
      .eq("cargo_categoria", "prefeito")
      .order("nome")
      .limit(1)
      .maybeSingle();
    if (!pessoa) return { resumo: null, topDoadores: [], nome: null };
    const res = await agregarPorPessoa(pessoa.id as string, pessoa.nome as string);
    return { ...res, nome: pessoa.nome as string };
  },
  ["tse-doadores-executivo"],
  { revalidate: 60 * 60 * 24, tags: ["tse-doadores"] },
);
