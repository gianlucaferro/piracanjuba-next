export type ContratoAditivo = {
  contrato_numero: string | null;
  credor: string | null;
  valor: number | null;
  termo?: number | null;
  tipo_aditivo?: string | null;
  cnpj?: string | null;
  centi_id?: string | null;
  fonte_url?: string | null;
};

export type AditivosAgregados = {
  count: number;
  totalValor: number;
};

export type AditivosLookup = {
  byContratoOrigemId: Map<string, AditivosAgregados>;
  byCompositeKey: Map<string, AditivosAgregados>;
  byNumero: Map<string, AditivosAgregados[]>;
};

const CONTRATO_URL_REGEX = /\/contratos\/contrato\/(\d+)/i;
const ADITIVO_URL_REGEX = /\/contratos\/contratoaditivo\/(\d+)/i;
const HOST_REGEX = /^https?:\/\/([^/]+)/i;
// centi_id dos contratos da camara vem como "ctr-{idDoPortal}-{ano}".
const CENTI_ID_CTR_REGEX = /^ctr-(\d+)-/i;

/**
 * Portal (host) de origem do registro.
 *
 * Prefeitura (piracanjuba.centi.com.br) e Camara (camarapiracanjuba.centi.com.br)
 * tem sequencias de id INDEPENDENTES: o id 4697 existe nos dois e aponta pra
 * contratos diferentes. Sem escopo por portal, o aditivo de R$ 85.200 da Camara
 * (CONTABIL EXATA) grudava no contrato de R$ 3.204,54 da Prefeitura (nº 159).
 * Todas as chaves do lookup sao escopadas por este host.
 */
function portalScope(url: string | null | undefined): string {
  return url?.match(HOST_REGEX)?.[1]?.toLowerCase().replace(/^www\./, "") ?? "";
}

function scopedKey(scope: string, key: string): string {
  return `${scope}#${key}`;
}

/**
 * Normaliza o nome de um fornecedor/credor de forma agressiva para permitir
 * match mesmo com variações de grafia, sufixos jurídicos e caracteres especiais.
 */
