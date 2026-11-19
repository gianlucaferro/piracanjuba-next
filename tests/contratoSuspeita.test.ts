import assert from "node:assert/strict";
import test from "node:test";
import {
  calcularSuspeitaContrato,
  normalizarCamara,
  normalizarPrefeitura,
  type FornecedorCNPJ,
} from "../src/lib/contratoSuspeita.ts";
import {
  buildAditivosLookup,
  getAditivosDoContrato,
  type AditivosLookup,
  type ContratoAditivo,
} from "../src/lib/contratosAditivos.ts";

// PERF-01 (auditoria de SEO, 2026-11-19): a pontuação de risco passou a usar índices
// pré-computados. Este teste compara a versão nova com a anterior, copiada abaixo sem
// alteração de lógica (src/lib/contratoSuspeita.ts no commit 0f5dbae), em conjuntos
// sintéticos com casos de borda. A medição de tempo roda só com MEDIR_SUSPEITA=1:
//   MEDIR_SUSPEITA=1 node --test tests/contratoSuspeita.test.ts

type ContratoBase = ReturnType<typeof normalizarPrefeitura>;

interface AditivoInfo {
  contrato_numero: string;
  valor: number | null;
  cnpj: string | null;
  credor: string | null;
}

// ===== Referência: implementação anterior, quadrática (não editar) =====
const TERMOS_VAGOS = [
  "serviços diversos",
  "materiais diversos",
  "prestação de serviços",
  "aquisição de materiais",
  "serviços gerais",
  "diversos",
  "materiais variados",
  "itens diversos",
  "material de consumo",
  "serviços de terceiros",
];

const TERMOS_EMERGENCIA = [
  "emergência",
  "emergencial",
  "calamidade",
  "urgência",
  "urgente",
  "situação emergencial",
  "estado de emergência",
  "caráter emergencial",
  "contratação emergencial",
  "dispensa de licitação por emergência",
];

const FERIADOS_NACIONAIS = [
  "01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "12-25",
];

// Limites de dispensa (Lei 14.133/2021)
const LIMITE_COMPRAS = 50_000;
const LIMITE_OBRAS = 100_000;

/**
 * Build a map: fornecedor_nome (upper) -> cnpj from aditivos
 */
function buildNomeToCnpjMap(aditivos: AditivoInfo[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const a of aditivos) {
    const nome = a.credor?.trim().toUpperCase();
    const cnpj = a.cnpj?.replace(/\D/g, "");
    if (nome && cnpj && cnpj.length === 14) {
      map.set(nome, cnpj);
    }
  }
  return map;
}

/**
 * Detect if a contract's object text suggests emergency procurement.
 */
function isEmergencial(objeto: string): boolean {
  const lower = objeto.toLowerCase();
  return TERMOS_EMERGENCIA.some((t) => lower.includes(t));
}

/**
 * Resolve the CNPJ for a given contract pelo NOME do fornecedor nos aditivos.
 * O lookup antigo por contrato_numero foi removido: números de contrato se
 * repetem entre anos/órgãos e atribuíam CNPJ de contratos homônimos.
 */
function resolverCnpj(
  contrato: ContratoBase,
  nomeToCnpj: Map<string, string>
): string | null {
  if (contrato.fornecedor) {
    const cnpj = nomeToCnpj.get(contrato.fornecedor.trim().toUpperCase());
    if (cnpj) return cnpj;
  }
  return null;
}

