/// <reference lib="deno.ns" />

// Remuneração mensal dos vereadores a partir da folha pública da Câmara no
// portal NúcleoGov (servidores_cnt/listar). Funções puras, sem rede nem banco,
// para o coletor sync-remuneracao-vereadores e para os testes.
//
// Até 2026-07 a folha saía no portal Centi antigo (camarapiracanjuba.centi.com.br).
// Depois disso o Centi passou a devolver lista vazia e o coletor gravava "success"
// com zero linhas, deixando o perfil dos vereadores parado em julho de 2026.

type JsonRecord = Record<string, unknown>;

export type VereadorCadastro = { id: string; nome: string };

export type LinhaVereadorFolha = {
  nome: string;
  /** salario_base da folha; null quando a fonte traz 0 ou vazio. */
  subsidio: number | null;
  bruto: number | null;
  liquido: number | null;
};

export type LinhaRemuneracaoMensal = {
  vereador_id: string;
  competencia: string;
  subsidio_referencia: number;
  bruto: number;
  liquido: number | null;
};

export type PlanoCompetencia = {
  linhas: LinhaRemuneracaoMensal[];
  /** Vereadores da folha sem correspondência no cadastro (ex.: suplente em exercício). */
  sem_cadastro: string[];
};

/** "9.721,92" -> 9721.92; vazio ou inválido -> null. */
export function parseValorBRL(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = String(value).replace("R$", "").trim();
  if (!text) return null;
  const normalized = text.includes(",")
    ? text.replace(/\./g, "").replace(",", ".")
    : text;
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null;
}

const PARTICULAS = new Set(["de", "da", "do", "das", "dos", "e"]);

/** Nome em minúsculas, sem acento e sem partículas ("Sirley de Fátima" -> ["sirley", "fatima"]). */
export function tokensNome(nome: string): string[] {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !PARTICULAS.has(t));
}

/**
 * Casa o nome civil da folha ("WELTON ETERNO DA SILVA") com o nome curto do
 * cadastro ("Welton da Silva"): mesmo primeiro nome e todos os nomes do cadastro
 * presentes na folha. Mais de um candidato é erro, nunca escolha arbitrária.
 */
export function casarVereador(
  nomeFolha: string,
  vereadores: VereadorCadastro[],
): string | null {
  const folha = tokensNome(nomeFolha);
  if (folha.length === 0) return null;
  const presentes = new Set(folha);
  const candidatos = vereadores.filter((v) => {
    const cadastro = tokensNome(v.nome);
    return cadastro.length > 0 && cadastro[0] === folha[0] &&
      cadastro.every((t) => presentes.has(t));
  });
  if (candidatos.length > 1) {
    throw new Error(
      `Folha Câmara: ${nomeFolha} casa com mais de um vereador do cadastro`,
    );
  }
  return candidatos[0]?.id ?? null;
}

/**
 * Linhas da folha MENSAL com cargo de vereador. Adiantamento e 13º ficam de fora:
 * remuneracao_mensal guarda o mês do mandato, não outras folhas do mesmo mês.
 */
export function vereadoresDaFolhaMensal(
  rows: JsonRecord[],
  ano: number,
  mes: number,
): LinhaVereadorFolha[] {
  const porNome = new Map<string, LinhaVereadorFolha>();
  for (const row of rows) {
    if (Number(row.ano) !== ano || Number(row.mes) !== mes) {
      throw new Error("Folha Câmara: registro fora da competência solicitada");
    }
    const cargo = String(row.cargo ?? "").toUpperCase();
    const tipoFolha = String(row.tipo_folha ?? "").trim().toUpperCase();
    if (!cargo.includes("VEREADOR") || tipoFolha !== "MENSAL") continue;
    const nome = String(row.nome ?? "").trim();
    if (!nome) throw new Error("Folha Câmara: vereador sem nome na folha");
    const chave = tokensNome(nome).join(" ");
    if (porNome.has(chave)) {
      // Duas linhas MENSAL do mesmo vereador (ex.: movimentação complementar) não
      // são somadas às cegas: a competência falha e aparece no sync_log.
      throw new Error(`Folha Câmara: ${nome} aparece duas vezes na folha mensal`);
    }
    const subsidio = parseValorBRL(row.salario_base);
    porNome.set(chave, {
      nome,
      subsidio: subsidio !== null && subsidio > 0 ? subsidio : null,
      bruto: parseValorBRL(row.total_proventos),
      liquido: parseValorBRL(row.total_liquido),
    });
  }
  return [...porNome.values()];
}

/** Linhas a gravar em remuneracao_mensal para uma competência. */
export function planejarCompetencia(
  competencia: string,
  folha: LinhaVereadorFolha[],
  vereadores: VereadorCadastro[],
): PlanoCompetencia {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia)) {
    throw new Error("Competência inválida");
  }
  const linhas: LinhaRemuneracaoMensal[] = [];
  const semCadastro: string[] = [];
  const usados = new Map<string, string>();
  for (const linha of folha) {
    const vereadorId = casarVereador(linha.nome, vereadores);
    if (!vereadorId) {
      semCadastro.push(linha.nome);
      continue;
    }
    const anterior = usados.get(vereadorId);
    if (anterior) {
      throw new Error(
        `Folha Câmara: ${anterior} e ${linha.nome} casam com o mesmo vereador`,
      );
    }
    usados.set(vereadorId, linha.nome);
    if (linha.bruto === null || linha.bruto <= 0) continue;
    linhas.push({
      vereador_id: vereadorId,
      competencia,
      // Coluna NOT NULL: 0 quando a folha não traz o salário base. O site trata
      // 0 como "subsídio não informado", nunca como R$ 0,00.
      subsidio_referencia: linha.subsidio ?? 0,
      bruto: linha.bruto,
      liquido: linha.liquido,
    });
  }
  return { linhas, sem_cadastro: semCadastro };
}

/** Competência padrão do coletor: o mês corrente em Brasília (UTC-3). */
export function mesCorrenteBrasilia(now = new Date()): { ano: number; mes: number } {
  const brasilia = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return { ano: brasilia.getUTCFullYear(), mes: brasilia.getUTCMonth() + 1 };
}
