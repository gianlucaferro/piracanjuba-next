"use client";

import { useEffect, useState } from "react";

// Barra fixa de WhatsApp no celular. Só aparece depois que o botão do topo sai
// da tela, para não mostrar dois botões iguais na primeira dobra. Sem
// JavaScript (ou sem IntersectionObserver) ela fica sempre visível. Escondida,
// recebe inert e aria-hidden, para o leitor de tela não anunciar o botão em dobro.
export default function BarraWhatsappEmpresa({
  alvoId,
  children,
}: {
  alvoId: string;
  children: React.ReactNode;
}) {
  const [oculta, setOculta] = useState(false);
  // A transição só liga depois da primeira leitura, para a barra não "descer"
  // na carga da página quando o botão do topo já está visível.
  const [animar, setAnimar] = useState(false);

  useEffect(() => {
    const alvo = document.getElementById(alvoId);
    if (!alvo || typeof IntersectionObserver === "undefined") return;
    const observador = new IntersectionObserver(([entrada]) => {
      setOculta(entrada.isIntersecting);
      requestAnimationFrame(() => setAnimar(true));
    });
    observador.observe(alvo);
    return () => observador.disconnect();
  }, [alvoId]);

  return (
    <div
      data-barra-empresa
      aria-hidden={oculta || undefined}
      inert={oculta}
      className={`fixed inset-x-0 bottom-0 z-50 border-t border-[var(--marca-borda)] bg-[var(--marca-superficie)]/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:hidden ${
        animar ? "transition-transform duration-200 ease-out" : ""
      } ${oculta ? "translate-y-full" : "translate-y-0"}`}
    >
      {children}
    </div>
  );
}