function calcularSuspeitaContratoReferencia(
  contrato: ContratoBase,
  historicoCompleto: ContratoBase[],
  aditivos: AditivoInfo[],
  fornecedoresCNPJ?: Map<string, FornecedorCNPJ>,
  aditivosLookup?: AditivosLookup,
  emGrupoEconomico?: boolean
): boolean {
  let pontos = 0;

  const valor = contrato.valor || 0;
  const fornecedor = contrato.fornecedor?.trim().toUpperCase() || "";
  const objeto = contrato.objeto?.trim().toLowerCase() || "";

  // Pre-compute CNPJ map (memoized per call but cheap enough)
  const nomeToCnpj = buildNomeToCnpjMap(aditivos);
  const meuCnpj = resolverCnpj(contrato, nomeToCnpj);

  // ──────────────────────────────────────────────────────────
  // 1. DISPENSA PRÓXIMA DO LIMITE (+2)
  //    Sem campo tipoContratacao, inferimos: se o valor está
  //    próximo do limite E não há licitação associada (valor
  //    abaixo do teto = provavelmente dispensa), flaggamos.
  // ──────────────────────────────────────────────────────────
  if (valor >= LIMITE_COMPRAS * 0.95 && valor <= LIMITE_COMPRAS) {
    pontos += 2;
  } else if (valor >= LIMITE_OBRAS * 0.95 && valor <= LIMITE_OBRAS) {
    pontos += 2;
  }

  // ──────────────────────────────────────────────────────────
  // 2. EXCESSO DE CONTRATAÇÕES EMERGENCIAIS (+3)
  //    Detectamos emergências por palavras-chave no campo objeto.
  //    Se houver mais de 5 contratos emergenciais em 6 meses,
  //    flaggamos ESTE contrato se ele também for emergencial.
  // ──────────────────────────────────────────────────────────
  if (objeto && isEmergencial(objeto) && contrato.vigencia_inicio) {
    try {
      const dataRef = new Date(contrato.vigencia_inicio + "T12:00:00");
      const seisMesesAntes = new Date(dataRef);
      seisMesesAntes.setMonth(seisMesesAntes.getMonth() - 6);

      const emergencias6m = historicoCompleto.filter((c) => {
        if (!c.objeto || !c.vigencia_inicio) return false;
        if (!isEmergencial(c.objeto.toLowerCase())) return false;
        const d = new Date(c.vigencia_inicio + "T12:00:00");
        return d >= seisMesesAntes && d <= dataRef;
      });

      if (emergencias6m.length > 5) {
        pontos += 3;
      }
    } catch {
      // skip
    }
  }

  // ──────────────────────────────────────────────────────────
  // 3. FORNECEDOR RECORRENTE (+2 ou +3)
  //    Usa CNPJ quando disponível, senão nome do fornecedor.
  // ──────────────────────────────────────────────────────────
  if (meuCnpj) {
    // Count by CNPJ across all contracts
    let count = 0;
    for (const c of historicoCompleto) {
      const cnpj = resolverCnpj(c, nomeToCnpj);
      if (cnpj === meuCnpj) count++;
    }
    if (count > 20) pontos += 3;
    else if (count >= 10) pontos += 2;
  } else if (fornecedor) {
    // Fallback: count by name
    const count = historicoCompleto.filter(
      (c) => c.fornecedor?.trim().toUpperCase() === fornecedor
    ).length;
    if (count > 20) pontos += 3;
    else if (count >= 10) pontos += 2;
  }

  // ──────────────────────────────────────────────────────────
  // 4. OBJETO GENÉRICO OU VAGO (+2)
  // ──────────────────────────────────────────────────────────
  if (objeto) {
    const isVago =
      objeto.length < 50 ||
      TERMOS_VAGOS.some((t) => objeto.includes(t));
    if (isVago) pontos += 2;
  } else {
    pontos += 2;
  }

  // ──────────────────────────────────────────────────────────
  // 5. ADITIVOS DESPROPORCIONAIS (+2 ou +3)
  //    Vínculo AUTORITATIVO pelo id do contrato no portal (via
  //    aditivosLookup). O match antigo por contrato_numero colava
  //    aditivos de contratos homônimos de outros anos e inflava o
  //    ratio: um contrato pequeno (ex: R$ 405) herdava o aditivo
  //    gigante de outro contrato de mesmo número e era marcado como
  //    risco sem ter aditivo nenhum. Sem lookup, a regra não pontua.
  // ──────────────────────────────────────────────────────────
  if (aditivosLookup && valor > 0) {
    const agregado = getAditivosDoContrato(
      aditivosLookup,
      contrato.numero,
      contrato.fornecedor,
      contrato.fonte_url,
      contrato.centi_id
    );
    const totalAditivos = agregado?.totalValor || 0;
    if (totalAditivos > 0) {
      const ratio = totalAditivos / valor;
      if (ratio > 1) pontos += 3;
      else if (ratio >= 0.5) pontos += 2;
    }
  }

  // ──────────────────────────────────────────────────────────
  // 6. DATA DE ASSINATURA SUSPEITA (+2 cada)
  // ──────────────────────────────────────────────────────────
  if (contrato.vigencia_inicio) {
    try {
      const dt = new Date(contrato.vigencia_inicio + "T12:00:00");
      const dow = dt.getDay();
      if (dow === 0 || dow === 6) pontos += 2;

      const mmdd = `${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      if (FERIADOS_NACIONAIS.includes(mmdd)) pontos += 2;

      if (dt.getMonth() === 11 && dt.getDate() >= 21) pontos += 2;
    } catch {
      // skip
    }
  }

  // ──────────────────────────────────────────────────────────
  // 7. FORNECEDOR COM CNPJ RECENTE (+2 ou +3)
  // 11. CNPJ COM SITUAÇÃO IRREGULAR (+3)
  // ──────────────────────────────────────────────────────────
  if (fornecedoresCNPJ && meuCnpj) {
    const info = fornecedoresCNPJ.get(meuCnpj);
    if (info) {
      // Critério 7: empresa recente
      if (info.data_abertura && contrato.vigencia_inicio) {
        try {
          const abertura = new Date(info.data_abertura + "T12:00:00");
          const assinatura = new Date(contrato.vigencia_inicio + "T12:00:00");
          const diffMs = assinatura.getTime() - abertura.getTime();
          const diffMeses = diffMs / (1000 * 60 * 60 * 24 * 30);

          if (diffMeses >= 0 && diffMeses < 6 && valor >= 100_000) {
            pontos += 3;
          } else if (diffMeses >= 0 && diffMeses < 3) {
            pontos += 2;
          }
        } catch {
          // skip
        }
      }

      // Critério 11: situação cadastral irregular
      const situacao = info.situacao_cadastral?.toUpperCase();
      if (situacao && situacao !== "ATIVA") {
        pontos += 3;
      }
    }
  }

  // ──────────────────────────────────────────────────────────
  // 8. VALORES QUEBRADOS SUSPEITOS (+2)
  // ──────────────────────────────────────────────────────────
  if (valor > 0) {
    const centavos = Math.round((valor % 1) * 100);
    const proxLimite =
      (valor >= LIMITE_COMPRAS * 0.9 && valor <= LIMITE_COMPRAS) ||
      (valor >= LIMITE_OBRAS * 0.9 && valor <= LIMITE_OBRAS);
    if (proxLimite && centavos !== 0) {
      pontos += 2;
    }
  }

  // ──────────────────────────────────────────────────────────
  // 9. MESMO FORNECEDOR, VALORES SIMILARES NOS ÚLTIMOS 12 MESES (+2)
  //    Usa CNPJ quando disponível para matching preciso.
  // ──────────────────────────────────────────────────────────
  if ((meuCnpj || fornecedor) && contrato.vigencia_inicio) {
    try {
      const dataRef = new Date(contrato.vigencia_inicio + "T12:00:00");
      const umAnoAntes = new Date(dataRef);
      umAnoAntes.setFullYear(umAnoAntes.getFullYear() - 1);

      const mesmoFornecedor12m = historicoCompleto.filter((c) => {
        if (!c.vigencia_inicio) return false;
        const d = new Date(c.vigencia_inicio + "T12:00:00");
        if (d < umAnoAntes || d > dataRef) return false;

        // Match by CNPJ first, then by name
        if (meuCnpj) {
          const outroCnpj = resolverCnpj(c, nomeToCnpj);
          return outroCnpj === meuCnpj;
        }
        return c.fornecedor?.trim().toUpperCase() === fornecedor;
      });

      if (mesmoFornecedor12m.length >= 3 && valor > 0) {
        const valoresSimilares = mesmoFornecedor12m.filter((c) => {
          if (!c.valor || c.valor === 0) return false;
          const diff = Math.abs(c.valor - valor) / valor;
          return diff < 0.1;
        });
        if (valoresSimilares.length >= 3) pontos += 2;
      }
    } catch {
      // skip
    }
  }

  // ──────────────────────────────────────────────────────────
  // 10. PRAZO DE EXECUÇÃO DESPROPORCIONAL (+2)
  // ──────────────────────────────────────────────────────────
  if (contrato.vigencia_inicio && contrato.vigencia_fim && valor > 0) {
    try {
      const inicio = new Date(contrato.vigencia_inicio + "T12:00:00");
      const fim = new Date(contrato.vigencia_fim + "T12:00:00");
      const dias = Math.round(
        (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (valor >= 500_000 && dias > 0 && dias < 30) pontos += 2;
      if (valor >= 200_000 && dias > 0 && dias < 60) pontos += 2;
    } catch {
      // skip
    }
  }

  // ──────────────────────────────────────────────────────────
  // 11. VÍNCULO SOCIETÁRIO / GRUPO ECONÔMICO (+2)
  //    A empresa divide sócios com outra(s) fornecedora(s) da
  //    prefeitura/câmara. Sinal, não prova: soma pontos mas não
  //    aciona a bolinha sozinho (o corte é >= 5).
  // ──────────────────────────────────────────────────────────
  if (emGrupoEconomico) pontos += 2;

  return pontos >= 5;
}

// ===== Fim da referência =====

/** Gerador pseudoaleatório com semente (mulberry32), para conjuntos reproduzíveis. */
function gerador(semente: number) {
  let a = semente >>> 0;
  const proximo = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  function escolher<T>(itens: readonly T[]): T {
    return itens[Math.floor(proximo() * itens.length)];
  }
  return { proximo, escolher };
}

const EMPRESAS = [
  "CONSTRUTORA ALFA LTDA",
  "Beta Serviços EIRELI",
  "GAMA COMERCIO DE MATERIAIS",
  "Delta Saúde S/A",
  "EPSILON TRANSPORTES",
  "Zeta Informática ME",
  "ETA ALIMENTOS",
  "TETA LIMPEZA URBANA",
  "IOTA ENGENHARIA",
  "Kappa Eventos",
  "LAMBDA COMBUSTIVEIS",
  "MI CONSULTORIA",
];

// Variações de grafia do mesmo nome: a normalização é trim + maiúsculas.
function variarNome(nome: string, r: ReturnType<typeof gerador>): string {
  const x = r.proximo();
  if (x < 0.15) return `  ${nome} `;
  if (x < 0.3) return nome.toLowerCase();
  if (x < 0.4) return nome.toUpperCase();
  return nome;
}

const OBJETOS = [
  null,
  "",
  "   ",
  "Serviços diversos",
  "Aquisição de materiais de expediente para a Secretaria de Educação do município",
  "Contratação emergencial de transporte escolar para a zona rural do município de Piracanjuba",
  "CONTRATAÇÃO EMERGENCIAL DE LIMPEZA URBANA EM CARÁTER DE URGÊNCIA APÓS CHUVAS INTENSAS",
  "Dispensa de licitação por emergência para reforma da Unidade Básica de Saúde central",
  "Locação de imóvel para funcionamento do Centro de Referência de Assistência Social",
  "Prestação de serviços de manutenção preventiva e corretiva da frota de veículos",
  "Fornecimento de merenda escolar para as escolas municipais durante o ano letivo de 2025",
  "Obra de pavimentação asfáltica e drenagem pluvial em vias urbanas do setor norte",
  "Situação emergencial: aquisição de medicamentos para a rede municipal de saúde pública",
  "Material de consumo",
];

// Objetos longos e específicos: não pontuam na regra 4 (vago) e isolam as outras regras.
const OBJETOS_ESPECIFICOS = [
  "Locação de imóvel para funcionamento do Centro de Referência de Assistência Social",
  "Fornecimento de merenda escolar para as escolas municipais durante o ano letivo de 2025",
  "Obra de pavimentação asfáltica e drenagem pluvial em vias urbanas do setor norte",
  "Manutenção corretiva dos equipamentos de ar condicionado do prédio da Secretaria de Saúde",
];
const OBJETOS_EMERGENCIAIS = [
  "Contratação emergencial de transporte escolar para a zona rural do município de Piracanjuba",
  "Dispensa de licitação por emergência para reforma da Unidade Básica de Saúde central",
];

const DATAS_ESTRANHAS = [
  null,
  "",
  "31/12/2024",
  "2024-13-45",
  "data inválida",
  "2024-01-01T00:00:00",
  "2024-02-29",
  "2023-08-31",
  "2024-12-25",
  "2025-12-21",
  "2025-11-15",
  "2026-03-31",
];

function dataAleatoria(r: ReturnType<typeof gerador>, anoInicio: number, anos: number): string {
  const dia = new Date(Date.UTC(anoInicio, 0, 1) + Math.floor(r.proximo() * anos * 365) * 86_400_000);
  return dia.toISOString().slice(0, 10);
}

function valorAleatorio(r: ReturnType<typeof gerador>, base: number): number | null {
  const x = r.proximo();
  if (x < 0.04) return null;
  if (x < 0.07) return 0;
  if (x < 0.08) return Number.NaN;
  if (x < 0.16) return Math.round((47_500 + r.proximo() * 2_500) * 100) / 100; // perto do limite de compras
  if (x < 0.22) return Math.round(95_000 + r.proximo() * 5_000); // perto do limite de obras
  if (x < 0.27) return 500_000 + Math.round(r.proximo() * 300_000);
  if (x < 0.62) return Math.round(base * (0.95 + r.proximo() * 0.1) * 100) / 100; // similares por fornecedor
  return Math.round(r.proximo() * 1_000_000) / 100;
}

const CNPJS = [
  "12.345.678/0001-90",
  "98765432000110",
  "11.111.111/0001-11",
  "22222222000122",
  "33.333.333/0001-33",
  "123", // tamanho errado: não entra no mapa
  null,
];

type Conjunto = {
  historico: ContratoBase[];
  aditivosInfo: AditivoInfo[];
  aditivosCompletos: ContratoAditivo[];
  lookup: AditivosLookup;
  cnpjs: Map<string, FornecedorCNPJ>;
  grupos: (boolean | undefined)[];
};

/** Data em dia útil, fora dos feriados nacionais e antes de 21/12 (não pontua na regra 6). */
function diaUtilAleatorio(r: ReturnType<typeof gerador>, anos: number): string {
  for (;;) {
    const data = dataAleatoria(r, 2023, anos);
    const dia = new Date(data + "T12:00:00");
    const mmdd = data.slice(5);
    const feriado = ["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "12-25"].includes(mmdd);
    if (dia.getDay() !== 0 && dia.getDay() !== 6 && !feriado && !(dia.getMonth() === 11 && dia.getDate() >= 21)) {
      return data;
    }
  }
}

/**
 * Conjunto "limpo": as regras de pontuação fixa ficam quase sempre zeradas (objeto específico,
 * dia útil, valor longe dos limites de dispensa, prazo longo), e a pontuação sai das regras que
 * dependem do histórico (2, 3 e 9), de aditivos, do CNPJ e do grupo econômico. Assim o corte
 * de 5 pontos depende de cada uma delas, e a comparação não fica mascarada pelas outras.
 */
function gerarConjuntoLimpo(semente: number, total: number, anos: number): Conjunto {
  const base = gerarConjunto(semente, total, anos);
  const r = gerador(semente * 7919);
  const baseDoFornecedor = new Map(EMPRESAS.map((e) => [e.toUpperCase(), 5_000 + r.proximo() * 35_000]));
  base.historico = base.historico.map((c) => {
    const nome = c.fornecedor?.trim().toUpperCase() || "";
    const valorBase = baseDoFornecedor.get(nome) ?? 20_000;
    const x = r.proximo();
    return {
      ...c,
      objeto: r.proximo() < 0.3 ? r.escolher(OBJETOS_EMERGENCIAIS) : r.escolher(OBJETOS_ESPECIFICOS),
      vigencia_inicio: x < 0.03 ? "data inválida" : x < 0.05 ? null : diaUtilAleatorio(r, anos),
      vigencia_fim: null,
      valor: r.proximo() < 0.6 ? Math.round(valorBase * (0.95 + r.proximo() * 0.1)) : 1_000 + Math.round(r.proximo() * 40_000),
    };
  });
  base.grupos = base.historico.map(() => r.proximo() < 0.5);
  return base;
}

function gerarConjunto(semente: number, total: number, anos: number): Conjunto {
  const r = gerador(semente);
  const baseDoFornecedor = new Map(EMPRESAS.map((e) => [e.toUpperCase(), 5_000 + r.proximo() * 200_000]));
  // Distribuição desigual: poucos fornecedores concentram muitos contratos (regra 3).
  const pesos = EMPRESAS.map((_, i) => 1 / (i + 1));
  const somaPesos = pesos.reduce((a, b) => a + b, 0);
  const sortearEmpresa = () => {
    let x = r.proximo() * somaPesos;
    for (let i = 0; i < EMPRESAS.length; i++) {
      x -= pesos[i];
      if (x <= 0) return EMPRESAS[i];
    }
    return EMPRESAS[EMPRESAS.length - 1];
  };

  const historico: ContratoBase[] = [];
  for (let i = 0; i < total; i++) {
    const x = r.proximo();
    const empresa = x < 0.05 ? null : x < 0.07 ? "" : x < 0.08 ? "   " : sortearEmpresa();
    const inicio = r.proximo() < 0.12 ? r.escolher(DATAS_ESTRANHAS) : dataAleatoria(r, 2023, anos);
    // Fim entre 0 e 400 dias depois do início (prazos curtos exercitam a regra 10).
    const instanteInicio = inicio ? new Date(inicio + "T12:00:00").getTime() : Number.NaN;
    const fim =
      r.proximo() < 0.1
        ? r.escolher(DATAS_ESTRANHAS)
        : Number.isNaN(instanteInicio)
          ? dataAleatoria(r, 2023, anos)
          : new Date(instanteInicio + Math.floor(r.proximo() * 400) * 86_400_000).toISOString().slice(0, 10);
    const base = empresa ? baseDoFornecedor.get(empresa.toUpperCase()) ?? 10_000 : 10_000;
    const origemId = 1000 + Math.floor(r.proximo() * 400);
    const bruto = {
      id: `c${semente}-${i}`,
      numero: r.proximo() < 0.05 ? null : `${1 + Math.floor(r.proximo() * 60)}/${2023 + Math.floor(r.proximo() * 3)}`,
      empresa: empresa === null ? null : variarNome(empresa, r),
      valor: valorAleatorio(r, base),
      objeto: r.escolher(OBJETOS),
      vigencia_inicio: inicio,
      vigencia_fim: fim,
      status: r.escolher(["Vigente", "Encerrado", null]),
      fonte_url:
        r.proximo() < 0.6
          ? `https://piracanjuba.centi.com.br/transparencia/contratos/contrato/${origemId}`
          : r.proximo() < 0.5
            ? "https://camarapiracanjuba.centi.com.br/transparencia/contratos"
            : null,
      centi_id: r.proximo() < 0.3 ? `ctr-${origemId}-2024` : null,
    };
    historico.push(normalizarPrefeitura(bruto));
  }

  // Aditivos: credores com CNPJ (inclusive dois CNPJs para o mesmo nome; o último vence).
  const aditivosCompletos: ContratoAditivo[] = [];
  const totalAditivos = Math.floor(total / 4);
  for (let i = 0; i < totalAditivos; i++) {
    const empresa = r.proximo() < 0.1 ? null : variarNome(r.escolher(EMPRESAS.slice(0, 9)), r);
    const contrato = r.proximo() < 0.7 && historico.length ? r.escolher(historico) : null;
    const origem = contrato?.fonte_url?.match(/contrato\/(\d+)/)?.[1] ?? null;
    aditivosCompletos.push({
      contrato_numero: contrato?.numero ?? `${1 + Math.floor(r.proximo() * 60)}/2024`,
      credor: empresa,
      valor: r.proximo() < 0.1 ? null : Math.round(r.proximo() * 300_000),
      cnpj: r.escolher(CNPJS),
      centi_id: origem,
      fonte_url: origem ? "https://piracanjuba.centi.com.br/transparencia/contratos/contratoaditivo/1" : null,
    });
  }
  const aditivosInfo: AditivoInfo[] = aditivosCompletos.map((a) => ({
    contrato_numero: a.contrato_numero ?? "",
    valor: a.valor,
    cnpj: a.cnpj ?? null,
    credor: a.credor,
  }));

  // Cadastro de CNPJ: empresa aberta pouco antes dos contratos, situação irregular etc.
  const cnpjs = new Map<string, FornecedorCNPJ>();
  for (const cnpj of CNPJS) {
    const digitos = cnpj?.replace(/\D/g, "");
    if (!digitos || digitos.length !== 14) continue;
    cnpjs.set(digitos, {
      cnpj: digitos,
      razao_social: null,
      data_abertura: r.proximo() < 0.2 ? null : dataAleatoria(r, 2022, anos + 1),
      situacao_cadastral: r.escolher(["ATIVA", "ativa", "BAIXADA", "INAPTA", null]),
      capital_social: null,
      cnae_descricao: null,
    });
  }

  const grupos = historico.map(() => (r.proximo() < 0.1 ? true : r.proximo() < 0.5 ? false : undefined));
  return { historico, aditivosInfo, aditivosCompletos, lookup: buildAditivosLookup(aditivosCompletos), cnpjs, grupos };
}

