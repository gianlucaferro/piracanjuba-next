/// <reference lib="deno.ns" />

export type FolhaCompetencia = {
  ano: number;
  mes: number;
  competencia: string;
};

// Uma competencia explicita nunca expande a importacao para outros meses.
export function folhaCompetencias(
  year: number,
  month: number,
  explicit: boolean,
): FolhaCompetencia[] {
  if (
    !Number.isInteger(year) || year < 2000 ||
    !Number.isInteger(month) || month < 1 || month > 12
  ) {
    throw new Error("Competencia de folha invalida");
  }
  return Array.from({ length: explicit ? 1 : 4 }, (_, offset) => {
    const date = new Date(Date.UTC(year, month - 1 - offset, 1));
    const ano = date.getUTCFullYear();
    const mes = date.getUTCMonth() + 1;
    return { ano, mes, competencia: `${ano}-${String(mes).padStart(2, "0")}` };
  });
}

// O cliente das edges nao depende do schema gerado da aplicacao web.
// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

// Folhas antigas podem atualizar valores, mas nao rebaixar o cadastro atual.
// Consultamos todos os resultados em paginas, inclusive em reprocessamentos
// manuais antigos que podem encontrar varios anos de remuneracoes posteriores.
export async function preserveServidorUpdates<
  T extends Record<string, unknown>,
>(
  supabase: SupabaseClient,
  rows: T[],
  competencia: string,
): Promise<T[]> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia)) {
    throw new Error("Competencia de protecao cadastral invalida");
  }
  const candidates = new Map<string, T>();
  for (const row of rows) {
    if (typeof row.origem_chave !== "string" || !row.origem_chave) {
      throw new Error("Cadastro de folha sem origem_chave");
    }
    candidates.set(row.origem_chave, row);
  }
  const origins = [...candidates.keys()];
  const protectedOrigins = new Set<string>();
  const batchSize = 100;
  for (let offset = 0; offset < origins.length; offset += batchSize) {
    const requested = origins.slice(offset, offset + batchSize);
    const { data, error } = await supabase.from("servidores")
      .select("id,origem_chave")
      .in("origem_chave", requested);
    if (error) throw new Error(`Protecao cadastral: ${error.message}`);
    const byId = new Map<string, string>();
    for (const stored of data ?? []) {
      if (
        typeof stored.id !== "string" ||
        !candidates.has(stored.origem_chave)
      ) {
        throw new Error("Protecao cadastral: identidade armazenada invalida");
      }
      byId.set(stored.id, stored.origem_chave);
    }
    if (byId.size === 0) continue;
    const pageSize = 500;
    for (let page = 0;; page++) {
      const { data: newer, error: newerError } = await supabase
        .from("remuneracao_servidores")
        .select("id,servidor_id")
        .in("servidor_id", [...byId.keys()])
        .gt("competencia", competencia)
        .order("id", { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (newerError) {
        throw new Error(`Protecao cadastral/historico: ${newerError.message}`);
      }
      for (const remuneration of newer ?? []) {
        const origin = byId.get(remuneration.servidor_id);
        if (!origin) {
          throw new Error(
            "Protecao cadastral: remuneracao sem vinculo esperado",
          );
        }
        protectedOrigins.add(origin);
      }
      if ((newer ?? []).length < pageSize) break;
    }
  }
  return [...candidates].filter(([origin]) => !protectedOrigins.has(origin))
    .map(([, row]) => row);
}
