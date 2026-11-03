export interface ChatSource {
  title: string;
  url: string;
  period: string | null;
  coverage: string;
}

export function parseChatSources(raw: unknown): ChatSource[] {
  if (!Array.isArray(raw)) return [];
  const result: ChatSource[] = [];
  const seen = new Set<string>();
  for (const item of raw.slice(0, 16)) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (typeof row.title !== "string" || typeof row.url !== "string" || typeof row.coverage !== "string") continue;
    if (!row.title.trim() || row.url.length > 2048 || !row.coverage.trim()) continue;
    try {
      const url = new URL(row.url);
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) continue;
      const period = typeof row.period === "string" ? row.period.slice(0, 120) : null;
      const key = `${url.href}|${period}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ title: row.title.slice(0, 160), url: url.href, period, coverage: row.coverage.slice(0, 240) });
    } catch { continue; }
  }
  return result;
}

export function createChatStreamParser(handlers: {
  onDelta(text: string): void;
  onSources(sources: ChatSource[]): void;
}) {
  let buffer = "";
  const consume = (line: string) => {
    if (!line.startsWith("data:")) return;
    const text = line.slice(5).trim();
    if (!text || text === "[DONE]") return;
    try {
      const value = JSON.parse(text);
      if (value.type === "sources") handlers.onSources(parseChatSources(value.sources));
      else if (typeof value.choices?.[0]?.delta?.content === "string") handlers.onDelta(value.choices[0].delta.content);
    } catch { /* Eventos inválidos não são renderizados. */ }
  };
  return {
    push(chunk: string) {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) consume(line);
    },
    finish() { if (buffer) consume(buffer); buffer = ""; },
  };
}