function compararConjunto(c: Conjunto, rotulo: string) {
  let suspeitos = 0;
  const variantes: [Map<string, FornecedorCNPJ> | undefined, AditivosLookup | undefined][] = [
    [c.cnpjs, c.lookup],
    [undefined, undefined],
    [c.cnpjs, undefined],
  ];
  for (const [cnpjs, lookup] of variantes) {
    c.historico.forEach((contrato, i) => {
      const esperado = calcularSuspeitaContratoReferencia(contrato, c.historico, c.aditivosInfo, cnpjs, lookup, c.grupos[i]);
      const obtido = calcularSuspeitaContrato(contrato, c.historico, c.aditivosInfo, cnpjs, lookup, c.grupos[i]);
      assert.equal(obtido, esperado, `${rotulo}: contrato ${contrato.id} (${JSON.stringify(contrato)})`);
      if (esperado) suspeitos++;
    });
  }
  return suspeitos;
}

test("a pontuação nova dá as mesmas saídas da anterior em conjuntos sintéticos", () => {
  let suspeitos = 0;
  let total = 0;
  const cenarios: [number, number, number][] = [
    // [semente, contratos, anos de espalhamento das datas]
    [1, 400, 1],
    [2, 400, 3],
    [3, 250, 0.5],
    [4, 600, 2],
    [5, 60, 1],
    [6, 1, 1],
  ];
  for (const [semente, contratos, anos] of cenarios) {
    const conjunto = gerarConjunto(semente, contratos, anos);
    suspeitos += compararConjunto(conjunto, `semente ${semente}`);
    total += conjunto.historico.length * 3;
  }
  // O conjunto precisa exercitar os dois lados do corte, senão a comparação não prova nada.
  assert.ok(suspeitos > 0 && suspeitos < total, `suspeitos ${suspeitos} de ${total}`);
});

