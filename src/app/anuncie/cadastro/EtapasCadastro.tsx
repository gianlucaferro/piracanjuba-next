import { Check } from "lucide-react";

export type Etapa = "dados" | "pagamento" | "confirmacao";

const ETAPAS: { id: Etapa; rotulo: string }[] = [
  { id: "dados", rotulo: "Dados" },
  { id: "pagamento", rotulo: "Pagamento" },
  { id: "confirmacao", rotulo: "Confirmação" },
];

export default function EtapasCadastro({ atual }: { atual: Etapa }) {
  const indiceAtual = ETAPAS.findIndex((etapa) => etapa.id === atual);
  return (
    <ol aria-label="Etapas do cadastro" className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      {ETAPAS.map((etapa, indice) => {
        const feita = indice < indiceAtual;
        const corrente = indice === indiceAtual;
        return (
          <li
            key={etapa.id}
            aria-current={corrente ? "step" : undefined}
            className={`flex items-center gap-2 ${corrente ? "font-semibold text-foreground" : "text-foreground/70"}`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                corrente || feita ? "bg-primary text-primary-foreground" : "border border-foreground/30"
              }`}
              aria-hidden="true"
            >
              {feita ? <Check className="h-4 w-4" /> : indice + 1}
            </span>
            {etapa.rotulo}
            {feita && <span className="sr-only"> (concluída)</span>}
            {indice < ETAPAS.length - 1 && <span className="ml-1 h-px w-6 bg-foreground/20" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
