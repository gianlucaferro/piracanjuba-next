export type CsvValue = string | number | null | undefined;
export type CsvDelimiter = ";" | ",";

function hasFormulaPrefix(value: string): boolean {
  for (const char of value) {
    const code = char.codePointAt(0)!;
    if (code <= 0x1f || code === 0x7f || /[\s\u200B-\u200F\u202A-\u202E\u2060-\u206F]/u.test(char)) continue;
    return /[=+@\-\uFF1D\uFF0B\uFF0D\uFF20]/u.test(char);
  }
  return false;
}

export function serializeCSV(headers: readonly string[], rows: readonly (readonly CsvValue[])[], delimiter: CsvDelimiter = ";"): string {
  const cell = (value: CsvValue): string => {
    if (value == null) return "";
    if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
    // Aspas CSV não impedem execução de fórmulas por planilhas. O apóstrofo
    // força texto e preserva o conteúdo original, inclusive espaços e quebras.
    const protectedValue = hasFormulaPrefix(value) ? `'${value}` : value;
    return protectedValue.includes(delimiter) || /["\r\n]/.test(protectedValue) || protectedValue !== value
      ? `"${protectedValue.replace(/"/g, '""')}"`
      : protectedValue;
  };
  return [headers, ...rows].map((row) => row.map(cell).join(delimiter)).join("\r\n");
}

export function downloadCSV(filename: string, headers: string[], rows: CsvValue[][], delimiter: CsvDelimiter = ";") {
  const csv = serializeCSV(headers, rows, delimiter);

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
