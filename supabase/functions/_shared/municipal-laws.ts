import { CENTI_BASE_PREFEITURA, centiListPage } from "./centi-client.ts";

// Link "Legislação" da homepage oficial, verificado em 2026-09-07.
export const PREFEITURA_LEIS_URL =
  `${CENTI_BASE_PREFEITURA}/cidadao/legislacao/leis_cnt`;
export const CAMARA_LEIS_URL =
  "https://camarapiracanjuba.centi.com.br/transparencia/atosadministrativos/5";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export type MunicipalLaw = {
  numero: string;
  ementa: string;
  data_publicacao: string | null;
  fonte_url: string;
  orgao: string;
};

export type LawSourceResult = {
  source: "prefeitura" | "camara";
  url: string;
  laws: MunicipalLaw[];
  total: number;
  fetched: number;
  rejected: number;
  pages: number;
};

export function decodeLawText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/<[^>]*>/g, " ")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (match, code: string) => {
      const point = code[0].toLowerCase() === "x"
        ? parseInt(code.slice(1), 16)
        : parseInt(code, 10);
      return point >= 0 && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : match;
    })
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"').replace(/&apos;/gi, "'")
    .replace(/\s+/g, " ").trim();
}

export function lawNumber(value: unknown): string | null {
  const number = decodeLawText(value).replace(
    /^LEI\s+(?:MUNICIPAL\s+)?(?:N[ºo°.]*\s*)?/i,
    "",
  );
  const match = number.match(
    /^(\d+|\d{1,3}(?:\.\d{3})+)(?:\s*\/\s*)((?:19|20)\d{2})$/,
  );
  return match ? `${match[1]}/${match[2]}` : null;
}

// Não alterar a grafia de números existentes no banco. A chave só faz a junção.
export function lawIdentity(value: unknown): string | null {
  const number = lawNumber(value);
  if (!number) return null;
  const [digits, year] = number.split("/");
  return `${digits.replace(/\./g, "").replace(/^0+(?=\d)/, "")}/${year}`;
}

export function lawDate(value: unknown): string | null {
  const text = decodeLawText(value);
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  const br = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const result = iso
    ? `${iso[1]}-${iso[2]}-${iso[3]}`
    : br
    ? `${br[3]}-${br[2]}-${br[1]}`
    : null;
  if (!result) return null;
  const timestamp = Date.parse(`${result}T00:00:00Z`);
  return Number.isFinite(timestamp) &&
      new Date(timestamp).toISOString().slice(0, 10) === result
    ? result
    : null;
}

