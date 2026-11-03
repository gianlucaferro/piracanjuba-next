import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { RegistroContratoGrupo } from "@/lib/gruposMetricas";

export interface GrupoSocioConector {
  nome: string;
  doc: string | null;
  n_empresas: number;
  cnpjs: string[];
}

export interface GrupoMembro {
  cnpj: string;
  razao_social: string | null;
  poderes: string[];
  n_contratos: number;
  valor: number;
}

export interface GrupoEconomico {
  id: string;
  rotulo: string;
  setor: string | null;
  tipo: string;
  n_empresas: number;
  valor_total: number;
  atualizado_em: string | null;
  socios_conectores: GrupoSocioConector[];
  membros: GrupoMembro[];
}

interface GrupoRow {
  id: string;
  rotulo: string;
  setor: string | null;
  tipo: string;
  n_empresas: number;
  valor_total: number;
  atualizado_em: string | null;
  socios_conectores: GrupoSocioConector[] | null;
  grupo_economico_membro: GrupoMembro[] | null;
}

export async function fetchGrupos(): Promise<GrupoEconomico[]> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from("grupo_economico")
    .select(
      "id, rotulo, setor, tipo, n_empresas, valor_total, atualizado_em, socios_conectores, grupo_economico_membro(cnpj, razao_social, poderes, n_contratos, valor)"
    )
    .order("valor_total", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as GrupoRow[]).map((g) => ({
    id: g.id,
    rotulo: g.rotulo,
    setor: g.setor,
    tipo: g.tipo,
    n_empresas: g.n_empresas,
    valor_total: g.valor_total,
    atualizado_em: g.atualizado_em,
    socios_conectores: (g.socios_conectores ?? []).slice().sort((a, b) => b.n_empresas - a.n_empresas),
    membros: (g.grupo_economico_membro ?? []).slice().sort((a, b) => b.valor - a.valor),
  }));
}

// Consulta sob demanda, por CNPJ e com paginação, sem carregar a base municipal inteira.
export async function fetchContratosGrupo(cnpjs: string[]): Promise<RegistroContratoGrupo[]> {
  const supabase = createBrowserSupabaseClient();
  const resultado: RegistroContratoGrupo[] = [];
  const chaves = [...new Set(cnpjs.map((c) => c.replace(/\D/g, "")).filter((c) => c.length === 14))];
  for (let inicio = 0; inicio < chaves.length; inicio += 40) {
    const lote = chaves.slice(inicio, inicio + 40);
    const variantes = lote.flatMap((cnpj) => [cnpj, cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")]);
    for (let from = 0; ; from += 500) {
      const { data, error } = await supabase.from("contratos")
        .select("id, empresa_cnpj_digitos, numero, vigencia_inicio, valor, fonte_url")
        .in("empresa_cnpj_digitos", lote).order("id").range(from, from + 499);
      if (error) throw error;
      resultado.push(...(data ?? []).map((r) => ({ id: r.id, orgao: "prefeitura" as const, tipo: "original" as const,
        cnpj: r.empresa_cnpj_digitos ?? "", numero: r.numero, data: r.vigencia_inicio, valor: r.valor, fonteUrl: r.fonte_url })));
      if ((data?.length ?? 0) < 500) break;
    }
    for (let from = 0; ; from += 500) {
      const { data, error } = await supabase.from("contratos_aditivos")
        .select("id, cnpj, contrato_numero, data_termo, valor, fonte_url")
        .in("cnpj", variantes).order("id").range(from, from + 499);
      if (error) throw error;
      // Os termos da Câmara são lidos na tabela própria abaixo, evitando dupla contagem.
      resultado.push(...(data ?? []).filter((r) => {
        try {
          const host = new URL(r.fonte_url ?? "").hostname;
          return host === "piracanjuba.centi.com.br" || host === "acessoainformacao.piracanjuba.go.gov.br";
        } catch { return false; }
      }).map((r) => ({ id: r.id, orgao: "prefeitura" as const, tipo: "aditivo" as const,
        cnpj: r.cnpj ?? "", numero: r.contrato_numero, data: r.data_termo, valor: r.valor, fonteUrl: r.fonte_url })));
      if ((data?.length ?? 0) < 500) break;
    }
    for (let from = 0; ; from += 500) {
      const { data, error } = await supabase.from("contrato_camara")
        .select("id, fornecedor_cnpj_limpo, numero, data_firmatura, inicio_vigencia, valor, fonte_url, documento_url, tipo")
        .in("fornecedor_cnpj_limpo", lote).in("tipo", ["Original", "Aditivo"]).order("id").range(from, from + 499);
      if (error) throw error;
      resultado.push(...(data ?? []).map((r) => ({ id: r.id, orgao: "camara" as const, tipo: r.tipo === "Aditivo" ? "aditivo" as const : "original" as const,
        cnpj: r.fornecedor_cnpj_limpo ?? "", numero: r.numero, data: r.data_firmatura ?? r.inicio_vigencia,
        valor: r.valor, fonteUrl: r.documento_url ?? r.fonte_url })));
      if ((data?.length ?? 0) < 500) break;
    }
  }
  return resultado;
}

// Índice CNPJ -> resumo do grupo, para o selo nos cards de contrato.
export interface GrupoResumo {
  grupo_id: string;
  rotulo: string;
  setor: string | null;
  n_empresas: number;
}

export function indexarPorCnpj(grupos: GrupoEconomico[]): Map<string, GrupoResumo> {
  const mapa = new Map<string, GrupoResumo>();
  for (const g of grupos) {
    for (const m of g.membros) {
      const chave = (m.cnpj || "").replace(/\D/g, "");
      if (chave.length === 14) {
        mapa.set(chave, {
          grupo_id: g.id,
          rotulo: g.rotulo,
          setor: g.setor,
          n_empresas: g.n_empresas,
        });
      }
    }
  }
  return mapa;
}