test("nos conjuntos limpos, as regras do histórico decidem o corte e as saídas batem", () => {
  const cenarios: [number, number, number][] = [
    [11, 300, 1],
    [12, 500, 2],
    [13, 200, 0.5],
    [14, 700, 3],
  ];
  for (const [semente, contratos, anos] of cenarios) {
    const conjunto = gerarConjuntoLimpo(semente, contratos, anos);
    const suspeitos = compararConjunto(conjunto, `limpo ${semente}`);
    const total = conjunto.historico.length * 3;
    // Os dois lados do corte com peso real: senão uma regra errada passaria despercebida.
    assert.ok(suspeitos > total * 0.1 && suspeitos < total * 0.9, `limpo ${semente}: ${suspeitos} de ${total}`);
  }
});

test("histórico vazio e contrato fora do histórico", () => {
  const conjunto = gerarConjunto(7, 120, 1);
  const vazio: ContratoBase[] = [];
  for (const contrato of conjunto.historico.slice(0, 40)) {
    assert.equal(
      calcularSuspeitaContrato(contrato, vazio, conjunto.aditivosInfo, conjunto.cnpjs, conjunto.lookup, true),
      calcularSuspeitaContratoReferencia(contrato, vazio, conjunto.aditivosInfo, conjunto.cnpjs, conjunto.lookup, true)
    );
  }
  // Contrato que não está no histórico passado (ex.: comparado com outro órgão).
  const outro = gerarConjunto(8, 150, 1);
  for (const contrato of conjunto.historico.slice(0, 40)) {
    assert.equal(
      calcularSuspeitaContrato(contrato, outro.historico, conjunto.aditivosInfo, conjunto.cnpjs, conjunto.lookup),
      calcularSuspeitaContratoReferencia(contrato, outro.historico, conjunto.aditivosInfo, conjunto.cnpjs, conjunto.lookup)
    );
  }
});

