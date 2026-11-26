// Leitura da resposta da API Placas (wdapi2.com.br/consulta/<placa>/<token>), usada pela
// Edge Function consulta-placa no Compra e Venda PBA e na PBAFipe.
// Documentação: apiplacas.com.br/doc.php (conferida em 2026-11-26). A FIPE pode não vir, ou
// vir com vários candidatos; o de maior "score" é o que melhor casa marca e nome do modelo.
// Nunca devolver a placa, o chassi nem dado do proprietário: só o que descreve o veículo.

export type TipoFipePlaca = "carros" | "motos" | "caminhoes";

export interface FipeDaPlaca {
  tipo: TipoFipePlaca;
  /** Código da marca na tabela FIPE (o mesmo da API FIPE v2). */
  marca: string;
  /** Código do modelo na tabela FIPE (o mesmo da API FIPE v2). */
  modelo: string;
  /** Ano-modelo; 32000 é veículo zero km. */
  anoModelo: number;
  codigoFipe: string;
  combustivel?: string;
}

export type DadosVeiculo = Record<string, string | number>;

// tipo_modelo da FIPE: 1 carros, 2 motos, 3 caminhões.
const TIPOS: Record<string, TipoFipePlaca> = { "1": "carros", "2": "motos", "3": "caminhoes" };
const CODIGO_NUMERICO = /^\d{1,6}$/;
const CODIGO_FIPE = /^\d{6}-\d$/;
const MAX_TEXTO = 80;

function registro(valor: unknown): Record<string, unknown> | null {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor) ? (valor as Record<string, unknown>) : null;
}

function codigo(valor: unknown): string | null {
  const texto = typeof valor === "number" && Number.isInteger(valor) ? String(valor) : typeof valor === "string" ? valor.trim() : "";
  return CODIGO_NUMERICO.test(texto) ? texto.replace(/^0+(?=\d)/, "") : null;
}

function texto(valor: unknown): string | null {
  if (typeof valor !== "string" && typeof valor !== "number") return null;
  const limpo = String(valor).replace(/\s+/g, " ").trim();
  return limpo && limpo.length <= MAX_TEXTO ? limpo : null;
}

function anoModelo(valor: unknown): number | null {
  const numero = typeof valor === "number" ? valor : typeof valor === "string" && /^\d{4,5}$/.test(valor.trim()) ? Number(valor) : NaN;
  if (!Number.isInteger(numero)) return null;
  return numero === 32000 || (numero >= 1900 && numero <= 2100) ? numero : null;
}

/** Candidato da tabela FIPE com maior score, ou null se nenhum vier completo. */
export function melhorFipeDaPlaca(resposta: unknown): FipeDaPlaca | null {
  const dados = registro(registro(resposta)?.fipe)?.dados;
  if (!Array.isArray(dados)) return null;
  let melhor: { fipe: FipeDaPlaca; score: number } | null = null;
  for (const item of dados.slice(0, 20)) {
    const candidato = registro(item);
    if (!candidato) continue;
    const tipo = TIPOS[String(candidato.tipo_modelo ?? "").trim()];
    const marca = codigo(candidato.codigo_marca);
    const modelo = codigo(candidato.codigo_modelo);
    const ano = anoModelo(candidato.ano_modelo);
    const codigoFipe = typeof candidato.codigo_fipe === "string" ? candidato.codigo_fipe.trim() : "";
    if (!tipo || !marca || !modelo || ano === null || !CODIGO_FIPE.test(codigoFipe)) continue;
    const score = typeof candidato.score === "number" && Number.isFinite(candidato.score) ? candidato.score : 0;
    if (melhor && score <= melhor.score) continue;
    const combustivel = texto(candidato.combustivel);
    melhor = {
      score,
      fipe: { tipo, marca, modelo, anoModelo: ano, codigoFipe, ...(combustivel ? { combustivel } : {}) },
    };
  }
  return melhor?.fipe ?? null;
}

/** Dados que descrevem o veículo, sem placa, chassi, município nem proprietário. */
export function dadosVeiculoDaPlaca(resposta: unknown): DadosVeiculo {
  const dado = registro(resposta) ?? {};
  const extra = registro(dado.extra) ?? {};
  const campos: Record<string, unknown> = {
    marca: dado.MARCA ?? dado.marca,
    modelo: dado.MODELO ?? dado.modelo,
    ano: dado.ano ?? extra.ano_fabricacao,
    ano_modelo: dado.anoModelo ?? extra.ano_modelo,
    cor: dado.cor,
    combustivel: dado.combustivel ?? extra.combustivel,
    tipo_veiculo: extra.tipo_veiculo ?? extra.segmento ?? dado.segmento,
    potencia: extra.potencia,
    cilindradas: extra.cilindradas,
  };
  const saida: DadosVeiculo = {};
  for (const [chave, valor] of Object.entries(campos)) {
    const limpo = texto(valor);
    if (limpo) saida[chave] = limpo;
  }
  return saida;
}
