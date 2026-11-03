"use client";

import { useState } from "react";
import { BusFront, Download, FileCheck2, Upload } from "lucide-react";
import { BUS_CHECKED_AT, BUS_DEPARTURES, BUS_REVIEW_INTERVAL_DAYS, getBrazilDate, getBusCoverage } from "@/data/horariosOnibus";
import { validateBusDepartures } from "@/data/busScheduleValidation";

export function OnibusAdmin() {
  const [draft, setDraft] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [validated, setValidated] = useState<string | null>(null);
  const dates = getBusCoverage("").dates;

  function edit(value: string) {
    setDraft(value);
    setValidated(null);
    setErrors([]);
  }

  function validate() {
    try {
      const result = validateBusDepartures(JSON.parse(draft));
      setErrors(result.errors);
      setValidated(result.errors.length ? null : JSON.stringify(result.departures, null, 2));
    } catch {
      setValidated(null);
      setErrors(["Não foi possível ler o JSON. Confira aspas, vírgulas e colchetes."]);
    }
  }

  function download() {
    if (!validated) return;
    const href = URL.createObjectURL(new Blob([`${validated}\n`], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `horarios-onibus-${getBrazilDate(new Date())}.json`;
    anchor.click();
    URL.revokeObjectURL(href);
  }

  return (
    <section className="space-y-5 rounded-xl border border-border bg-card p-5">
      <div className="space-y-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><BusFront className="h-5 w-5 text-primary" aria-hidden="true" /> Manutenção dos horários de ônibus</h2>
        <p className="text-sm text-muted-foreground">Prepare e confira o arquivo de horários antes da revisão e publicação. Cada registro vale apenas para a data da viagem e precisa de uma fonte que informe a saída em Piracanjuba.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Última conferência registrada</p><p className="mt-1 font-semibold">{BUS_CHECKED_AT || "Nenhuma"}</p></div>
        <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Viagens no arquivo publicado</p><p className="mt-1 font-semibold">{BUS_DEPARTURES.length}</p></div>
        <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Regra de revisão</p><p className="mt-1 text-sm">Conferir até {BUS_REVIEW_INTERVAL_DAYS} dias antes da partida</p></div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => edit(JSON.stringify(BUS_DEPARTURES, null, 2))} className="min-h-10 rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted">Carregar arquivo publicado</button>
        <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted">
          <Upload className="h-4 w-4" aria-hidden="true" /> Abrir arquivo JSON
          <input type="file" accept="application/json,.json" className="sr-only" aria-label="Abrir arquivo de horários" onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (file.size > 5_000_000) { setErrors(["O arquivo deve ter no máximo 5 MB."]); setValidated(null); return; }
            try { edit(await file.text()); } catch { setErrors(["Não foi possível abrir o arquivo."]); setValidated(null); }
            event.target.value = "";
          }} />
        </label>
        <span className="text-xs text-muted-foreground">Datas existentes: {dates.join(", ") || "nenhuma"}</span>
      </div>
      <div className="space-y-2">
        <label htmlFor="bus-admin-json" className="block text-sm font-medium">Arquivo de viagens</label>
        <textarea id="bus-admin-json" value={draft} onChange={(event) => edit(event.target.value)} rows={14} spellCheck={false} className="w-full rounded-lg border border-input bg-background p-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Abra o arquivo publicado ou um JSON preparado com horários documentados." />
        <p className="text-xs leading-relaxed text-muted-foreground">Mantenha os registros históricos. Mudanças de horário ou cancelamentos exigem substituir os registros afetados, não duplicá-los. Não replique uma consulta para outros dias nem use a saída da origem da linha como horário de passagem local.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={!draft.trim()} onClick={validate} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"><FileCheck2 className="h-4 w-4" aria-hidden="true" /> Validar arquivo</button>
        <button type="button" disabled={!validated} onClick={download} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold disabled:opacity-50"><Download className="h-4 w-4" aria-hidden="true" /> Baixar arquivo validado</button>
      </div>
      <div aria-live="polite">
        {errors.length > 0 && <div className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive"><p className="font-semibold">Corrija antes de publicar:</p><ul className="mt-2 list-disc space-y-1 pl-5">{errors.slice(0, 30).map((error, index) => <li key={`${index}-${error}`}>{error}</li>)}</ul>{errors.length > 30 && <p className="mt-2">Mais {errors.length - 30} problemas no arquivo.</p>}</div>}
        {validated && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-900 dark:bg-green-950/30 dark:text-green-100">Estrutura validada. Confira a fonte de cada viagem e encaminhe o arquivo para revisão e publicação. O download ainda não altera o site.</p>}
      </div>
    </section>
  );
}
