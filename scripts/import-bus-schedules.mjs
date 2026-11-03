import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validateBusDepartures } from "../src/data/busScheduleValidation.ts";

const input = process.argv[2];
const apply = process.argv.includes("--apply");
if (!input || process.argv.some((arg, index) => index > 2 && arg !== "--apply")) {
  console.error("Uso: node scripts/import-bus-schedules.mjs arquivo.json [--apply]");
  process.exit(1);
}
try {
  const result = validateBusDepartures(JSON.parse(readFileSync(input, "utf8")));
  if (result.errors.length) {
    console.error(result.errors.join("\n"));
    process.exit(1);
  }
  const target = fileURLToPath(new URL("../src/data/horariosOnibus-registros.json", import.meta.url));
  const current = JSON.parse(readFileSync(target, "utf8"));
  const ids = new Set(result.departures.map((item) => item.id));
  const removed = current.filter((item) => !ids.has(item.id));
  console.log(`${result.departures.length} viagens válidas. ${removed.length} registros existentes seriam removidos.`);
  if (removed.length) console.log(`Revisar remoções: ${removed.map((item) => item.id).join(", ")}`);
  if (apply) {
    const temporary = `${target}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(result.departures, null, 2)}\n`);
    renameSync(temporary, target);
    console.log("Arquivo local atualizado. Revise o diff e execute os testes antes de publicar.");
  } else console.log("Validação concluída sem alterar arquivos. Use --apply após revisar as fontes e as diferenças.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Arquivo inválido.");
  process.exit(1);
}
