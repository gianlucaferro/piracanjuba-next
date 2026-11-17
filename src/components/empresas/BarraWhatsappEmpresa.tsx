"use client";

import { useEffect, useState } from "react";

// Barra fixa de WhatsApp no celular. Só aparece quando o botão do topo deixa
// de estar majoritariamente na tela, para não mostrar dois botões iguais na
// primeira dobra.
//
// Nasce escondida (fora da tela) já no HTML do servidor, para não aparecer no
// primeiro paint e sumir depois da hidratação. Quem está sem JavaScript a
// recebe de volta pela regra em <noscript> do EmpresaLanding. Sem
// IntersectionObserver, a barra fica visível. Escondida depois da leitura,
// recebe inert e aria-hidden, para o leitor de tela não anunciar o botão em
// dobro; antes da leitura não leva esses atributos, para não travar a barra de
// quem está sem JavaScript.

/** Fração do botão do topo que precisa estar visível para a barra sair. */
const LIMIAR_VISIVEL = 0.5;

type Estado = "inicial" | "oculta" | "visivel";

export default function BarraWhatsappEmpresa({
  alvoId,
  children,
}: {
  alvoId: string;
  children: React.ReactNode;
}) {
  const [estado, setEstado] = useState<Estado>("inicial");
  // A transição só liga depois da primeira leitura, para a barra não "subir"
  // na carga da página quando o botão do topo está fora da tela.
  const [animar, setAnimar] = useState(false);

  useEffect(() => {
    const alvo = document.getElementById(alvoId);
    if (!alvo || typeof IntersectionObserver === "undefined") {
      const quadro = requestAnimationFrame(() => setEstado("visivel"));
      return () => cancelAnimationFrame(quadro);
    }
    const observador = new IntersectionObserver(
      ([entrada]) => {
        setEstado(entrada.isIntersecting && entrada.intersectionRatio >= LIMIAR_VISIVEL ? "oculta" : "visivel");
        requestAnimationFrame(() => setAnimar(true));
      },
      { threshold: [0, LIMIAR_VISIVEL, 1] },
    );
    observador.observe(alvo);
    return () => observador.disconnect();
  }, [alvoId]);

  const oculta = estado === "oculta";
  return (
    <div
      data-barra-empresa
      aria-hidden={oculta || undefined}
      inert={oculta}
      className={`fixed inset-x-0 bottom-0 z-50 border-t border-[var(--marca-borda)] bg-[var(--marca-superficie)]/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:hidden ${
        animar ? "transition-transform duration-200 ease-out" : ""
      } ${estado === "visivel" ? "translate-y-0" : "translate-y-full"}`}
    >
      {children}
    </div>
  );
}
