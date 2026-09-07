/// <reference lib="deno.ns" />
export type HealthBucket = "mortalidade" | "hiv_casos";
export interface SourceReceipt {
  resource_id: string;
  source_total: number;
  fetched: number;
  complete: true;
}
export interface HealthSnapshotRow {
  categoria: string;
  indicador: string;
  ano: number;
  mes?: number | null;
  semana_epidemiologica?: number | null;
  valor: number;
  valor_texto?: string | null;
  fonte: string;
  fonte_url: string;
}
const CKAN_BASE = "https://dadosabertos.go.gov.br/api/3/action/datastore_search";
const PAGE_SIZE = 100;
const SOURCE_LIMIT = 20_000;

export function healthError(error: unknown): string {
  return error instanceof Error ? error.message : "falha de sincronização";
}

export function strictHealthNumber(value: unknown, field: string, integer = false): number {
  if (typeof value !== "number" && (typeof value !== "string" || !/^\d+(?:[.,]\d+)?$/.test(value.trim()))) {
    throw new Error(`Campo ${field} ausente ou inválido`);
  }
  const number = typeof value === "number" ? value : Number(value.trim().replace(",", "."));
  if (!Number.isFinite(number) || number < 0 || (integer && !Number.isInteger(number))) throw new Error(`Campo ${field} inválido`);
  return number;
}

export function strictHealthYear(value: unknown): number {
  const year = strictHealthNumber(value, "ano", true);
  if (year < 1900 || year > new Date().getUTCFullYear()) throw new Error("Ano de saúde fora do intervalo válido");
  return year;
}