export function normalizarCredor(nome: string | null | undefined): string {
  if (!nome) return "";

  let s = nome
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

  const sufixos = [
    "SOCIEDADE SIMPLES", "SOCIEDADE ANONIMA", "SOCIEDADE LIMITADA",
    "EIRELI-EPP", "EIRELI-ME", "EIRELI EPP", "EIRELI ME",
    "LTDA-EPP", "LTDA-ME", "LTDA EPP", "LTDA ME",
    "EIRELI", "LTDA", "S\\.A\\.", "S/A", "S\\.A",
    "EPP", "ME", "MEI", "CNPJ",
  ];
  const sufixoRegex = new RegExp(`\\b(${sufixos.join("|")})\\b\\.?`, "gi");
  s = s.replace(sufixoRegex, "");

  return s.replace(/[^A-Z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function makeKey(numero: string, credor: string | null | undefined): string {
  const credorNorm = normalizarCredor(credor);
  if (!credorNorm) return numero;
  return `${numero}::${credorNorm}`;
}

function mergeAgregado(atual: AditivosAgregados | undefined, valor: number | null | undefined): AditivosAgregados {
  return {
    count: (atual?.count || 0) + 1,
    totalValor: (atual?.totalValor || 0) + (valor || 0),
  };
}

/**
 * Id do contrato no portal.
 * Prefeitura: vem da propria URL (/contratos/contrato/{id}).
 * Camara: a fonte_url e generica (/contratos), mas o centi_id guarda o id do
 * portal no formato "ctr-{id}-{ano}" (validado: 162/162 batem com contrato_camara).
 */
function extractContratoOrigemId(
  fonteUrl: string | null | undefined,
  centiId?: string | null,
): string | null {
  const fromUrl = fonteUrl?.match(CONTRATO_URL_REGEX)?.[1];
  if (fromUrl) return fromUrl;

  const raw = centiId?.trim();
  if (!raw) return null;
  const fromCtr = raw.match(CENTI_ID_CTR_REGEX)?.[1];
  if (fromCtr) return fromCtr;
  return /^\d+$/.test(raw) ? raw : null;
}

/** No aditivo, o centi_id e o id do contrato-PAI no portal (sempre numerico). */
function extractContratoOrigemIdFromAditivo(aditivo: ContratoAditivo): string | null {
  const raw = aditivo.centi_id?.trim();
  if (raw && /^\d+$/.test(raw)) return raw;
  return aditivo.fonte_url?.match(ADITIVO_URL_REGEX)?.[1] ?? null;
}

/**
 * Estratégia definitiva:
 * 1) vínculo pelo ID real do contrato no portal (extraído da URL)
 * 2) fallback por chave composta número + credor normalizado
 * 3) fallback seguro por número apenas quando houver um único grupo possível
 */
export function buildAditivosLookup(aditivos: ContratoAditivo[]): AditivosLookup {
  const byContratoOrigemId = new Map<string, AditivosAgregados>();
  const byCompositeKey = new Map<string, AditivosAgregados>();
  const byNumeroBuckets = new Map<string, Map<string, AditivosAgregados>>();

  for (const aditivo of aditivos) {
    const numero = (aditivo.contrato_numero || "").trim();
    if (!numero) continue;

    const scope = portalScope(aditivo.fonte_url);

    const compositeKey = scopedKey(scope, makeKey(numero, aditivo.credor));
    const nextComposite = mergeAgregado(byCompositeKey.get(compositeKey), aditivo.valor);
    byCompositeKey.set(compositeKey, nextComposite);

    const origemId = extractContratoOrigemIdFromAditivo(aditivo);
    if (origemId) {
      const idKey = scopedKey(scope, origemId);
      byContratoOrigemId.set(idKey, mergeAgregado(byContratoOrigemId.get(idKey), aditivo.valor));
    }

    const numeroKey = scopedKey(scope, numero);
    const numeroBucket = byNumeroBuckets.get(numeroKey) || new Map<string, AditivosAgregados>();
    numeroBucket.set(compositeKey, nextComposite);
    byNumeroBuckets.set(numeroKey, numeroBucket);
  }

  const byNumero = new Map<string, AditivosAgregados[]>();
  for (const [numero, bucket] of byNumeroBuckets) {
    byNumero.set(numero, Array.from(bucket.values()));
  }

  return {
    byContratoOrigemId,
    byCompositeKey,
    byNumero,
  };
}

export function getAditivosDoContrato(
  lookup: AditivosLookup,
  numero: string | null,
  credor: string | null | undefined,
  fonteUrl?: string | null,
  centiId?: string | null,
) {
  const numeroKey = (numero || "").trim();
  if (!numeroKey) return null;

  // Escopo por portal: um id so vale dentro do portal que o emitiu.
  const scope = portalScope(fonteUrl);

  const origemId = extractContratoOrigemId(fonteUrl, centiId);
  if (origemId) {
    // Vínculo AUTORITATIVO: o id do portal identifica o contrato com exatidão.
    // Sem fallback: se não há aditivo com esse id, o contrato não tem aditivo.
    // (Os fallbacks por número/credor colavam aditivos de contratos homônimos
    // de outros anos: ex. Neoconsig 158/2026 exibia o aditivo do J C DIAS 158.)
    return lookup.byContratoOrigemId.get(scopedKey(scope, origemId)) ?? null;
  }

  // Fallbacks heurísticos: apenas para contratos antigos sem id de portal na fonte.
  const matchByComposite = lookup.byCompositeKey.get(scopedKey(scope, makeKey(numeroKey, credor)));
  if (matchByComposite) return matchByComposite;

  const sameNumero = lookup.byNumero.get(scopedKey(scope, numeroKey)) || [];
  if (sameNumero.length === 1) return sameNumero[0];

  return null;
}
