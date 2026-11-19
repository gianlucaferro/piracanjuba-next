import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { resumirFolhaCamara, type RegistroFolhaCamara, type ResumoFolhaCamara } from "@/lib/camara-folha";
import type { CamaraContrato, CamaraOrcamento } from "@/data/camaraApi";
import type { Servidor } from "@/data/prefeituraApi";
import {
  resumirPagamentosPorAno,
  type PagamentosCamaraAno,
  type RegistroPagamentoCamara,
} from "@/components/camara/resposta-aba";

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
 * Resumo por ano (quantidade, soma e linhas repetidas) dos pagamentos de anos fechados registrados
 * no portal da Câmara. Lê em páginas de mil linhas (o limite do PostgREST), conferindo o total pela
 * contagem exata, e resume aqui dentro: o cache guarda poucos bytes por ano, não as linhas. Com as
 * linhas cruas, o ano de 2026 (25.694 linhas em 2026-11-19, só 588 distintas) passaria de 4 MB, e o
 * data cache do Next não grava item acima de 2 MB.
 */
export const fetchPagamentosCamaraAnos = unstable_cache(
  async (anos: number[]): Promise<PagamentosCamaraAno[]> => {
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
    return resumirPagamentosPorAno(registros);
  },
  ["camara-abas-pagamentos-resumo"],
  { revalidate: 3600, tags: ["camara-despesas"] },
);

/**
 * Contagem das indicações para o parágrafo da aba: total, quantas são do ano pedido e a data da
 * mais recente. Mesmas consultas de fetchIndicacoesStats (src/lib/data/indicacoes-camara.ts), mas
 * com erro lançado: lá a falha de uma consulta vira 0, e o parágrafo afirmaria "0 delas no ano"
 * durante uma hora de cache.
 */
export const fetchIndicacoesResumoServidor = unstable_cache(
  async (ano: number): Promise<{ total: number; doAno: number; ultima: string | null }> => {
    const supabase = createPublicSupabaseClient();
    const contar = async (apenasDoAno: boolean): Promise<number> => {
      let query = supabase.from("indicacao_camara").select("*", { count: "exact", head: true });
      if (apenasDoAno) query = query.eq("ano", ano);
      const { count, error } = await query;
      if (error) throw error;
      if (count === null || count === undefined) {
        throw new Error("Não foi possível confirmar a contagem de indicações da Câmara.");
      }
      return count;
    };
    const maisRecente = async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from("indicacao_camara")
        .select("data_publicacao")
        .order("data_publicacao", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data?.data_publicacao as string | null | undefined) ?? null;
    };
    const [total, doAno, ultima] = await Promise.all([contar(false), contar(true), maisRecente()]);
    return { total, doAno, ultima };
  },
  ["camara-abas-indicacoes-resumo"],
  { revalidate: 3600, tags: ["indicacoes-camara"] },
);

/**
 * Quantas moções e quantos requerimentos a tabela ato_camara tem, por contagem exata. Ler as linhas
 * e contar aqui (o antigo fetchAtosStats) pararia em 1.000, o limite de linhas por resposta do
 * PostgREST, e o total afirmado no texto da aba ficaria preso nesse número. Erro é lançado: total
 * de leitura falha não vai para o cache nem para o texto.
 */
export const fetchAtuacaoResumoServidor = unstable_cache(
  async (): Promise<{ mocoes: number; requerimentos: number }> => {
    const supabase = createPublicSupabaseClient();
    const contar = async (tipo: "MOCAO" | "REQUERIMENTO"): Promise<number> => {
      const { count, error } = await supabase
        .from("ato_camara")
        .select("*", { count: "exact", head: true })
        .eq("tipo", tipo);
      if (error) throw error;
      if (count === null || count === undefined) {
        throw new Error("Não foi possível confirmar a contagem de atos da Câmara.");
      }
      return count;
    };
    const [mocoes, requerimentos] = await Promise.all([contar("MOCAO"), contar("REQUERIMENTO")]);
    return { mocoes, requerimentos };
  },
  ["camara-abas-atuacao-resumo"],
  { revalidate: 3600, tags: ["atos-camara"] },
);
