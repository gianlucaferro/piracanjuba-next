"use client";

import { useEffect, useMemo } from "react";
import {
  PLANTAO_FARMACIAS,
  aplicarContatoCadastrado,
  criarBuscaPorNome,
  formatPeriodoEscala,
  type ContatoCadastrado,
  type Farmacia,
} from "@/data/plantaoFarmacias";
import SemanaPlantaoResumo from "./SemanaPlantaoResumo";

// O servidor decide a ordem (índices) para que a hidratação não dependa do relógio do
// navegador. Este componente só desenha as listas e abre a semana citada no endereço (#data).
export default function PlantaoFarmaciasClient({
  futuras,
  anteriores,
  contatos,
}: {
  futuras: number[];
  anteriores: number[];
  contatos: ContatoCadastrado[];
}) {
  const resolver = useMemo(() => {
    const buscar = criarBuscaPorNome(contatos);
    return (farmacia: Farmacia) => aplicarContatoCadastrado(farmacia, buscar(farmacia.nome));
  }, [contatos]);

  useEffect(() => {
    const abrirSemanaDoEndereco = () => {
      let id = window.location.hash.slice(1);
      try {
        id = decodeURIComponent(id);
      } catch {
        // Endereço malformado: usa o fragmento como veio.
      }
      const alvo = id ? document.getElementById(id) : null;
      if (!alvo) return;
      const recolhido = alvo.closest("details");
      if (recolhido && !recolhido.open) recolhido.open = true;
      alvo.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    abrirSemanaDoEndereco();
    window.addEventListener("hashchange", abrirSemanaDoEndereco);
    return () => window.removeEventListener("hashchange", abrirSemanaDoEndereco);
  }, []);

  const semana = (idx: number, comoChegar: boolean) => (
    <SemanaPlantaoResumo
      key={PLANTAO_FARMACIAS[idx].inicio}
      semana={PLANTAO_FARMACIAS[idx]}
      nextSemana={PLANTAO_FARMACIAS[idx + 1]}
      resolver={resolver}
      comoChegar={comoChegar}
    />
  );

  // `anteriores` vem da mais recente para a mais antiga.
  const maisRecente = anteriores[0];
  const maisAntiga = anteriores[anteriores.length - 1];

  return (
    <>
      {futuras.length > 0 && (
        <section aria-labelledby="titulo-proximas-semanas" className="space-y-3">
          <h2 id="titulo-proximas-semanas" className="text-base font-semibold text-foreground">
            Próximas semanas
          </h2>
          {futuras.map((idx) => semana(idx, true))}
        </section>
      )}

      {anteriores.length > 0 && (
        <details id="semanas-anteriores" className="rounded-lg border border-border">
          <summary className="cursor-pointer p-4">
            <h2 className="inline text-base font-semibold text-foreground">Semanas anteriores</h2>{" "}
            <span className="text-sm text-muted-foreground">
              ({anteriores.length} {anteriores.length === 1 ? "semana" : "semanas"}, de{" "}
              {formatPeriodoEscala(maisAntiga, maisRecente)})
            </span>
          </summary>
          <div className="space-y-3 px-4 pb-4">{anteriores.map((idx) => semana(idx, false))}</div>
        </details>
      )}
    </>
  );
}
