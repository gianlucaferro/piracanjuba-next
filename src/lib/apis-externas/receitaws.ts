// ReceitaWS — dados de CNPJ direto da Receita Federal via API pública.
// Sem auth, sem limite oficial documentado (~1 req/s na prática).
// Docs: https://www.receitaws.com.br/
//
// VANTAGEM vs BrasilAPI:
//  + Inclui email e telefone do estabelecimento
//  + Campo simples (Simples Nacional optante sim/não)
//  + Campo simei
//  + capital_social em valor numérico direto
//  + Retorna QSA (quadro societário) completo com qualificação
//
// DESVANTAGEM vs BrasilAPI:
//  - Pode retornar { "status": "ERROR", "message": "CNPJ inválido" } em 429/erros
//  - Sem dados de CNAE secundários
//  - Menos estruturado (mistura formatos BR: "19/07/2018" em abertura)

const BASE = "https://www.receitaws.com.br/v1";

export type ReceitaWsCnpj = {
  status: "OK" | "ERROR";
  message?: string;
  cnpj: string;
  nome: string;
  fantasia: string | null;
  situacao: "ATIVA" | "BAIXADA" | "INAPTA" | "SUSPENSA" | string;
  tipo: "MATRIZ" | "FILIAL";
  porte: string;
  natureza_juridica: string;
  abertura: string;          // formato DD/MM/YYYY
  logradouro: string;
  numero: string;
  complemento: string | null;
  municipio: string;
  bairro: string;
  uf: string;
  cep: string;
  email: string | null;
  telefone: string | null;
  capital_social: string;    // "100000.00"
  simples?: {
    optante: boolean;
    data_opcao: string | null;
    data_exclusao: string | null;
  } | null;
  simei?: {
    optante: boolean;
    data_opcao: string | null;
    data_exclusao: string | null;
  } | null;
  qsa?: Array<{
    nome: string;
    qual: string;           // "49-Sócio-Administrador"
    pais_origem?: string | null;
    nome_rep_legal?: string | null;
    qual_rep_legal?: string | null;
  }>;
  ultima_atualizacao: string;
  billing?: { free: boolean; database: boolean };
};

/**
 * Busca dados do CNPJ via ReceitaWS.
 * Retorna null em 429, erro de rede ou CNPJ inválido.
 */
export async function buscarCnpjReceitaWS(
  cnpj: string,
): Promise<ReceitaWsCnpj | null> {
  const digitos = cnpj.replace(/\D/g, "");
  if (digitos.length !== 14) return null;
  try {
    const resp = await fetch(`${BASE}/cnpj/${digitos}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as ReceitaWsCnpj;
    if (data.status === "ERROR") return null;
    return data;
  } catch {
    return null;
  }
}
