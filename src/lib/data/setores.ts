import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

const CURRENT_YEAR = new Date().getFullYear();

export const fetchSaudeData = unstable_cache(
  async () => {
    const supabase = createPublicSupabaseClient();
    const [
      { data: indicadores },
      { data: estabelecimentos },
      { data: dengue },
    ] = await Promise.all([
      supabase
        .from("saude_indicadores")
        .select("*")
        .order("ano", { ascending: false })
        .order("mes", { ascending: false, nullsFirst: false })
        .limit(200),
      supabase.from("saude_estabelecimentos").select("*").order("nome"),
      supabase
        .from("saude_indicadores")
        .select("ano, semana_epidemiologica, valor, indicador")
        .ilike("indicador", "%dengue%")
        .order("ano", { ascending: false })
        .order("semana_epidemiologica", { ascending: false })
        .limit(20),
    ]);
    return {
      indicadores: indicadores || [],
      estabelecimentos: estabelecimentos || [],
      dengue: dengue || [],
    };
  },
  ["saude-data"],
  { revalidate: 3600, tags: ["saude"] }
);

export const fetchEducacaoData = unstable_cache(
  async () => {
    const supabase = createPublicSupabaseClient();
    const [{ data: indicadores }, { data: escolas }] = await Promise.all([
      supabase
        .from("educacao_indicadores")
        .select("*")
        .order("ano_referencia", { ascending: false }),
      supabase
        .from("educacao_escolas")
        .select("*")
        .order("matriculas_total", { ascending: false, nullsFirst: false }),
    ]);
    return { indicadores: indicadores || [], escolas: escolas || [] };
  },
  ["educacao-data"],
  { revalidate: 3600, tags: ["educacao"] }
);

export const fetchSegurancaData = unstable_cache(
  async () => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("seguranca_indicadores")
      .select("*")
      .eq("municipio", "Piracanjuba")
      .order("ano", { ascending: false })
      .order("mes", { ascending: false, nullsFirst: false });
    return data || [];
  },
  ["seguranca-data"],
  { revalidate: 3600, tags: ["seguranca"] }
);

export const fetchAgroData = unstable_cache(
  async () => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("agro_indicadores")
      .select("*")
      .order("ano_referencia", { ascending: false });
    return data || [];
  },
  ["agro-data"],
  { revalidate: 3600, tags: ["agro"] }
);

export const fetchArrecadacaoData = unstable_cache(
  async () => {
    const supabase = createPublicSupabaseClient();
    const [{ data }, { data: transferencias }] = await Promise.all([
      supabase
        .from("arrecadacao_municipal")
        .select("*")
        .eq("municipio", "Piracanjuba")
        .order("ano", { ascending: false }),
      supabase
        .from("transferencias_federais")
        .select("*")
        .order("ano", { ascending: false })
        .order("valor_total", { ascending: false, nullsFirst: false })
        .limit(30),
    ]);
    return { arrecadacao: data || [], transferencias: transferencias || [] };
  },
  ["arrecadacao-data"],
  { revalidate: 3600, tags: ["arrecadacao"] }
);

export const fetchBeneficiosData = unstable_cache(
  async () => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("beneficios_sociais")
      .select("*")
      .eq("municipio", "Piracanjuba")
      .order("competencia", { ascending: false });
    return data || [];
  },
  ["beneficios-data"],
  { revalidate: 3600, tags: ["beneficios"] }
);

export const fetchClassificadosAtivos = unstable_cache(
  async () => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("classificados")
      .select("id, titulo, descricao, preco, preco_tipo, fotos, foto_perfil, categoria, bairro, nome, whatsapp, visualizacoes, created_at")
      .eq("status", "ativo")
      .gt("expira_em", new Date().toISOString())
      .order("created_at", { ascending: false });
    return data || [];
  },
  ["classificados-ativos"],
  { revalidate: 60, tags: ["classificados"] }
);

export const fetchClassificadoById = unstable_cache(
  async (id: string) => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("classificados")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return data;
  },
  ["classificado-by-id"],
  { revalidate: 60, tags: ["classificados"] }
);
