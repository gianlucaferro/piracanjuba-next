// Cliente compartilhado pra chamar o endpoint /api do portal LAI Centi/NucleoGov
// da Camara Municipal de Piracanjuba. Validado em 2026-05-15 (Caminho J).
//
// O WAF aceita POST direto desde que tenha:
//   - User-Agent de browser
//   - Content-Type: application/x-www-form-urlencoded
//   - X-Requested-With: XMLHttpRequest
//   - Origin + Referer corretos (cada acao tem um referer especifico)
//
// Padrao do body:
//   multi_request=true&params={"<chave>":{"acao":"<acao>","limit":"<offset>, <size>", ...}}

/** Portal da CAMARA (poder legislativo). Base historica, default por compatibilidade. */
export const CENTI_BASE_CAMARA =
  "https://acessoainformacao.piracanjuba.go.leg.br";
/**
 * Portal da PREFEITURA (poder executivo), migrado do Centi pro NucleoGov em 2026-07.
 * Mesma plataforma e mesmo contrato /api, so muda o host (leg.br -> gov.br).
 */
export const CENTI_BASE_PREFEITURA =
  "https://acessoainformacao.piracanjuba.go.gov.br";

const CENTI_BASE = CENTI_BASE_CAMARA;

export type CentiCall = {
  /** acao Centi, ex: "atos_administrativos/listar" */
  acao: string;
  /** parametros extras enviados junto, ex: { mp_id: "16" } */
  extra?: Record<string, string>;
  /** paginacao: offset, page_size */
  limit?: { offset: number; pageSize: number };
};

export type CentiMultiResponse<T = unknown> = Record<
  string,
  { dados: T[]; total: string | number }
>;

export type CentiPageResult<T = unknown> = {
  dados: T[];
  total: number | null;
};

export type CentiListResult<T = unknown> = {
  dados: T[];
  total: number | null;
  pagesFetched: number;
  complete: boolean;
  maxPagesReached: boolean;
};

type CentiRequestOptions = {
  timeoutMs?: number;
  maxResponseBytes?: number;
};

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_RESPONSE_BYTES = 16_000_000;
const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
const DEFAULT_RETRY_DELAYS_MS = [500, 1_500];

function retryDelayMs(resp: Response | null, fallbackMs: number): number {
  const retryAfter = resp?.headers.get("retry-after");
  if (!retryAfter) return fallbackMs;
  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1_000, 10_000);
  }
  return fallbackMs;
}