function officialDocumentUrl(value: unknown, base: string): string | null {
  const text = decodeLawText(value);
  if (!text) return null;
  try {
    const url = new URL(text, base);
    const allowed = new Set([new URL(base).hostname, "api.centi.com.br"]);
    if (
      url.protocol !== "https:" || !allowed.has(url.hostname) || url.username ||
      url.password
    ) return null;
    // O domínio da API também atende outros municípios.
    if (
      url.hostname === "api.centi.com.br" &&
      !url.pathname.startsWith("/portal/v2/documento/go/piracanjuba/download/")
    ) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function normalizePrefeituraLaw(value: unknown): MunicipalLaw | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const numero = lawNumber(row.numero);
  const ementa = decodeLawText(row.ementa);
  const data_publicacao = lawDate(row.data_publicacao);
  if (!numero || !ementa || !data_publicacao || String(row.tipo_id) !== "5") {
    return null;
  }
  let fonte_url = officialDocumentUrl(row.url, PREFEITURA_LEIS_URL);
  if (!fonte_url) {
    const key = decodeLawText(row.chave);
    if (!key) return null;
    const [year, month] = data_publicacao.split("-");
    fonte_url = `${CENTI_BASE_PREFEITURA}/legislacao/lei_cnt/id=${
      encodeURIComponent(key)
    }__${year}__${month}__5`;
  }
  return {
    numero,
    ementa,
    data_publicacao,
    fonte_url,
    orgao: "Prefeitura Municipal",
  };
}

export function parseCamaraLawPage(html: string, pageUrl: string): {
  laws: MunicipalLaw[];
  total: number;
  fetched: number;
  rejected: number;
} {
  const totalMatch = html.match(/data-result=["'](\d+)["']/i);
  const tbody = html.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i);
  if (!totalMatch || !tbody) {
    throw new Error("Câmara: resposta sem tabela ou total de leis");
  }
  const rows = [...tbody[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((
    match,
  ) => match[1]).filter((row) => /<td\b/i.test(row));
  const laws: MunicipalLaw[] = [];
  for (const row of rows) {
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((
      match,
    ) => decodeLawText(match[1]));
    // Parte do acervo histórico inverte descrição e observação. Só inverter
    // quando uma célula inteira for um número de lei, nunca a partir de menções.
    const numberIndex = lawNumber(cells[0]) ? 0 : lawNumber(cells[1]) ? 1 : -1;
    const numero = numberIndex < 0 ? null : lawNumber(cells[numberIndex]);
    const ementa = cells[numberIndex === 1 ? 0 : 1] ?? "";
    const data_publicacao = lawDate(cells[2]);
    if (!numero || !ementa || !data_publicacao) continue;
    const link = row.match(/href=["']([^"']*\/download\/[^"']*)["']/i)?.[1];
    laws.push({
      numero,
      ementa,
      data_publicacao,
      fonte_url: officialDocumentUrl(link, CAMARA_LEIS_URL) ?? pageUrl,
      orgao: "Câmara Municipal",
    });
  }
  return {
    laws,
    total: Number(totalMatch[1]),
    fetched: rows.length,
    rejected: rows.length - laws.length,
  };
}

type PublicPage = { rows: unknown[]; total: number | null };
type ApiPageLoader = (offset: number, pageSize: number) => Promise<PublicPage>;

export async function fetchPrefeituraLaws(
  loadPage?: ApiPageLoader,
): Promise<LawSourceResult> {
  const loader: ApiPageLoader = loadPage ?? (async (offset, pageSize) => {
    const page = await centiListPage(PREFEITURA_LEIS_URL, "atos_cnt/listar", {
      extra: { modulo: "lei", tipo: "5" },
      offset,
      pageSize,
      base: CENTI_BASE_PREFEITURA,
      timeoutMs: 20_000,
    });
    return { rows: page.dados, total: page.total };
  });
  const result: LawSourceResult = {
    source: "prefeitura",
    url: PREFEITURA_LEIS_URL,
    laws: [],
    total: 0,
    fetched: 0,
    rejected: 0,
    pages: 0,
  };
  const signatures = new Set<string>();
  for (let page = 0; page < 40; page++) {
    const response = await loader(result.fetched, 500);
    if (response.total === null || response.total <= 0) {
      throw new Error("Prefeitura: total de leis ausente ou vazio");
    }
    if (page > 0 && response.total !== result.total) {
      throw new Error("Prefeitura: total mudou durante paginação");
    }
    result.total = response.total;
    const signature = JSON.stringify(response.rows);
    if (!response.rows.length || signatures.has(signature)) {
      throw new Error("Prefeitura: paginação vazia ou repetida antes do total");
    }
    signatures.add(signature);
    const normalized = response.rows.map(normalizePrefeituraLaw);
    result.laws.push(
      ...normalized.filter((row): row is MunicipalLaw => row !== null),
    );
    result.rejected += normalized.filter((row) => row === null).length;
    result.fetched += response.rows.length;
    result.pages++;
    if (result.fetched === result.total) return result;
    if (result.fetched > result.total) {
      throw new Error("Prefeitura: quantidade recebida excede o total");
    }
  }
  throw new Error("Prefeitura: limite de páginas atingido sem concluir");
}

export async function fetchCamaraLaws(
  fetcher: typeof fetch = fetch,
): Promise<LawSourceResult> {
  const result: LawSourceResult = {
    source: "camara",
    url: CAMARA_LEIS_URL,
    laws: [],
    total: 0,
    fetched: 0,
    rejected: 0,
    pages: 0,
  };
  const signatures = new Set<string>();
  for (let page = 1; page <= 40; page++) {
    const url = new URL(CAMARA_LEIS_URL);
    // Os links de paginação oficiais usam ?id=5. A rota /5 repete a página 1.
    url.pathname = url.pathname.replace(/\/5$/, "");
    url.search = new URLSearchParams({
      pagina: String(page),
      id: "5",
      itensporpagina: "1000",
      orderby: "DataPublicacao desc, Id desc",
    }).toString();
    const response = await fetcher(url.href, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      throw new Error(`Câmara: HTTP ${response.status} na página ${page}`);
    }
    const parsed = parseCamaraLawPage(await response.text(), url.href);
    if (parsed.total <= 0) throw new Error("Câmara: catálogo de leis vazio");
    if (page > 1 && parsed.total !== result.total) {
      throw new Error("Câmara: total mudou durante paginação");
    }
    const signature = JSON.stringify(parsed.laws);
    if (!parsed.fetched || signatures.has(signature)) {
      throw new Error("Câmara: paginação vazia ou repetida antes do total");
    }
    signatures.add(signature);
    result.total = parsed.total;
    result.laws.push(...parsed.laws);
    result.fetched += parsed.fetched;
    result.rejected += parsed.rejected;
    result.pages++;
    if (result.fetched === result.total) return result;
    if (result.fetched > result.total) {
      throw new Error("Câmara: quantidade recebida excede o total");
    }
  }
  throw new Error("Câmara: limite de páginas atingido sem concluir");
}

export async function collectMunicipalLaws(
  prefeitura = fetchPrefeituraLaws,
  camara = fetchCamaraLaws,
): Promise<{ sources: LawSourceResult[]; errors: string[] }> {
  const responses = await Promise.allSettled([prefeitura(), camara()]);
  const sources: LawSourceResult[] = [];
  const errors: string[] = [];
  responses.forEach((response, index) => {
    if (response.status === "fulfilled") sources.push(response.value);
    else {errors.push(
        `${index === 0 ? "Prefeitura" : "Câmara"}: ${
          response.reason instanceof Error
            ? response.reason.message
            : String(response.reason)
        }`,
      );}
  });
  return { sources, errors };
}

export function isRetiredWordPressUrl(value: string | null): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.hostname === "piracanjuba.go.gov.br" &&
      url.pathname.startsWith("/leis-municipais/");
  } catch {
    return false;
  }
}

/** Exclui identidades com documentos incompatíveis, inclusive entre as fontes. */
export function selectMunicipalLaws(sources: Pick<LawSourceResult, "laws">[]): {
  laws: Map<string, MunicipalLaw>;
  conflicts: string[];
} {
  const laws = new Map<string, MunicipalLaw>();
  const conflicts = new Set<string>();
  const textKey = (text: string) =>
    text.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  for (const source of sources) {
    for (const law of source.laws) {
      const key = lawIdentity(law.numero);
      if (!key || conflicts.has(key)) continue;
      const previous = laws.get(key);
      if (previous) {
        const previousText = textKey(previous.ementa);
        const currentText = textKey(law.ementa);
        const sameText = previousText === currentText;
        // A API atual trunca parte das ementas históricas. Prefixos suficientemente
        // específicos identificam o mesmo texto sem fundir títulos genéricos.
        const truncation =
          Math.min(previousText.length, currentText.length) >= 40 &&
          (previousText.startsWith(currentText) ||
            currentText.startsWith(previousText));
        if (
          (!sameText && !truncation) ||
          previous.data_publicacao !== law.data_publicacao
        ) {
          laws.delete(key);
          conflicts.add(key);
        }
      } else {
        laws.set(key, law);
      }
    }
  }
  return { laws, conflicts: [...conflicts].sort() };
}
