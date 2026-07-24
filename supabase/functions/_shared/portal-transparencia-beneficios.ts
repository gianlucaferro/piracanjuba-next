/// <reference lib="deno.ns" />

export const PORTAL_TRANSPARENCIA_API_BASE =
  "https://api.portaldatransparencia.gov.br/api-de-dados";

export const PIRACANJUBA_IBGE = "5217104";

export type PortalBenefitProgramCode =
  | "bolsa_familia"
  | "bpc"
  | "garantia_safra"
  | "peti"
  | "seguro_defeso";

export interface PortalBenefitProgram {
  codigo: PortalBenefitProgramCode;
  endpoint: string;
  unidade: string;
  fonteSlug: string;
}

export const PORTAL_BENEFIT_PROGRAMS: readonly PortalBenefitProgram[] = [
  {
    codigo: "bolsa_familia",
    endpoint: "novo-bolsa-familia-por-municipio",
    unidade: "famílias",
    fonteSlug: "novo-bolsa-familia",
  },
  {
    codigo: "bpc",
    endpoint: "bpc-por-municipio",
    unidade: "beneficiários",
    fonteSlug: "bpc",
  },
  {
    codigo: "garantia_safra",
    endpoint: "safra-por-municipio",
    unidade: "agricultores",
    fonteSlug: "garantia-safra",
  },
  {
    codigo: "peti",
    endpoint: "peti-por-municipio",
    unidade: "crianças e adolescentes",
    fonteSlug: "peti",
  },
  {
    codigo: "seguro_defeso",
    endpoint: "seguro-defeso-por-municipio",
    unidade: "pescadores",
    fonteSlug: "seguro-defeso",
  },
] as const;

export interface PortalBenefitItem {
  valor: number;
  quantidadeBeneficiados: number;
  [key: string]: unknown;
}

export interface PortalBenefitFetchResult {
  status: "success" | "no_data";
  items: PortalBenefitItem[];
  pagesFetched: number;
  httpStatus: number;
}

export class PortalApiError extends Error {
  readonly endpoint: string;
  readonly status: number | null;

  constructor(message: string, endpoint: string, status: number | null = null) {
    super(message);
    this.name = "PortalApiError";
    this.endpoint = endpoint;
    this.status = status;
  }
}

function parseFiniteNumber(
  value: unknown,
  field: "valor" | "quantidadeBeneficiados",
  endpoint: string,
): number {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim() !== ""
    ? Number(value)
    : Number.NaN;

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new PortalApiError(
      `Resposta invalida de ${endpoint}: campo ${field} ausente ou invalido`,
      endpoint,
    );
  }

  return parsed;
}

export function validatePortalBenefitItems(
  payload: unknown,
  endpoint: string,
): PortalBenefitItem[] {
  if (!Array.isArray(payload)) {
    throw new PortalApiError(
      `Resposta invalida de ${endpoint}: era esperada uma lista`,
      endpoint,
    );
  }

  return payload.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new PortalApiError(
        `Resposta invalida de ${endpoint}: item ${index} nao e um objeto`,
        endpoint,
      );
    }

    const row = item as Record<string, unknown>;
    return {
      ...row,
      valor: parseFiniteNumber(row.valor, "valor", endpoint),
      quantidadeBeneficiados: parseFiniteNumber(
        row.quantidadeBeneficiados,
        "quantidadeBeneficiados",
        endpoint,
      ),
    };
  });
}

export function summarizePortalBenefitItems(items: PortalBenefitItem[]): {
  beneficiarios: number;
  valorPago: number;
} {
  return items.reduce(
    (summary, item) => ({
      beneficiarios: summary.beneficiarios + item.quantidadeBeneficiados,
      valorPago: summary.valorPago + item.valor,
    }),
    { beneficiarios: 0, valorPago: 0 },
  );
}

export async function fetchPortalBenefitData(
  program: PortalBenefitProgram,
  mesAno: string,
  apiKey: string,
  options: {
    fetchImpl?: typeof fetch;
    pageSize?: number;
    maxPages?: number;
  } = {},
): Promise<PortalBenefitFetchResult> {
  if (!/^\d{6}$/.test(mesAno)) {
    throw new PortalApiError(
      `Competencia invalida para ${program.endpoint}: ${mesAno}`,
      program.endpoint,
    );
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const pageSize = options.pageSize ?? 15;
  const maxPages = options.maxPages ?? 50;
  const items: PortalBenefitItem[] = [];

  for (let pagina = 1; pagina <= maxPages; pagina++) {
    const url = new URL(
      `${PORTAL_TRANSPARENCIA_API_BASE}/${program.endpoint}`,
    );
    url.searchParams.set("mesAno", mesAno);
    url.searchParams.set("codigoIbge", PIRACANJUBA_IBGE);
    url.searchParams.set("pagina", String(pagina));

    const response = await fetchImpl(url, {
      headers: {
        Accept: "application/json",
        "chave-api-dados": apiKey,
      },
    });

    if (response.status !== 200) {
      const body = (await response.text()).slice(0, 500);
      throw new PortalApiError(
        `Portal da Transparencia retornou HTTP ${response.status} em ${program.endpoint}${
          body ? `: ${body}` : ""
        }`,
        program.endpoint,
        response.status,
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new PortalApiError(
        `Resposta invalida de ${program.endpoint}: JSON malformado`,
        program.endpoint,
        response.status,
      );
    }

    const pageItems = validatePortalBenefitItems(payload, program.endpoint);
    if (pageItems.length === 0) {
      return {
        status: items.length === 0 ? "no_data" : "success",
        items,
        pagesFetched: pagina,
        httpStatus: response.status,
      };
    }

    items.push(...pageItems);
    if (pageItems.length < pageSize) {
      return {
        status: "success",
        items,
        pagesFetched: pagina,
        httpStatus: response.status,
      };
    }
  }

  throw new PortalApiError(
    `Paginacao de ${program.endpoint} excedeu ${maxPages} paginas`,
    program.endpoint,
  );
}

export async function sha256Json(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
