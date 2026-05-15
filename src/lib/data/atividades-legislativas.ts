import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

export type AtividadeLegislativa = {
  id: string;
  modulo_id: number;
  modulo_nome: string | null;
  ato_tipo: string;
  numero: string;
  numero_int: number | null;
  ano: number | null;
  ato_completo: string | null;
  data_publicacao: string | null;
  parlamentar_raw: string | null;
  autores: string[];
  autoria_executivo: boolean;
  descricao_texto: string | null;
  relator: string | null;
  situacao: string | null;
};

export type AtividadesStats = {
  total: number;
  por_tipo: Array<{ tipo: string; quantidade: number }>;
  por_ano: Array<{ ano: number; quantidade: number }>;
  por_autor: Array<{ autor: string; quantidade: number }>;
  ultima_publicacao: string | null;
};

export const fetchAtividadesLegislativas = unstable_cache(
  async (limit = 200): Promise<AtividadeLegislativa[]> => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("atividade_legislativa")
      .select("id, modulo_id, modulo_nome, ato_tipo, numero, numero_int, ano, ato_completo, data_publicacao, parlamentar_raw, autores, autoria_executivo, descricao_texto, relator, situacao")
      .order("data_publicacao", { ascending: false, nullsFirst: false })
      .order("numero_int", { ascending: false, nullsFirst: false })
      .limit(limit);
    return (data ?? []) as AtividadeLegislativa[];
  },
  ["atividades-legislativas"],
  { revalidate: 3600, tags: ["atividades-legislativas"] },
);

export const fetchAtividadesPorAutor = unstable_cache(
  async (nomeAutor: string): Promise<AtividadeLegislativa[]> => {
    const supabase = createPublicSupabaseClient();
    // contains via @> precisa exact match, vou usar ILIKE no parlamentar_raw
    const { data } = await supabase
      .from("atividade_legislativa")
      .select("id, modulo_id, modulo_nome, ato_tipo, numero, numero_int, ano, ato_completo, data_publicacao, parlamentar_raw, autores, autoria_executivo, descricao_texto, relator, situacao")
      .ilike("parlamentar_raw", `%${nomeAutor}%`)
      .order("data_publicacao", { ascending: false, nullsFirst: false });
    return (data ?? []) as AtividadeLegislativa[];
  },
  ["atividades-por-autor"],
  { revalidate: 3600, tags: ["atividades-legislativas"] },
);

export const fetchAtividadesStats = unstable_cache(
  async (): Promise<AtividadesStats> => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("atividade_legislativa")
      .select("ato_tipo, ano, autores, autoria_executivo, data_publicacao");

    if (!data) return { total: 0, por_tipo: [], por_ano: [], por_autor: [], ultima_publicacao: null };

    const porTipo = new Map<string, number>();
    const porAno = new Map<number, number>();
    const porAutor = new Map<string, number>();
    let ultima: string | null = null;

    for (const r of data as Array<{ ato_tipo: string; ano: number | null; autores: string[]; autoria_executivo: boolean; data_publicacao: string | null }>) {
      porTipo.set(r.ato_tipo, (porTipo.get(r.ato_tipo) ?? 0) + 1);
      if (r.ano) porAno.set(r.ano, (porAno.get(r.ano) ?? 0) + 1);
      if (!r.autoria_executivo) {
        for (const a of r.autores ?? []) {
          porAutor.set(a, (porAutor.get(a) ?? 0) + 1);
        }
      }
      if (r.data_publicacao && (!ultima || r.data_publicacao > ultima)) {
        ultima = r.data_publicacao;
      }
    }

    return {
      total: data.length,
      por_tipo: Array.from(porTipo.entries()).map(([tipo, q]) => ({ tipo, quantidade: q })).sort((a, b) => b.quantidade - a.quantidade),
      por_ano: Array.from(porAno.entries()).map(([ano, q]) => ({ ano, quantidade: q })).sort((a, b) => b.ano - a.ano),
      por_autor: Array.from(porAutor.entries()).map(([autor, q]) => ({ autor, quantidade: q })).sort((a, b) => b.quantidade - a.quantidade).slice(0, 20),
      ultima_publicacao: ultima,
    };
  },
  ["atividades-stats"],
  { revalidate: 3600, tags: ["atividades-legislativas"] },
);
