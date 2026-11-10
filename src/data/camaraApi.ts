import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { resumirFolhaCamara, type RegistroFolhaCamara, type ResumoFolhaCamara } from "@/lib/camara-folha";
const supabase = createBrowserSupabaseClient();

// Types
export type CamaraLicitacao = {
  documento_url: string | null;
  id: string;
  ano: number;
  numero: string | null;
  modalidade: string | null;
  objeto: string | null;
  situacao: string | null;
  data_abertura: string | null;
  valor_estimado: number | null;
  fonte_url: string | null;
};

export type CamaraContrato = {
  centi_id: string | null;
  id: string;
  ano: number;
  numero: string | null;
  credor: string | null;
  objeto: string | null;
  valor: number | null;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  status: string | null;
  fonte_url: string | null;
};

export type CamaraDespesa = {
  id: string;
  ano: number;
  mes: number | null;
  credor: string | null;
  descricao: string | null;
  elemento: string | null;
  valor: number | null;
  data_pagamento: string | null;
  fonte_url: string | null;
};

export type CamaraReceita = {
  id: string;
  ano: number;
  mes: number;
  descricao: string | null;
  valor_previsto: number | null;
  valor_arrecadado: number | null;
  fonte_url: string | null;
};

export type CamaraOrcamento = {
  ano: number;
  dotacao: number | null;
  liquidada: number | null;
  periodo_referencia: number | null;
  fonte: string | null;
  fonte_url: string | null;
};

export type CamaraDiaria = {
  id: string;
  beneficiario: string | null;
  cargo: string | null;
  destino: string | null;
  motivo: string | null;
  valor: number | null;
  data: string | null;
  fonte_url: string | null;
};

export type PresencaSessao = {
  id: string;
  sessao_titulo: string;
  sessao_data: string | null;
  ano: number;
  vereador_id: string | null;
  vereador_nome: string | null;
  presente: boolean | null;
  tipo_sessao: string | null;
  fonte_url: string | null;
  fonte_tipo: string | null;
  status_verificacao: string | null;
  ata_url: string | null;
};

// Fetch functions
export async function fetchCamaraLicitacoes(): Promise<CamaraLicitacao[]> {
  const { data, error } = await supabase
    .from("camara_licitacoes")
    .select("*")
    .order("data_abertura", { ascending: false });
  if (error) throw error;
  return (data || []) as CamaraLicitacao[];
}

export async function fetchCamaraContratos(): Promise<CamaraContrato[]> {
  const { data, error } = await supabase
    .from("camara_contratos")
    .select("*")
    .order("vigencia_inicio", { ascending: false });
  if (error) throw error;
  return (data || []) as CamaraContrato[];
}

export async function fetchCamaraDespesas(ano?: number): Promise<CamaraDespesa[]> {
  let query = supabase.from("camara_despesas").select("*");
  if (ano) query = query.eq("ano", ano);
  const { data, error } = await query.order("data_pagamento", { ascending: false });
  if (error) throw error;
  return (data || []) as CamaraDespesa[];
}

export async function fetchCamaraReceitas(ano?: number): Promise<CamaraReceita[]> {
  let query = supabase.from("camara_receitas").select("*");
  if (ano) query = query.eq("ano", ano);
  const { data, error } = await query.order("mes", { ascending: true });
  if (error) throw error;
  return (data || []) as CamaraReceita[];
}

export async function fetchCamaraOrcamento(): Promise<CamaraOrcamento[]> {
  const { data, error } = await supabase
    .from("camara_orcamento")
    .select("*")
    .order("ano", { ascending: false });
  if (error) throw error;
  return (data || []) as CamaraOrcamento[];
}

export async function fetchCamaraDiarias(): Promise<CamaraDiaria[]> {
  const { data, error } = await supabase
    .from("camara_diarias")
    .select("*")
    .order("data", { ascending: false });
  if (error) throw error;
  return (data || []) as CamaraDiaria[];
}

export async function fetchPresencaSessoes(ano?: number): Promise<PresencaSessao[]> {
  let query = supabase.from("presenca_sessoes").select("*");
  if (ano) query = query.eq("ano", ano);
  const { data, error } = await query.order("sessao_data", { ascending: false });
  if (error) throw error;
  return (data || []) as PresencaSessao[];
}

export async function fetchCamaraResumoFolha(): Promise<ResumoFolhaCamara | null> {
  const ultimaCompetencia = async (apenasMensal: boolean) => {
    let query = supabase.from("remuneracao_servidores")
      .select("competencia, servidores!inner(orgao_tipo)")
      .eq("servidores.orgao_tipo", "camara");
    if (apenasMensal) query = query.ilike("tipo_folha", "MENSAL");
    const { data, error } = await query.order("competencia", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    return data?.competencia ?? null;
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
    registros.push(...(data ?? []));
    if (registros.length === expectedCount) break;
    if (!data?.length || data.length < pageSize || registros.length > expectedCount) {
      throw new Error("A consulta da folha da Câmara retornou registros incompletos.");
    }
  }
  return resumirFolhaCamara(registros);
}

export async function fetchPresencaAnos(): Promise<number[]> {
  const { data, error } = await supabase
    .from("presenca_sessoes")
    .select("ano");
  if (error) throw error;
  const set = new Set((data || []).map((d: { ano: number }) => d.ano));
  return Array.from(set).sort((a, b) => b - a);
}
