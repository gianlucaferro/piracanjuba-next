// Consultas da Prefeitura que rodam no servidor e no navegador com a mesma função: quem chama
// passa o cliente Supabase (público no servidor, de navegador no cliente). Assim a hidratação
// do react-query recebe exatamente o formato que a aba buscaria sozinha.
//
// As consultas de lote (contratos, despesas, servidores) repetem colunas e ordem das buscas de
// src/data/prefeituraApi.ts, que a Câmara também usa; tests/prefeitura-respostas.test.ts
// confere essa equivalência lendo o arquivo.
import type { SupabaseClient } from "@supabase/supabase-js";
import { resumirFolhaPrefeitura, type RegistroCoberturaPrefeitura, type RegistroFolhaPrefeitura, type ResumoFolhaPrefeitura } from "./prefeitura-folha.ts";
import {
  competenciaEmBrasilia,
  escolherSubsidio,
  papelDoTipo,
  vinculosDoCargo,
  type DespesaMensalResumo,
  type LinhaRemuneracao,
  type ServidorCandidato,
  type SubsidioExecutivo,
} from "./prefeitura-respostas.ts";
import { SERVIDORES_POR_PAGINA } from "./prefeitura-lote.ts";

/** Mesmas colunas de fetchContratos (src/data/prefeituraApi.ts). */
export const COLUNAS_CONTRATOS =
  "id,numero,empresa,valor,objeto,vigencia_inicio,vigencia_fim,status,secretaria_id,fonte_url,updated_at,empresa_cnpj,empresa_razao_social,empresa_situacao_cadastral,empresa_cnae_descricao,empresa_municipio,empresa_uf,empresa_porte";

type PessoaDoCadastro = { nome: string; tipo: string };

// ===== Chefia do Executivo =====

/** Igual a fetchExecutivo: o cadastro inteiro (prefeita e vice), por tipo. */
export async function consultarExecutivo<T = Record<string, unknown>>(sb: SupabaseClient): Promise<T[]> {
  const { data, error } = await sb.from("executivo").select("*").order("tipo");
  if (error) throw error;
  return (data ?? []) as T[];
}

/**
 * Subsídio da prefeita e do vice na folha: o vínculo com o cargo eletivo (não outro vínculo da
 * mesma pessoa) e o bruto da folha MENSAL mais recente. Chave ["executivo-remuneracao"].
 */
export async function consultarRemuneracaoExecutivo(sb: SupabaseClient, executivo?: PessoaDoCadastro[]): Promise<SubsidioExecutivo[]> {
  let pessoas = executivo;
  if (!pessoas) {
    const { data, error } = await sb.from("executivo").select("nome, tipo");
    if (error) throw error;
    pessoas = (data ?? []) as PessoaDoCadastro[];
  }
  const resultados = await Promise.all(pessoas.map(async (pessoa): Promise<SubsidioExecutivo | null> => {
    if (!pessoa.nome?.trim()) return null;
    // Sempre Prefeitura: um homônimo na Câmara não pode virar subsídio do Executivo.
    const { data: candidatos, error } = await sb
      .from("servidores")
      .select("id, nome, cargo")
      .eq("orgao_tipo", "prefeitura")
      .ilike("nome", `%${pessoa.nome.trim()}%`);
    if (error) throw error;
    const ids = vinculosDoCargo((candidatos ?? []) as ServidorCandidato[], pessoa.nome, papelDoTipo(pessoa.tipo));
    if (!ids.length) return null;
    const { data: linhas, error: erroFolha } = await sb
      .from("remuneracao_servidores")
      .select("competencia, tipo_folha, bruto, fonte_url")
      .in("servidor_id", ids)
      .ilike("tipo_folha", "MENSAL")
      .order("competencia", { ascending: false })
      .limit(12);
    if (erroFolha) throw erroFolha;
    const subsidio = escolherSubsidio((linhas ?? []) as LinhaRemuneracao[]);
    return subsidio ? { nome: pessoa.nome, tipo: pessoa.tipo, ...subsidio } : null;
  }));
  return resultados.filter((r): r is SubsidioExecutivo => r !== null);
}

// ===== Secretarias e servidores =====

/** Igual a fetchSecretarias. Chave ["secretarias"]. */
export async function consultarSecretarias<T = Record<string, unknown>>(sb: SupabaseClient): Promise<T[]> {
  const { data, error } = await sb.from("secretarias").select("*").order("nome");
  if (error) throw error;
  return (data ?? []) as T[];
}

/**
 * Igual a fetchServidores(undefined, undefined, pagina, SERVIDORES_POR_PAGINA, "prefeitura"),
 * a busca da aba sem texto digitado. Chave ["servidores", "", pagina].
 */
export async function consultarServidoresPagina<T = Record<string, unknown>>(sb: SupabaseClient, pagina = 0): Promise<{ data: T[]; count: number }> {
  const inicio = pagina * SERVIDORES_POR_PAGINA;
  const { data, error, count } = await sb
    .from("servidores")
    .select("*", { count: "exact" })
    .eq("orgao_tipo", "prefeitura")
    .order("nome")
    .order("id")
    .range(inicio, inicio + SERVIDORES_POR_PAGINA - 1);
  if (error) throw error;
  return { data: (data ?? []) as T[], count: count ?? 0 };
}

// ===== Contratos e despesas (primeiro lote) =====

/** Os primeiros contratos na ordem de fetchContratos (início de vigência, do mais recente). */
export async function consultarLoteContratos<T = Record<string, unknown>>(sb: SupabaseClient, limite: number): Promise<T[]> {
  const { data, error } = await sb
    .from("contratos")
    .select(COLUNAS_CONTRATOS)
    .order("vigencia_inicio", { ascending: false })
    .limit(limite);
  if (error) throw error;
  return (data ?? []) as T[];
}