test("regras de janela: emergenciais em 6 meses e valores similares em 12 meses, nas bordas", () => {
  const fornecedor = "FORNECEDOR DE BORDA";
  const objeto = "Contratação emergencial de serviços de saúde para atender a população do município";
  const datas = [
    "2025-03-01", "2025-04-30", "2025-05-31", "2025-06-15", "2025-07-01", "2025-08-31", "2025-09-01",
    "2024-09-01", "2024-08-31", "2024-02-29", "2025-02-28", "data inválida",
  ];
  const historico = datas.map((data, i) =>
    normalizarCamara({
      id: `b${i}`,
      numero: `${i}/2025`,
      credor: i % 2 ? fornecedor : ` ${fornecedor.toLowerCase()} `,
      valor: 30_000 + i * 500,
      objeto,
      vigencia_inicio: data,
      vigencia_fim: null,
      status: null,
    })
  );
  const aditivos: AditivoInfo[] = [];
  for (const contrato of historico) {
    assert.equal(
      calcularSuspeitaContrato(contrato, historico, aditivos),
      calcularSuspeitaContratoReferencia(contrato, historico, aditivos)
    );
  }
  // Com CNPJ resolvido pelos aditivos, a contagem passa a ser por CNPJ.
  const comCnpj: AditivoInfo[] = [{ contrato_numero: "1/2025", valor: 10, cnpj: "44.444.444/0001-44", credor: fornecedor }];
  for (const contrato of historico) {
    assert.equal(
      calcularSuspeitaContrato(contrato, historico, comCnpj),
      calcularSuspeitaContratoReferencia(contrato, historico, comCnpj)
    );
  }
});

