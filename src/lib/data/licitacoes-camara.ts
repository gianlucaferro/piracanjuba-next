import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

export type LicitacaoCamara = {
  id: string;
  centi_label: string;
  numero: string | null;
  ano: number | null;
  modalidade: string | null;
  situacao: string | null;
  data_publicacao: string | null;
  data_abertura: string | null;
  data_encerramento: string | null;
  valor_estimado: number | null;
  valor_homologado: number | null;
  descricao: string | null;
};

export const fetchLicitacoesRecentes = unstable_cache(
  async (limit = 100): Promise<LicitacaoCamara[]> => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("licitacao_camara")
      .select("id, centi_label, numero, ano, modalidade, situacao, data_publicacao, data_abertura, data_encerramento, valor_estimado, valor_homologado, descricao")
      .order("data_publicacao", { ascending: false, nullsFirst: false })
      .limit(limit);
    return (data ?? []) as LicitacaoCamara[];
  },
  ["licitacoes-recentes"],
  { revalidate: 3600, tags: ["licitacoes-camara"] },
);

export const fetchLicitacoesStats = unstable_cache(
  async () => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("licitacao_camara")
      .select("ano, modalidade, situacao, valor_estimado, valor_homologado");
    if (!data) return null;

    const porAno = new Map<number, { qtde: number; estimado: number; homologado: number }>();
    const porModalidade = new Map<string, number>();
    const porSituacao = new Map<string, number>();
    let totalHomologado = 0;
    let totalEstimado = 0;

    for (const l of data as Array<{ ano: number | null; modalidade: string | null; situacao: string | null; valor_estimado: number | null; valor_homologado: number | null }>) {
      const est = Number(l.valor_estimado) || 0;
      const hom = Number(l.valor_homologado) || 0;
      totalEstimado += est;
      totalHomologado += hom;
      if (l.ano) {
        const cur = porAno.get(l.ano) ?? { qtde: 0, estimado: 0, homologado: 0 };
        cur.qtde++; cur.estimado += est; cur.homologado += hom;
        porAno.set(l.ano, cur);
      }
      if (l.modalidade) porModalidade.set(l.modalidade, (porModalidade.get(l.modalidade) ?? 0) + 1);
      if (l.situacao) porSituacao.set(l.situacao, (porSituacao.get(l.situacao) ?? 0) + 1);
    }

    return {
      total: data.length,
      total_estimado: totalEstimado,
      total_homologado: totalHomologado,
      por_ano: Array.from(porAno.entries()).map(([ano, s]) => ({ ano, ...s })).sort((a, b) => b.ano - a.ano),
      por_modalidade: Array.from(porModalidade.entries()).map(([m, q]) => ({ modalidade: m, quantidade: q })).sort((a, b) => b.quantidade - a.quantidade),
      por_situacao: Array.from(porSituacao.entries()).map(([s, q]) => ({ situacao: s, quantidade: q })).sort((a, b) => b.quantidade - a.quantidade),
    };
  },
  ["licitacoes-stats"],
  { revalidate: 3600, tags: ["licitacoes-camara"] },
);