export function healthDateYear(value: unknown): number {
  if (typeof value !== "string") throw new Error("Data de saúde ausente");
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) throw new Error("Data de saúde inválida");
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  const date = new Date(`${iso}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== iso) throw new Error("Data de saúde impossível");
  return strictHealthYear(Number(match[3]));
}

export async function readHealthSource<T extends Record<string, unknown>>(
  resourceId: string,
  filterField: string,
  filterValue: string,
  fetcher: typeof fetch = fetch,
  deadline = Date.now() + 90_000,
): Promise<{ records: T[]; receipt: SourceReceipt }> {
  const records: T[] = [];
  const ids = new Set<string>();
  let total: number | null = null;
  for (let offset = 0;; offset += PAGE_SIZE) {
    if (Date.now() >= deadline) throw new Error("Prazo de leitura CKAN excedido, dados anteriores preservados");
    const url = new URL(CKAN_BASE);
    url.search = new URLSearchParams({
      resource_id: resourceId, filters: JSON.stringify({ [filterField]: filterValue }),
      limit: String(PAGE_SIZE), offset: String(offset), sort: "_id asc",
    }).toString();
    const response = await fetcher(url, { signal: AbortSignal.timeout(Math.min(15_000, Math.max(1, deadline - Date.now()))) });
    if (!response.ok) throw new Error(`Fonte CKAN HTTP ${response.status}`);
    const json = await response.json();
    if (json?.success !== true || !json.result || !Array.isArray(json.result.records)
      || json.result.total_was_estimated === true || !Number.isInteger(json.result.total) || json.result.total < 0 || json.result.total > SOURCE_LIMIT) {
      throw new Error("Resposta CKAN inválida ou acima do limite de cobertura");
    }
    if (total !== null && total !== json.result.total) throw new Error("Total CKAN mudou durante a paginação");
    total = json.result.total;
    if (json.result.records.length > PAGE_SIZE) throw new Error("Página CKAN excede o limite solicitado");
    for (const record of json.result.records) {
      if (!record || typeof record !== "object" || Array.isArray(record)
        || (typeof record._id !== "number" && typeof record._id !== "string")
        || String(record[filterField]).trim().toUpperCase() !== filterValue.trim().toUpperCase()) {
        throw new Error("Registro CKAN sem identidade ou fora do município solicitado");
      }
      const id = String(record._id);
      if (!id || ids.has(id)) throw new Error("Registro CKAN repetido entre páginas");
      ids.add(id);
      records.push(record as T);
    }
    if (records.length > total!) throw new Error("Quantidade CKAN excede o total informado");
    if (records.length === total) break;
    if (json.result.records.length < PAGE_SIZE) throw new Error("Página CKAN incompleta antes do total declarado");
  }
  return { records, receipt: { resource_id: resourceId, source_total: total!, fetched: records.length, complete: true } };
}

export function normalizeHealthSnapshot(bucket: HealthBucket, rows: HealthSnapshotRow[]) {
  if (!Array.isArray(rows) || !rows.length || rows.length > 5000) throw new Error("Snapshot de saúde vazio ou excessivo");
  const keys = new Set<string>();
  return rows.map(row => {
    if (!row || typeof row !== "object") throw new Error("Indicador de saúde inválido");
    const categoria = row.categoria;
    if (bucket === "mortalidade" ? !["mortalidade_geral", "mortalidade_infantil"].includes(categoria) : categoria !== "hiv") throw new Error("Categoria fora do coletor autorizado");
    const ano = strictHealthYear(row.ano);
    const valor = strictHealthNumber(row.valor, "valor");
    const mes = row.mes == null || row.mes === 0 ? null : strictHealthNumber(row.mes, "dimensão", true);
    const semana = row.semana_epidemiologica == null || row.semana_epidemiologica === 0 ? null : strictHealthNumber(row.semana_epidemiologica, "semana", true);
    if ((mes !== null && mes > 99) || semana !== null) throw new Error("Dimensões do snapshot de saúde inválidas");
    const key = JSON.stringify([categoria, row.indicador, ano, mes ?? 0, semana ?? 0]);
    if (keys.has(key)) throw new Error("Indicadores com identidade repetida, snapshot recusado");
    keys.add(key);
    return { categoria, indicador: row.indicador, ano, mes, semana_epidemiologica: semana, valor, valor_texto: row.valor_texto ?? null, fonte: row.fonte, fonte_url: row.fonte_url };
  });
}

export async function startHealthSnapshot(sb: any, functionName: string): Promise<string> {
  const result = await sb.from("sync_log").insert({ tipo: functionName, status: "running", detalhes: { mode: "snapshot_atomico" } }).select("id").single();
  if (result.error || !result.data?.id) throw new Error("Não foi possível registrar início da sincronização");
  return result.data.id;
}

export async function saveHealthSnapshot(sb: any, bucket: HealthBucket, logId: string, rows: HealthSnapshotRow[], receipts: SourceReceipt[]) {
  const normalized = normalizeHealthSnapshot(bucket, rows);
  const result = await sb.rpc("replace_saude_snapshot", { p_bucket: bucket, p_log_id: logId, p_rows: normalized, p_sources: receipts });
  if (result.error) {
    const detail = result.error.code === "P0001" && typeof result.error.message === "string" ? `: ${result.error.message.slice(0, 300)}` : "";
    throw new Error(`Snapshot não confirmado (${result.error.code ?? "erro RPC"})${detail}; verificar log transacional`);
  }
  const data = result.data;
  if (!data || data.status !== "success" || data.total !== normalized.length || !Number.isInteger(data.inserted)
    || !Number.isInteger(data.updated) || !Number.isInteger(data.unchanged) || !Number.isInteger(data.removed)
    || !Number.isInteger(data.preserved_missing) || data.preserved_missing < 0
    || data.inserted + data.updated + data.unchanged !== normalized.length) {
    throw new Error("RPC não confirmou integralmente o snapshot de saúde");
  }
  return data;
}

export async function failHealthSnapshot(sb: any, logId: string | null, error: unknown) {
  if (!logId) return;
  // Uma resposta HTTP perdida após commit não deve sobrescrever o sucesso
  // que a própria transação já registrou de forma atômica.
  const result = await sb.from("sync_log").update({ status: "error", detalhes: { error: healthError(error), mode: "snapshot_atomico" }, finished_at: new Date().toISOString() }).eq("id", logId).eq("status", "running");
  if (result.error) console.error("Falha ao registrar término da sincronização de saúde");
}
