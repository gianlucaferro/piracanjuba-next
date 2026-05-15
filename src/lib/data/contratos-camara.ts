import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

export type ContratoCamara = {
  id: string;
  label: string;
  numero: string | null;
  ano: number | null;
  valor: number | null;
  data_publicacao: string | null;
  data_firmatura: string | null;
  inicio_vigencia: string | null;
  fim_vigencia: string | null;
  fornecedor_nome: string;
  fornecedor_cnpj: string | null;
  fiscal_contrato: string | null;
  situacao: string | null;
  objeto: string | null;
  assunto: string | null;
  tipo: string | null;
};

export const fetchContratosCamara = unstable_cache(
  async (limit = 100): Promise<ContratoCamara[]> => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("contrato_camara")
      .select("id, label, numero, ano, valor, data_publicacao, data_firmatura, inicio_vigencia, fim_vigencia, fornecedor_nome, fornecedor_cnpj, fiscal_contrato, situacao, objeto, assunto, tipo")
      .order("data_publicacao", { ascending: false, nullsFirst: false })
      .limit(limit);
    return (data ?? []) as ContratoCamara[];
  },
  ["contratos-camara"],
  { revalidate: 3600, tags: ["contratos-camara"] },
);

export const fetchContratosStats = unstable_cache(
  async () => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("contrato_camara")
      .select("ano, valor, fornecedor_nome, fornecedor_cnpj_limpo, situacao");
    if (!data) return null;

    const porAno = new Map<number, { qtde: number; soma: number }>();
    const porFornecedor = new Map<string, { nome: string; qtde: number; soma: number; cnpj: string | null }>();
    let totalGeral = 0;
    let emVigorQtde = 0;

    for (const c of data as Array<{ ano: number | null; valor: number | null; fornecedor_nome: string; fornecedor_cnpj_limpo: string | null; situacao: string | null }>) {
      const v = Number(c.valor) || 0;
      totalGeral += v;
      if (c.situacao?.toLowerCase().includes("vigor")) emVigorQtde++;
      if (c.ano) {
        const cur = porAno.get(c.ano) ?? { qtde: 0, soma: 0 };
        cur.qtde++;
        cur.soma += v;
        porAno.set(c.ano, cur);
      }
      if (c.fornecedor_nome) {
        const key = c.fornecedor_cnpj_limpo ?? c.fornecedor_nome;
        const cur = porFornecedor.get(key) ?? { nome: c.fornecedor_nome, qtde: 0, soma: 0, cnpj: c.fornecedor_cnpj_limpo };
        cur.qtde++;
        cur.soma += v;
        porFornecedor.set(key, cur);
      }
    }

    return {
      total: data.length,
      total_valor: totalGeral,
      em_vigor: emVigorQtde,
      por_ano: Array.from(porAno.entries()).map(([ano, s]) => ({ ano, ...s })).sort((a, b) => b.ano - a.ano),
      top_fornecedores: Array.from(porFornecedor.values()).sort((a, b) => b.soma - a.soma).slice(0, 10),
    };
  },
  ["contratos-stats"],
  { revalidate: 3600, tags: ["contratos-camara"] },
);
