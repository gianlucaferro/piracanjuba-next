import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validateBusDepartures, mergeBusDepartures } from "../src/data/busScheduleValidation.ts";

const defaultTarget = fileURLToPath(new URL("../src/data/horariosOnibus-registros.json", import.meta.url));

export function importBusSchedules({ input, target = defaultTarget, apply = false, allowRemovals = false, now = new Date() }) {
  const result = validateBusDepartures(JSON.parse(readFileSync(input, "utf8")), now);
  if (result.errors.length) {
    throw new Error(result.errors.join("\n"));
  }
  const current = JSON.parse(readFileSync(target, "utf8"));
  const departures = allowRemovals ? result.departures : mergeBusDepartures(current, result.departures);
  const combined = validateBusDepartures(departures, now);
  if (combined.errors.length) throw new Error(combined.errors.join("\n"));
  const ids = new Set(departures.map((item) => item.id));
  const removed = current.filter((item) => !ids.has(item.id));
  if (apply) {
    const temporary = `${target}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(departures, null, 2)}\n`);
    renameSync(temporary, target);
  }
  return { imported: result.departures.length, total: departures.length, removed: removed.map((item) => item.id), applied: apply };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const input = process.argv[2];
  const apply = process.argv.includes("--apply");
  const allowRemovals = process.argv.includes("--allow-removals");
  if (!input || input.startsWith("--") || process.argv.some((arg, index) => index > 2 && !["--apply", "--allow-removals"].includes(arg))) {
    console.error("Uso: node scripts/import-bus-schedules.mjs arquivo.json [--apply] [--allow-removals]");
    process.exitCode = 1;
  } else try {
    const result = importBusSchedules({ input, apply, allowRemovals });
    console.log(`${result.imported} viagens importadas, ${result.total} no arquivo final. ${result.removed.length} registros existentes removidos${apply ? "" : " na simulação"}.`);
    if (result.removed.length) console.log(`Remoções autorizadas por --allow-removals: ${result.removed.join(", ")}`);
    else console.log("Histórico preservado. Registros com o mesmo ID são atualizados.");
    if (apply) console.log("Arquivo local atualizado. Revise o diff e execute os testes antes de publicar.");
    else console.log("Validação concluída sem alterar arquivos. Use --apply após revisar as fontes e as diferenças.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Arquivo inválido.");
    process.exitCode = 1;
  }
}
