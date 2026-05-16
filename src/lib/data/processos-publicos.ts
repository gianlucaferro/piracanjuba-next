import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

export type ProcessoPublico = {
  id: string;
  numero_processo: string | null;
  tribunal: string | null;
  comarca: string | null;
  uf: string | null;
  classe: string | null;
  assunto: string | null;
  tipo_categoria:
    | "civel"
    | "criminal"
    | "trabalhista"
    | "eleitoral"
    | "tributario"
    | "administrativo"
    | "outro"
    | null;
  polo: "autor" | "reu" | "interessado" | "terceiro" | null;
  data_distribuicao: string | null;
  data_ultima_movimentacao: string | null;
  status: string | null;
  resultado: string | null;
  objeto_resumo: string | null;
  atualizado_em: string;
  // Enriquecimento IA + Escavador (via edge function enrich-processo-ia)
  status_predito: string | null;
  quantidade_movimentacoes: number | null;
  tem_sentenca: boolean | null;
  sentenca_resumo: string | null;
  movimentacao_recente: string | null;
  resumo_ia: string | null;
  resumo_ia_gerado_em: string | null;
  pessoa_id: string;
  nome: string;
  nome_publico: string | null;
  cargo_categoria: string;
  cargo_detalhe: string | null;
  vereador_slug: string | null;
  foto_url: string | null;
};

export type PessoaPublica = {
  id: string;
  nome: string;
  nome_publico: string | null;
  cargo_categoria: string;
  cargo_detalhe: string | null;
  vereador_slug: string | null;
  foto_url: string | null;
  ultima_atualizacao: string | null;
  total_processos: number;
};

/**
 * Lista todos os processos visíveis de uma pessoa (por slug do vereador).
 * Usa a view processo_publico (já filtra segredo de justiça, vítima, família).
 */
export const fetchProcessosPorVereadorSlug = unstable_cache(
  async (slug: string): Promise<ProcessoPublico[]> => {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("processo_publico")
      .select("*")
      .eq("vereador_slug", slug)
      .order("data_ultima_movimentacao", { ascending: false, nullsFirst: false });

    if (error) {
      console.error("fetchProcessosPorVereadorSlug error:", error);
      return [];
    }
    return (data ?? []) as ProcessoPublico[];
  },
  ["processos-vereador-slug"],
  { revalidate: 3600, tags: ["processos-publicos"] },
);

/**
 * Resumo agregado por pessoa pública (pra index /transparencia/processos-publicos).
 */
export const fetchPessoasPublicasResumo = unstable_cache(
  async (): Promise<PessoaPublica[]> => {
    const supabase = createPublicSupabaseClient();
    const { data: pessoas, error } = await supabase
      .from("pessoa_publica")
      .select("id, nome, nome_publico, cargo_categoria, cargo_detalhe, vereador_slug, foto_url, ativo")
      .eq("ativo", true)
      .order("cargo_categoria", { ascending: true })
      .order("nome", { ascending: true });

    if (error || !pessoas) {
      console.error("fetchPessoasPublicasResumo error:", error);
      return [];
    }

    // Conta processos visíveis por pessoa
    const ids = pessoas.map((p) => p.id);
    const { data: counts } = await supabase
      .from("processo_publico")
      .select("pessoa_id")
      .in("pessoa_id", ids);

    const countMap = new Map<string, number>();
    for (const r of (counts ?? []) as { pessoa_id: string }[]) {
      countMap.set(r.pessoa_id, (countMap.get(r.pessoa_id) ?? 0) + 1);
    }

    // Última atualização por pessoa (sync_log)
    const { data: logs } = await supabase
      .from("processo_sync_log")
      .select("pessoa_publica_id, executed_at, status")
      .in("pessoa_publica_id", ids)
      .eq("status", "success")
      .order("executed_at", { ascending: false });

    const lastSyncMap = new Map<string, string>();
    for (const l of (logs ?? []) as { pessoa_publica_id: string; executed_at: string }[]) {
      if (!lastSyncMap.has(l.pessoa_publica_id)) {
        lastSyncMap.set(l.pessoa_publica_id, l.executed_at);
      }
    }

    return pessoas.map((p) => ({
      id: p.id,
      nome: p.nome,
      nome_publico: p.nome_publico,
      cargo_categoria: p.cargo_categoria,
      cargo_detalhe: p.cargo_detalhe,
      vereador_slug: p.vereador_slug,
      foto_url: p.foto_url,
      total_processos: countMap.get(p.id) ?? 0,
      ultima_atualizacao: lastSyncMap.get(p.id) ?? null,
    }));
  },
  ["pessoas-publicas-resumo"],
  { revalidate: 3600, tags: ["processos-publicos"] },
);

/**
 * Agregação por tipo pra mostrar stats no topo do painel.
 */
export function agregarPorTipo(processos: ProcessoPublico[]) {
  const map = new Map<string, { total: number; ativos: number }>();
  for (const p of processos) {
    const key = p.tipo_categoria || "outro";
    const cur = map.get(key) ?? { total: 0, ativos: 0 };
    cur.total++;
    if (p.status === "ativo") cur.ativos++;
    map.set(key, cur);
  }
  return Array.from(map.entries()).map(([tipo, stats]) => ({ tipo, ...stats }));
}