test("bordas exatas: 6 meses da regra 2 e 12 meses da regra 9 entram na janela", () => {
  const contrato = (id: string, credor: string, data: string, valor: number, objeto: string) =>
    normalizarCamara({ id, numero: null, credor, valor, objeto, vigencia_inicio: data, vigencia_fim: null, status: null });
  const emergencial = "Contratação emergencial de transporte escolar para a zona rural do município de Piracanjuba";
  const comum = "Locação de imóvel para funcionamento do Centro de Referência de Assistência Social";

  // Regra 2: o contrato de 2025-09-03 tem 4 emergenciais dentro dos 6 meses e 1 exatamente em
  // 2025-03-03. Com a borda, são 6 (> 5): +3, que somados aos +2 do grupo econômico dão 5.
  const regra2 = (borda: string) => {
    const historico = [
      contrato("x", "EMPRESA X", "2025-09-03", 30_000, emergencial),
      contrato("b", "EMPRESA B", borda, 30_000, emergencial),
      ...["2025-04-02", "2025-05-07", "2025-06-04", "2025-07-02"].map((d, i) =>
        contrato(`e${i}`, `EMPRESA E${i}`, d, 30_000, emergencial)
      ),
    ];
    const args = [historico[0], historico, [] as AditivoInfo[], undefined, undefined, true] as const;
    return [calcularSuspeitaContratoReferencia(...args), calcularSuspeitaContrato(...args)];
  };
  assert.deepEqual(regra2("2025-03-03"), [true, true]);
  assert.deepEqual(regra2("2025-03-02"), [false, false]);

  // Regra 9: três contratos do mesmo CNPJ com valores próximos, o mais antigo exatamente um ano
  // antes. Com a borda: +2, que somados aos +3 da situação cadastral irregular dão 5.
  const fornecedor = "FORNECEDOR DA BORDA ANUAL";
  const aditivos: AditivoInfo[] = [{ contrato_numero: "1/2025", valor: 10, cnpj: "44.444.444/0001-44", credor: fornecedor }];
  const cadastro = new Map<string, FornecedorCNPJ>([
    ["44444444000144", { cnpj: "44444444000144", razao_social: null, data_abertura: null, situacao_cadastral: "BAIXADA", capital_social: null, cnae_descricao: null }],
  ]);
  const regra9 = (borda: string) => {
    const historico = [
      contrato("y", fornecedor, "2025-06-11", 30_000, comum),
      contrato("p", fornecedor, borda, 30_500, comum),
      contrato("q", fornecedor, "2025-01-15", 29_800, comum),
    ];
    const args = [historico[0], historico, aditivos, cadastro] as const;
    return [calcularSuspeitaContratoReferencia(...args), calcularSuspeitaContrato(...args)];
  };
  assert.deepEqual(regra9("2024-06-11"), [true, true]);
  assert.deepEqual(regra9("2024-06-10"), [false, false]);
});

