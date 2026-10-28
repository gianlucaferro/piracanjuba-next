"use client";

import { CalendarCheck } from "lucide-react";

export default function PresencaTab() {
  return (
    <div className="container py-4 space-y-4">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
        <CalendarCheck className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium text-foreground text-sm">Em breve</p>
          <p className="text-sm text-muted-foreground mt-1">
            Estou conferindo manualmente as atas de presença para lançar, nos próximos dias, dados confiáveis sobre a participação dos vereadores nas sessões.
          </p>
        </div>
      </div>
    </div>
  );
}