export async function contarContratos(sb: SupabaseClient): Promise<number | null> {
  const { count, error } = await sb.from("contratos").select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? null;
}

/** As despesas mais recentes, na ordem e com as colunas de fetchDespesas. */
export async function consultarLoteDespesas<T = Record<string, unknown>>(sb: SupabaseClient, limite: number): Promise<T[]> {
  const { data, error } = await sb.from("despesas").select("*").order("data", { ascending: false }).limit(limite);
  if (error) throw error;
  return (data ?? []) as T[];
}

/**
 * Meses lidos para a resposta de despesas. A coleta mensal regrava as 24 competências recentes, então
 * o mês maduro mais recente costuma ser o terceiro; 6 dá folga se uma coleta falhar em parte.
 */
export const MESES_DESPESAS_RECENTES = 6;

/** Totais mensais oficiais (empenhado, liquidado e pago) dos meses mais recentes. */
export async function consultarDespesasMensaisRecentes(sb: SupabaseClient): Promise<DespesaMensalResumo[]> {
  const { data, error } = await sb
    .from("despesas_mensais")
    .select("competencia, valor_empenhado, valor_liquidado, valor_pago, fonte_nome, fonte_url, data_coleta")
    .order("competencia", { ascending: false })
    .limit(MESES_DESPESAS_RECENTES);
  if (error) throw error;
  return (data ?? []) as DespesaMensalResumo[];
}

// ===== Resumo da folha (antes em src/data/prefeituraFolhaApi.ts) =====

async function lerPaginas<T extends { id?: string; chave?: string }>(
  lerPagina: (inicio: number, fim: number) => PromiseLike<{ data: T[] | null; error: unknown; count: number | null }>,
): Promise<T[]> {
  const registros: T[] = [];
  const ids = new Set<string>();
  const tamanho = 1000;
  let totalEsperado: number | null = null;
  for (let inicio = 0; ; inicio += tamanho) {
    const { data, error, count } = await lerPagina(inicio, inicio + tamanho - 1);
    if (error) throw error;
    if (count === null || (totalEsperado !== null && count !== totalEsperado)) {
      throw new Error("Não foi possível confirmar o total de registros da folha da Prefeitura.");
    }
    totalEsperado = count;
    for (const registro of data ?? []) {
      const id = registro.id ?? registro.chave;
      if (!id || ids.has(id)) throw new Error("A consulta da folha da Prefeitura retornou registros inconsistentes.");
      ids.add(id);
      registros.push(registro);
    }
    if (registros.length === totalEsperado) return registros;
    if (!data?.length || data.length < tamanho || registros.length > totalEsperado) {
      throw new Error("A consulta da folha da Prefeitura retornou registros incompletos.");
    }
  }
}

/** Resumo da folha mensal, rescisões e 13º. Chave ["prefeitura-resumo-folha"]. */
export async function consultarResumoFolhaPrefeitura(sb: SupabaseClient): Promise<ResumoFolhaPrefeitura | null> {
  const ultimaCompetencia = async (apenasMensal: boolean, antesDe?: string) => {
    let query = sb.from("remuneracao_servidores")
      .select("competencia, servidores!inner(orgao_tipo)")
      .eq("servidores.orgao_tipo", "prefeitura");
    if (apenasMensal) query = query.ilike("tipo_folha", "MENSAL");
    if (antesDe) query = query.lt("competencia", antesDe);
    const { data, error } = await query.order("competencia", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    return (data as { competencia: string } | null)?.competencia ?? null;
  };

  const [recente, mensal] = await Promise.all([ultimaCompetencia(false), ultimaCompetencia(true)]);
  if (!recente) return null;
  const anterior = mensal ? await ultimaCompetencia(true, mensal) : null;
  const competencias = [...new Set([recente, ...(mensal ? [mensal] : [])])];
  const competenciasCobertura = [mensal, anterior].filter((c): c is string => c !== null);
  const filtroCobertura = competenciasCobertura.map((competencia) => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia)) throw new Error("Competência inválida na folha da Prefeitura.");
    const [ano, mes] = competencia.split("-").map(Number);
    return `and(ano.eq.${ano},mes.eq.${mes})`;
  }).join(",");

  const [registros, cobertura] = await Promise.all([
    lerPaginas<RegistroFolhaPrefeitura & { id: string }>((inicio, fim) => sb.from("remuneracao_servidores")
      .select("id, servidor_id, competencia, tipo_folha, bruto, servidores!inner(orgao_tipo)", { count: "exact" })
      .eq("servidores.orgao_tipo", "prefeitura")
      .in("competencia", competencias)
      .order("id", { ascending: true }).range(inicio, fim)
      .returns<(RegistroFolhaPrefeitura & { id: string })[]>()),
    filtroCobertura ? lerPaginas<RegistroCoberturaPrefeitura & { chave: string }>((inicio, fim) => sb.from("prefeitura_folha_nucleogov")
      // Projetar somente metadados públicos de órgão, nunca o payload pessoal.
      .select("chave, ano, mes, orgao_id:raw_payload->>orgao_id, orgao_nome:raw_payload->>orgao", { count: "exact" })
      .ilike("tipo_folha", "MENSAL").or(filtroCobertura)
      .order("chave", { ascending: true }).range(inicio, fim)
      .returns<(RegistroCoberturaPrefeitura & { chave: string })[]>()) : Promise.resolve([]),
  ]);

  return resumirFolhaPrefeitura(registros, cobertura, anterior, competenciaEmBrasilia());
}