async function fetchWithTransientRetry(
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= DEFAULT_RETRY_DELAYS_MS.length; attempt++) {
    let resp: Response | null = null;
    try {
      resp = await fetch(input, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (
        !RETRYABLE_STATUS.has(resp.status) ||
        attempt === DEFAULT_RETRY_DELAYS_MS.length
      ) {
        return resp;
      }
      await resp.body?.cancel().catch(() => undefined);
    } catch (error) {
      lastError = error;
      if (attempt === DEFAULT_RETRY_DELAYS_MS.length) throw error;
    }

    const delay = retryDelayMs(resp, DEFAULT_RETRY_DELAYS_MS[attempt]);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Centi request failed after retries");
}

function parseTotal(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number"
    ? value
    : Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

async function readBoundedText(
  resp: Response,
  maxResponseBytes: number,
): Promise<string> {
  const declaredLength = Number(resp.headers.get("content-length") ?? "0");
  if (declaredLength > maxResponseBytes) {
    throw new Error(
      `Centi response too large: ${declaredLength} bytes, limit ${maxResponseBytes}`,
    );
  }

  if (!resp.body) {
    throw new Error("Centi returned an empty response body");
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let receivedBytes = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    receivedBytes += value.byteLength;
    if (receivedBytes > maxResponseBytes) {
      await reader.cancel().catch(() => undefined);
      throw new Error(`Centi response exceeded ${maxResponseBytes} bytes`);
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();

  return text;
}

async function readBoundedJson<T>(
  resp: Response,
  maxResponseBytes: number,
): Promise<T> {
  const text = await readBoundedText(resp, maxResponseBytes);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Centi returned invalid JSON: ${text.slice(0, 200)}`);
  }
}

/**
 * Chama /api do Centi com referer pre-validado.
 *
 * @param referer URL da pagina Centi de onde a chamada "originaria" se browser real fizesse
 * @param calls array de chamadas (a maioria dos endpoints aceita multi_request)
 */
export async function centiCall<T = unknown>(
  referer: string,
  calls: CentiCall[],
  base: string = CENTI_BASE,
  requestOptions?: CentiRequestOptions,
): Promise<CentiMultiResponse<T>> {
  const params: Record<string, Record<string, string>> = {};

  calls.forEach((c, i) => {
    const key = `${i}-${Math.random().toString(36).slice(2, 8)}`;
    const obj: Record<string, string> = { acao: c.acao };
    if (c.limit) {
      obj.limit = `${c.limit.offset}, ${c.limit.pageSize}`;
    }
    if (c.extra) {
      Object.assign(obj, c.extra);
    }
    params[key] = obj;
  });

  const body = new URLSearchParams({
    multi_request: "true",
    params: JSON.stringify(params),
  });

  const resp = await fetchWithTransientRetry(
    `${base}/api`,
    {
      method: "POST",
      headers: {
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.5,en;q=0.4",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Origin": base,
        "Referer": referer.startsWith("http") ? referer : `${base}${referer}`,
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: body.toString(),
    },
    requestOptions?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  if (!resp.ok) {
    const text = await readBoundedText(
      resp,
      requestOptions?.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES,
    ).catch((error) =>
      error instanceof Error ? `[erro ao ler resposta: ${error.message}]` : ""
    );
    throw new Error(`Centi /api HTTP ${resp.status}: ${text.slice(0, 200)}`);
  }

  return await readBoundedJson<CentiMultiResponse<T>>(
    resp,
    requestOptions?.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES,
  );
}

export async function centiListPage<T = unknown>(
  referer: string,
  acao: string,
  opts?: {
    extra?: Record<string, string>;
    offset?: number;
    pageSize?: number;
    base?: string;
    timeoutMs?: number;
    maxResponseBytes?: number;
  },
): Promise<CentiPageResult<T>> {
  const resp = await centiCall<T>(
    referer,
    [{
      acao,
      extra: opts?.extra,
      limit: {
        offset: opts?.offset ?? 0,
        pageSize: opts?.pageSize ?? 100,
      },
    }],
    opts?.base ?? CENTI_BASE,
    {
      timeoutMs: opts?.timeoutMs,
      maxResponseBytes: opts?.maxResponseBytes,
    },
  );

  const firstKey = Object.keys(resp)[0];
  if (!firstKey) return { dados: [], total: null };
  const first = resp[firstKey];
  return {
    dados: Array.isArray(first?.dados) ? first.dados : [],
    total: parseTotal(first?.total),
  };
}

/**
 * Atalho pra chamada simples (1 call, retorna direto o array dados).
 */
export async function centiList<T = unknown>(
  referer: string,
  acao: string,
  opts?: {
    extra?: Record<string, string>;
    offset?: number;
    pageSize?: number;
    base?: string;
  },
): Promise<T[]> {
  const page = await centiListPage<T>(referer, acao, opts);
  return page.dados;
}

/**
 * Faz paginacao automatica ate buscar todos os registros.
 */
export async function centiListAll<T = unknown>(
  referer: string,
  acao: string,
  opts?: {
    extra?: Record<string, string>;
    pageSize?: number;
    maxPages?: number;
    base?: string;
  },
): Promise<T[]> {
  const result = await centiListAllWithMeta<T>(referer, acao, opts);
  return result.dados;
}

export async function centiListAllWithMeta<T = unknown>(
  referer: string,
  acao: string,
  opts?: {
    extra?: Record<string, string>;
    pageSize?: number;
    maxPages?: number;
    base?: string;
    timeoutMs?: number;
    maxResponseBytes?: number;
  },
): Promise<CentiListResult<T>> {
  const pageSize = opts?.pageSize ?? 100;
  const maxPages = opts?.maxPages ?? 20;
  const out: T[] = [];
  let total: number | null = null;
  let pagesFetched = 0;
  let reachedNaturalEnd = false;

  for (let page = 0; page < maxPages; page++) {
    const result = await centiListPage<T>(referer, acao, {
      extra: opts?.extra,
      offset: page * pageSize,
      pageSize,
      base: opts?.base,
      timeoutMs: opts?.timeoutMs,
      maxResponseBytes: opts?.maxResponseBytes,
    });
    pagesFetched++;
    if (total === null) total = result.total;
    if (result.dados.length === 0) {
      reachedNaturalEnd = true;
      break;
    }
    out.push(...result.dados);
    if (total !== null && out.length >= total) {
      reachedNaturalEnd = true;
      break;
    }
    if (result.dados.length < pageSize) {
      reachedNaturalEnd = true;
      break;
    }
  }

  const maxPagesReached = !reachedNaturalEnd && pagesFetched >= maxPages;
  const complete = total !== null
    ? out.length >= total
    : reachedNaturalEnd && !maxPagesReached;

  return {
    dados: total !== null ? out.slice(0, total) : out,
    total,
    pagesFetched,
    complete,
    maxPagesReached,
  };
}

export async function centiListUnpaginated<T = unknown>(
  referer: string,
  acao: string,
  opts?: {
    extra?: Record<string, string>;
    base?: string;
    timeoutMs?: number;
    maxResponseBytes?: number;
  },
): Promise<CentiPageResult<T>> {
  const resp = await centiCall<T>(
    referer,
    [{ acao, extra: opts?.extra }],
    opts?.base ?? CENTI_BASE,
    {
      timeoutMs: opts?.timeoutMs,
      maxResponseBytes: opts?.maxResponseBytes,
    },
  );
  const firstKey = Object.keys(resp)[0];
  if (!firstKey) return { dados: [], total: null };
  const first = resp[firstKey];
  return {
    dados: Array.isArray(first?.dados) ? first.dados : [],
    total: parseTotal(first?.total),
  };
}

export async function centiFinanceList<T = unknown>(
  referer: string,
  action: string,
  params: Record<string, string>,
  opts?: {
    base?: string;
    timeoutMs?: number;
    maxResponseBytes?: number;
  },
): Promise<T[]> {
  const base = opts?.base ?? CENTI_BASE;
  const body = new URLSearchParams({ acao: action, ...params });
  const resp = await fetchWithTransientRetry(
    `${base}/api/centi`,
    {
      method: "POST",
      headers: {
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.5,en;q=0.4",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Origin": base,
        "Referer": referer.startsWith("http") ? referer : `${base}${referer}`,
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: body.toString(),
    },
    opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  if (!resp.ok) {
    const text = await readBoundedText(
      resp,
      opts?.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES,
    ).catch((error) =>
      error instanceof Error ? `[erro ao ler resposta: ${error.message}]` : ""
    );
    throw new Error(
      `Centi /api/centi HTTP ${resp.status}: ${text.slice(0, 200)}`,
    );
  }

  const data = await readBoundedJson<unknown>(
    resp,
    opts?.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES,
  );
  if (!Array.isArray(data)) {
    throw new Error("Centi /api/centi returned a non-array response");
  }
  return data as T[];
}
