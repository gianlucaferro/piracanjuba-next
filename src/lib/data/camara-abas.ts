import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { resumirFolhaCamara, type RegistroFolhaCamara, type ResumoFolhaCamara } from "@/lib/camara-folha";
import type { CamaraContrato, CamaraOrcamento } from "@/data/camaraApi";
import type { Servidor } from "@/data/prefeituraApi";
import type { RegistroPagamentoCamara } from "@/components/camara/resposta-aba";

// Primeiro lote das abas da Câmara lido no servidor (Onda 2 de SEO, 2026-11-19).
//
// As três primeiras funções repetem, consulta por consulta, as do cliente (fetchCamaraContratos
// e fetchCamaraResumoFolha em src/data/camaraApi.ts, fetchServidores em src/data/prefeituraApi.ts):
// o resultado vai para o react-query com a mesma chave, e o cliente usa o dado sem refazer a busca.
// O cliente usa o Supabase do navegador, que não roda aqui; por isso a cópia. Ao mudar a consulta
// lá, mudar aqui também (tests/camara-resposta-aba.test.ts compara as duas).
//
// Diferente dos outros módulos de src/lib/data, erro do Supabase aqui é lançado: dado de erro não
// pode ser hidratado como lista vazia. Quem chama trata a falha e deixa a aba carregar no cliente.

export const fetchCamaraContratosServidor = unstable_cache(
  async (): Promise<CamaraContrato[]> => {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("camara_contratos")
      .select("*")
      .order("vigencia_inicio", { ascending: false });
    if (error) throw error;
    return (data || []) as CamaraContrato[];
  },
  ["camara-abas-contratos"],
  { revalidate: 3600, tags: ["contratos-camara"] },
);

export const fetchServidoresCamaraPrimeiroLote = unstable_cache(
  async (pageSize: number): Promise<{ data: Servidor[]; count: number }> => {
    const supabase = createPublicSupabaseClient();
    const { data, error, count } = await supabase
      .from("servidores")
      .select("*", { count: "exact" })
      .eq("orgao_tipo", "camara")
      .order("nome")
      .order("id")
      .range(0, pageSize - 1);
    if (error) throw error;
    return { data: (data || []) as Servidor[], count: count ?? 0 };
  },
  ["camara-abas-servidores"],
  { revalidate: 3600, tags: ["folha-camara"] },
);

export const fetchResumoFolhaCamaraServidor = unstable_cache(
  async (): Promise<ResumoFolhaCamara | null> => {
    const supabase = createPublicSupabaseClient();
    const ultimaCompetencia = async (apenasMensal: boolean) => {
      let query = supabase.from("remuneracao_servidores")
        .select("competencia, servidores!inner(orgao_tipo)")
        .eq("servidores.orgao_tipo", "camara");
      if (apenasMensal) query = query.ilike("tipo_folha", "MENSAL");
      const { data, error } = await query.order("competencia", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return (data?.competencia as string | undefined) ?? null;
    };

    const [recente, mensal] = await Promise.all([ultimaCompetencia(false), ultimaCompetencia(true)]);
    if (!recente) return null;
    const competencias = [...new Set([recente, ...(mensal ? [mensal] : [])])];
    const registros: RegistroFolhaCamara[] = [];
    const pageSize = 1000;
    let expectedCount: number | null = null;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error, count } = await supabase.from("remuneracao_servidores")
        .select("id, servidor_id, competencia, tipo_folha, bruto, servidores!inner(orgao_tipo)", { count: "exact" })
        .eq("servidores.orgao_tipo", "camara")
        .in("competencia", competencias)
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) throw error;
      if (count === null || (expectedCount !== null && count !== expectedCount)) {
        throw new Error("Não foi possível confirmar o total de registros da folha da Câmara.");
      }
      expectedCount = count;
      registros.push(...((data ?? []) as RegistroFolhaCamara[]));
      if (registros.length === expectedCount) break;
      if (!data?.length || data.length < pageSize || registros.length > expectedCount) {
        throw new Error("A consulta da folha da Câmara retornou registros incompletos.");
      }
    }
    return resumirFolhaCamara(registros);
  },
  ["camara-abas-resumo-folha"],
  { revalidate: 3600, tags: ["folha-camara"] },
);

/** Orçamento da função Legislativa declarado ao SICONFI (mesma consulta de fetchCamaraOrcamento). */
export const fetchOrcamentoCamaraServidor = unstable_cache(
  async (): Promise<CamaraOrcamento[]> => {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("camara_orcamento")
      .select("*")
      .order("ano", { ascending: false });
    if (error) throw error;
    return (data || []) as CamaraOrcamento[];
  },
  ["camara-abas-orcamento"],
  { revalidate: 3600, tags: ["camara-orcamento"] },
);

/**
 * Pagamentos de anos fechados registrados no portal da Câmara, em páginas de mil linhas
 * (o limite do PostgREST), conferindo o total pela contagem exata.
 */
export const fetchPagamentosCamaraAnos = unstable_cache(
  async (anos: number[]): Promise<RegistroPagamentoCamara[]> => {
    if (!anos.length) return [];
    const supabase = createPublicSupabaseClient();
    const registros: RegistroPagamentoCamara[] = [];
    const pageSize = 1000;
    let expectedCount: number | null = null;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error, count } = await supabase
        .from("camara_despesas")
        .select("id, ano, credor, descricao, elemento, valor, data_pagamento", { count: "exact" })
        .in("ano", anos)
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) throw error;
      if (count === null || (expectedCount !== null && count !== expectedCount)) {
        throw new Error("Não foi possível confirmar o total de pagamentos da Câmara.");
      }
      expectedCount = count;
      for (const r of data ?? []) {
        registros.push({
          ano: Number(r.ano),
          credor: r.credor ?? null,
          descricao: r.descricao ?? null,
          elemento: r.elemento ?? null,
          valor: r.valor === null || r.valor === undefined ? null : Number(r.valor),
          data_pagamento: r.data_pagamento ?? null,
        });
      }
      if (registros.length === expectedCount) break;
      if (!data?.length || data.length < pageSize || registros.length > expectedCount) {
        throw new Error("A consulta de pagamentos da Câmara retornou registros incompletos.");
      }
    }
    return registros;
  },
  ["camara-abas-pagamentos"],
  { revalidate: 3600, tags: ["camara-despesas"] },
);