test("o contexto memoizado acompanha histórico e aditivos que cresceram", () => {
  const conjunto = gerarConjunto(9, 200, 1);
  const historico = conjunto.historico.slice(0, 100);
  const aditivos = conjunto.aditivosInfo.slice();
  const comparar = () => {
    for (const c of historico) {
      assert.equal(
        calcularSuspeitaContrato(c, historico, aditivos, conjunto.cnpjs, conjunto.lookup),
        calcularSuspeitaContratoReferencia(c, historico, aditivos, conjunto.cnpjs, conjunto.lookup)
      );
    }
  };
  comparar();
  // Só o histórico cresce (mesmo array): o contexto tem de ser refeito.
  historico.push(...conjunto.historico.slice(100));
  comparar();
  // Só os aditivos crescem: um CNPJ novo muda a resolução de um fornecedor que já existia.
  aditivos.push({ contrato_numero: "9/2024", valor: 1, cnpj: "55555555000155", credor: EMPRESAS[0] });
  comparar();
});

test("medição de tempo da pontuação (só com MEDIR_SUSPEITA=1)", { skip: !process.env.MEDIR_SUSPEITA }, (t) => {
  for (const total of [2_000, 5_000]) {
    const conjunto = gerarConjunto(42, total, 3);
    const medir = (fn: typeof calcularSuspeitaContrato) => {
      const inicio = performance.now();
      let n = 0;
      // Arrays novos a cada rodada, como numa consulta nova do cliente (sem memo herdado).
      const historico = conjunto.historico.slice();
      const aditivos = conjunto.aditivosInfo.slice();
      historico.forEach((c, i) => {
        if (fn(c, historico, aditivos, conjunto.cnpjs, conjunto.lookup, conjunto.grupos[i])) n++;
      });
      return { ms: performance.now() - inicio, n };
    };
    const antes = medir(calcularSuspeitaContratoReferencia);
    const depois = medir(calcularSuspeitaContrato);
    assert.equal(depois.n, antes.n);
    t.diagnostic(
      `${total} contratos, ${conjunto.aditivosInfo.length} aditivos: antes ${antes.ms.toFixed(0)} ms, depois ${depois.ms.toFixed(1)} ms, ${antes.n} suspeitos`
    );
  }
});
