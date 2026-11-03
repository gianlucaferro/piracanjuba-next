export interface ChatSource {
  title: string;
  url: string;
  period: string | null;
  coverage: string;
}

export function safeSourceUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}

/** Fontes são construídas a partir das consultas, nunca da resposta do modelo. */
export function normalizeChatSources(sources: ChatSource[], limit = 16): ChatSource[] {
  const unique = new Map<string, ChatSource>();
  for (const source of sources) {
    const url = safeSourceUrl(source.url);
    if (!url || !source.title.trim() || !source.coverage.trim()) continue;
    const period = source.period?.trim().slice(0, 120) || null;
    const key = `${url}|${period ?? ""}`;
    if (!unique.has(key)) unique.set(key, { title: source.title.trim().slice(0, 160), url, period, coverage: source.coverage.trim().slice(0, 240) });
    if (unique.size >= limit) break;
  }
  return [...unique.values()];
}

export function recordPeriods(rows: Record<string, unknown>[], fields: string[]): string | null {
  const periods = new Set<string>();
  for (const row of rows) for (const field of fields) {
    const value = String(row[field] ?? "");
    if (/^(?:19|20)\d{2}(?:-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?)?$/.test(value)) periods.add(value);
  }
  const values = [...periods].sort();
  if (!values.length) return null;
  return values.length === 1 ? values[0] : `${values[0]} a ${values.at(-1)} (referências dos registros)`;
}

/** O evento precede os tokens do modelo sem modificar o conteúdo do provider. */
export function streamWithSources(body: ReadableStream<Uint8Array> | null, sources: ChatSource[]): ReadableStream<Uint8Array> {
  const reader = body?.getReader();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(`event: sources\ndata: ${JSON.stringify({ type: "sources", sources: normalizeChatSources(sources) })}\n\n`));
      if (!reader) controller.close();
    },
    async pull(controller) {
      if (!reader) return;
      try {
        const { done, value } = await reader.read();
        if (done) { controller.close(); reader.releaseLock(); }
        else controller.enqueue(value);
      } catch (error) { controller.error(error); reader.releaseLock(); }
    },
    async cancel(reason) { if (reader) await reader.cancel(reason); },
  });
}
