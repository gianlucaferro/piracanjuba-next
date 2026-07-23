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
export const CENTI_BASE_CAMARA = "https://acessoainformacao.piracanjuba.go.leg.br";
/**
 * Portal da PREFEITURA (poder executivo), migrado do Centi pro NucleoGov em 2026-07.
 * Mesma plataforma e mesmo contrato /api, so muda o host (leg.br -> gov.br).
 */
export const CENTI_BASE_PREFEITURA = "https://acessoainformacao.piracanjuba.go.gov.br";

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

  const resp = await fetch(`${base}/api`, {
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
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Centi /api HTTP ${resp.status}: ${text.slice(0, 200)}`);
  }

  return (await resp.json()) as CentiMultiResponse<T>;
}

/**
 * Atalho pra chamada simples (1 call, retorna direto o array dados).
 */
export async function centiList<T = unknown>(
  referer: string,
  acao: string,
  opts?: { extra?: Record<string, string>; offset?: number; pageSize?: number; base?: string },
): Promise<T[]> {
  const resp = await centiCall<T>(referer, [
    {
      acao,
      extra: opts?.extra,
      limit: {
        offset: opts?.offset ?? 0,
        pageSize: opts?.pageSize ?? 100,
      },
    },
  ], opts?.base ?? CENTI_BASE);

  const firstKey = Object.keys(resp)[0];
  if (!firstKey) return [];
  return resp[firstKey].dados ?? [];
}

/**
 * Faz paginacao automatica ate buscar todos os registros.
 */
export async function centiListAll<T = unknown>(
  referer: string,
  acao: string,
  opts?: { extra?: Record<string, string>; pageSize?: number; maxPages?: number; base?: string },
): Promise<T[]> {
  const pageSize = opts?.pageSize ?? 100;
  const maxPages = opts?.maxPages ?? 20;
  const out: T[] = [];

  for (let page = 0; page < maxPages; page++) {
    const batch = await centiList<T>(referer, acao, {
      extra: opts?.extra,
      offset: page * pageSize,
      pageSize,
      base: opts?.base,
    });
    if (batch.length === 0) break;
    out.push(...batch);
    if (batch.length < pageSize) break;
  }

  return out;
}
