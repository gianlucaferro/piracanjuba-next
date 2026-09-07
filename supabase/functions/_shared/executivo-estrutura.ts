export const ESTRUTURA_API_URL =
  "https://piracanjuba.go.gov.br/wp-json/wp/v2/estrutura";

export interface SecretariaOficial {
  id: number;
  nome: string;
  gestor: string;
  fonte_url: string;
}

export interface SecretariaExistente {
  id: string;
  nome: string;
  secretario_nome: string | null;
  fonte_url: string | null;
}

function texto(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/<[^>]*>/g, "")
    .replace(/&#(?:x([0-9a-f]+)|(\d+));/gi, (_, hex, decimal) => {
      const code = parseInt(hex || decimal, hex ? 16 : 10);
      return code <= 0x10ffff ? String.fromCodePoint(code) : "";
    })
    .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/[\u200b-\u200d\u2060\ufeff]/g, "")
    .replace(/\s+/g, " ").trim();
}

function chave(nome: string): string {
  const normalized = texto(nome).normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toUpperCase()
    .replace(/[,.;]/g, " ").replace(/\s+/g, " ").trim();
  // Alias verificado entre a secretaria existente e o catálogo oficial.
  return normalized === "SECRETARIA DE AGRICULTURA (SAMARH)"
    ? "SECRETARIA DE AGRICULTURA"
    : normalized;
}

export function parseSecretariasOficiais(
  payload: unknown,
): SecretariaOficial[] {
  if (!Array.isArray(payload)) {
    throw new Error("Estrutura oficial não é uma lista");
  }
  const secretarias: SecretariaOficial[] = [];
  for (const item of payload) {
    if (!item || typeof item !== "object") {
      throw new Error("Registro inválido na estrutura oficial");
    }
    const nome = texto(item.title?.rendered);
    if (!/^secretaria\b/i.test(nome)) continue;
    const gestor = texto(item.acf?.gestor_nome);
    if (!Number.isInteger(item.id) || item.id <= 0 || !gestor) {
      throw new Error(
        `Secretaria oficial sem identificação ou gestor: ${nome}`,
      );
    }
    let fonte: URL;
    try {
      fonte = new URL(item.link);
    } catch {
      throw new Error(`Secretaria oficial sem link válido: ${nome}`);
    }
    if (
      fonte.origin !== "https://piracanjuba.go.gov.br" ||
      !fonte.pathname.startsWith("/estrutura/")
    ) {
      throw new Error(
        `Secretaria com fonte fora da estrutura oficial: ${nome}`,
      );
    }
    secretarias.push({ id: item.id, nome, gestor, fonte_url: fonte.href });
  }
  return secretarias;
}

export async function fetchSecretariasOficiais(
  fetcher: typeof fetch = fetch,
): Promise<SecretariaOficial[]> {
  const records: unknown[] = [];
  const ids = new Set<number>();
  let expectedPages = 0;
  let expectedTotal = 0;
  for (let page = 1; page <= (expectedPages || 1); page++) {
    const url = new URL(ESTRUTURA_API_URL);
    url.search = new URLSearchParams({
      per_page: "100",
      page: String(page),
      order: "asc",
      orderby: "menu_order",
    }).toString();
    const response = await fetcher(url, {
      headers: { "User-Agent": "piracanjuba.ai/1.0 (transparencia municipal)" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      throw new Error(`Estrutura oficial HTTP ${response.status}`);
    }
    const pages = Number(response.headers.get("x-wp-totalpages"));
    const total = Number(response.headers.get("x-wp-total"));
    if (
      !Number.isInteger(pages) || pages < 1 || pages > 20 ||
      !Number.isInteger(total) || total < 1
    ) {
      throw new Error("Paginação inválida na estrutura oficial");
    }
    if (page === 1) {
      expectedPages = pages;
      expectedTotal = total;
    } else if (pages !== expectedPages || total !== expectedTotal) {
      throw new Error("Estrutura oficial mudou durante a paginação");
    }
    const payload: unknown = await response.json();
    if (!Array.isArray(payload) || payload.length === 0) {
      throw new Error("Página vazia ou inválida na estrutura oficial");
    }
    for (const item of payload) {
      if (!item || !Number.isInteger(item.id) || ids.has(item.id)) {
        throw new Error(
          "Estrutura oficial com identificação inválida ou repetida",
        );
      }
      ids.add(item.id);
      records.push(item);
    }
  }
  if (records.length !== expectedTotal) {
    throw new Error("Coleta incompleta da estrutura oficial");
  }
  const result = parseSecretariasOficiais(records);
  if (result.length === 0) throw new Error("Estrutura oficial sem secretarias");
  return result;
}

export function planejarSecretarias(
  existentes: SecretariaExistente[],
  oficiais: SecretariaOficial[],
) {
  const updates: {
    id: string;
    patch: { secretario_nome: string; fonte_url: string };
  }[] = [];
  const errors: string[] = [];
  let matched = 0;
  for (const secretaria of existentes) {
    const key = chave(secretaria.nome);
    const candidates = oficiais.filter((item) => chave(item.nome) === key);
    const duplicates = existentes.filter((item) => chave(item.nome) === key);
    if (candidates.length !== 1 || duplicates.length !== 1) {
      errors.push(`Correspondência ausente ou ambígua: ${secretaria.nome}`);
      continue;
    }
    matched++;
    const source = candidates[0];
    if (
      secretaria.secretario_nome !== source.gestor ||
      secretaria.fonte_url !== source.fonte_url
    ) {
      updates.push({
        id: secretaria.id,
        patch: { secretario_nome: source.gestor, fonte_url: source.fonte_url },
      });
    }
  }
  if (matched === 0) throw new Error("Nenhuma secretaria pôde ser confirmada");
  return { updates, matched, unchanged: matched - updates.length, errors };
}
