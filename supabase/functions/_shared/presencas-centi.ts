export const PRESENCAS_CENTI_URL =
  "https://camarapiracanjuba.centi.com.br/transparencia/atosadministrativos/10";
export const PRESENCAS_UA = "piracanjuba.ai/1.0 (transparencia legislativa)";
export const NOMES_PRESENCAS = [
  ["Fernando Abraão Magalhães Silva", "Fernando Silva"],
  ["Douglas Miranda Silva", "Douglas Miranda"],
  ["Reginaldo Moreira da Silva", "Reginaldo Silva"],
  ["Aparecida Divani Rocha Cordeiro", "Aparecida Cordeiro"],
  ["Adriana Dias Pinheiro", "Adriana Dias"],
  ["Edimar Lopes Machado", "Edimar Lopes"],
  ["Marco Antonio Antunes da Cruz", "Marco Antônio"],
  ["Sirley de Fatima Menezes Wehbe", "Sirley de Fatima"],
  ["Welton Eterno da Silva", "Welton da Silva"],
  ["Wennder Trindade e Silva", "Wennder Trindade"],
  ["Yuri Santiago Alves", "Yuri Santiago"],
] as const;
export type VereadorPresenca = {
  id: string;
  nome: string;
  nomeCompleto: string;
};
export type ListaPresenca = {
  titulo: string;
  data: string;
  tipo: "ordinária";
  pdfUrl: string;
};
export type PresencaExistente = {
  id: string;
  sessao_titulo: string;
  sessao_data: string | null;
  vereador_nome: string;
  vereador_id: string | null;
  fonte_url: string | null;
  status_verificacao: string | null;
};
function normal(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(
    /\s+/g,
    " ",
  ).trim().toUpperCase();
}
export function decodePresencasHtml(value: string): string {
  return value.replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code: string) => {
    const n = code[0].toLowerCase() === "x"
      ? parseInt(code.slice(1), 16)
      : Number(code);
    if (!Number.isInteger(n) || n < 0 || n > 0x10ffff) {
      throw new Error("Entidade HTML inválida");
    }
    return String.fromCodePoint(n);
  }).replace(/&quot;/gi, '"').replace(/&apos;/gi, "'").replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&");
}
export function urlPresenca(value: string): string {
  const url = new URL(decodePresencasHtml(value), PRESENCAS_CENTI_URL);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "camarapiracanjuba.centi.com.br" ||
    !url.pathname.startsWith("/download/") || url.hash || url.username ||
    url.password
  ) {
    throw new Error("URL do PDF fora da fonte oficial de presenças");
  }
  return url.href;
}
function dataIso(value: string): string {
  const m = value.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  const iso = m ? `${m[3]}-${m[2]}-${m[1]}` : "";
  const date = new Date(`${iso}T12:00:00Z`);
  if (
    !iso || Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== iso
  ) {
    throw new Error("Lista de presença sem data válida");
  }
  return iso;
}
export function parseListasPresenca(html: string): ListaPresenca[] {
  const tbody = html.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i);
  if (!tbody) throw new Error("Tabela de listas de presença não encontrada");
  const out: ListaPresenca[] = [];
  const seen = new Set<string>();
  for (const match of tbody[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const row = match[1];
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
      decodePresencasHtml(m[1].replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ")
        .trim()
    );
    if (!cells.length) continue;
    const titulo = cells[0];
    if (
      !/LISTA\s+(?:DE\s+)?PRESEN[ÇC]A/i.test(titulo) ||
      !/\bORDIN[ÁA]RIA\b/i.test(titulo) || /EXTRAORDIN/i.test(titulo)
    ) {
      throw new Error("Documento encontrado não é lista de presença ordinária");
    }
    const links = [...row.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map((m) =>
      m[1]
    ).filter((href) => /\/download\//i.test(href));
    if (links.length !== 1) throw new Error(`Lista sem PDF único: ${titulo}`);
    const pdfUrl = urlPresenca(links[0]);
    const data = dataIso(
      cells.find((c) => /\b\d{2}\/\d{2}\/\d{4}\b/.test(c)) || "",
    );
    if (Number(data.slice(0, 4)) < 2025 || Number(data.slice(0, 4)) > 2028) {
      throw new Error("Lista fora da legislatura configurada");
    }
    if (seen.has(pdfUrl)) {
      throw new Error("PDF repetido na mesma página de presenças");
    }
    seen.add(pdfUrl);
    out.push({ titulo, data, tipo: "ordinária", pdfUrl });
  }
  if (!out.length) {
    throw new Error(
      "Página oficial não publicou listas de presença reconhecíveis",
    );
  }
  return out;
}
export function resolverVereadoresPresenca(
  db: { id: string; nome: string }[],
): VereadorPresenca[] {
  const out = NOMES_PRESENCAS.map(([nomeCompleto, parlamentar]) => {
    const matches = db.filter((v) =>
      normal(v.nome) === normal(parlamentar) ||
      normal(v.nome) === normal(nomeCompleto)
    );
    if (matches.length !== 1) {
      throw new Error(`Vereador sem correspondência única: ${parlamentar}`);
    }
    return { ...matches[0], nomeCompleto };
  });
  if (new Set(out.map((v) => v.id)).size !== out.length) {
    throw new Error("Identidade de vereador repetida");
  }
  return out;
}
export function parseResultadoPresencas(
  content: string,
  lista: ListaPresenca,
  vereadores: VereadorPresenca[],
) {
  let data: unknown;
  try {
    data = JSON.parse(
      content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""),
    );
  } catch {
    throw new Error(
      "IA de presenças retornou JSON inválido; nenhuma presença presumida",
    );
  }
  if (
    !data || typeof data !== "object" || !("sessao_data" in data) ||
    data.sessao_data !== lista.data ||
    !("presencas" in data) || !Array.isArray(data.presencas) ||
    data.presencas.length !== vereadores.length
  ) {
    throw new Error(
      "IA sem data da sessão compatível ou sem lista completa de vereadores",
    );
  }
  const seen = new Set<string>();
  return data.presencas.map((row: unknown) => {
    if (
      !row || typeof row !== "object" || !("nome" in row) ||
      typeof row.nome !== "string" ||
      !("presente" in row) || typeof row.presente !== "boolean"
    ) throw new Error("Presença incerta ou inválida, revisão necessária");
    const nome = normal(row.nome);
    const matches = vereadores.filter((v) =>
      normal(v.nomeCompleto) === nome || normal(v.nome) === nome
    );
    if (matches.length !== 1 || seen.has(matches[0].id)) {
      throw new Error("IA retornou vereador desconhecido ou repetido");
    }
    seen.add(matches[0].id);
    return {
      vereador_id: matches[0].id,
      vereador_nome: matches[0].nome,
      presente: row.presente,
    };
  });
}
export async function baixarPdfPresenca(
  url: string,
  fetcher: typeof fetch = fetch,
): Promise<Uint8Array> {
  const target = urlPresenca(url);
  const response = await fetcher(target, {
    headers: { "User-Agent": PRESENCAS_UA },
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new Error(`PDF HTTP ${response.status}`);
  const body = new Uint8Array(await response.arrayBuffer());
  if (
    body.length < 100 || body.length > 15_000_000 ||
    new TextDecoder().decode(body.subarray(0, 5)) !== "%PDF-"
  ) {
    throw new Error("Documento não é PDF válido ou excede 15 MB");
  }
  return body;
}
function mesmaSessao(lista: ListaPresenca, row: PresencaExistente) {
  return row.sessao_data === lista.data &&
    normal(decodePresencasHtml(row.sessao_titulo)) === normal(lista.titulo);
}
function mesmoVereador(row: PresencaExistente, vereador: VereadorPresenca) {
  return row.vereador_id === vereador.id ||
    normal(row.vereador_nome) === normal(vereador.nome) ||
    normal(row.vereador_nome) === normal(vereador.nomeCompleto);
}
export function sessaoJaVerificada(
  lista: ListaPresenca,
  existing: PresencaExistente[],
  vereadores: VereadorPresenca[],
) {
  return vereadores.every((vereador) =>
    existing.some((row) => {
      if (
        row.status_verificacao === "confirmado" && mesmaSessao(lista, row) &&
        mesmoVereador(row, vereador)
      ) {
        return row.vereador_id === null || row.vereador_id === vereador.id;
      }
      if (
        row.status_verificacao !== "ia" || row.sessao_data !== lista.data ||
        row.vereador_id !== vereador.id
      ) return false;
      try {
        return row.fonte_url !== null &&
          urlPresenca(row.fonte_url) === lista.pdfUrl;
      } catch {
        return false;
      }
    })
  );
}
export function selecionarLotePresencas(
  entries: ListaPresenca[],
  pendentes: ListaPresenca[],
  cursor: string | null,
  batchSize: number,
) {
  const index = cursor
    ? entries.findIndex((entry) => entry.pdfUrl === cursor)
    : -1;
  const ordered = [...entries.slice(index + 1), ...entries.slice(0, index + 1)];
  const pendingUrls = new Set(pendentes.map((entry) => entry.pdfUrl));
  return ordered.filter((entry) => pendingUrls.has(entry.pdfUrl)).slice(
    0,
    batchSize,
  );
}
export function protegerPresencasConfirmadas<
  T extends { vereador_id: string; vereador_nome: string },
>(
  lista: ListaPresenca,
  rows: T[],
  existing: PresencaExistente[],
  vereadores: VereadorPresenca[],
): (T & { id?: string; sessao_titulo?: string })[] {
  return rows.flatMap((row) => {
    const vereador = vereadores.find((v) => v.id === row.vereador_id);
    if (!vereador) {
      throw new Error("Destino de presença sem vereador reconhecido");
    }
    const matches = existing.filter((old) =>
      mesmaSessao(lista, old) && mesmoVereador(old, vereador)
    );
    if (
      matches.some((old) =>
        old.vereador_id !== null && old.vereador_id !== row.vereador_id
      )
    ) {
      throw new Error("Alias de vereador conflita com outro ID existente");
    }
    // Confirmação existente tem prioridade mesmo quando a fonte é antiga ou nula.
    if (matches.some((old) => old.status_verificacao === "confirmado")) {
      return [];
    }
    if (matches.length > 1) {
      throw new Error(
        `Mais de uma linha histórica para ${vereador.nome}; revisão necessária`,
      );
    }
    if (matches.length === 1) {
      const old = matches[0];
      return [{
        ...row,
        id: old.id,
        vereador_nome: old.vereador_nome,
        sessao_titulo: old.sessao_titulo,
      }];
    }
    if (
      existing.some((old) =>
        old.sessao_titulo === lista.titulo &&
        old.vereador_nome === row.vereador_nome &&
        old.sessao_data !== lista.data
      )
    ) {
      throw new Error(
        "Chave histórica de sessão conflita com outra data; nenhuma substituição permitida",
      );
    }
    return [row];
  });
}
export function parsePedidoPresencas(
  raw: string,
): { dryRun: boolean; batchSize: number } {
  const data = raw.trim() ? JSON.parse(raw) : {};
  if (
    !data || typeof data !== "object" || Array.isArray(data) ||
    (data.dryRun !== undefined && typeof data.dryRun !== "boolean")
  ) {
    throw new Error("Corpo inválido; dryRun deve ser booleano");
  }
  const batchSize = data.batch_size ?? 1;
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 10) {
    throw new Error("batch_size deve ser inteiro entre 1 e 10");
  }
  return { dryRun: data.dryRun === true, batchSize };
}
