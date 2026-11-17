"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

// Contêiner da vitrine. No celular a lista rola na horizontal; enquanto houver
// rolagem, ele vira uma região nomeada que recebe o foco do teclado (tabIndex),
// para quem não usa toque conseguir chegar aos itens escondidos à direita. No
// computador, sem rolagem, é só um div, sem parada extra no Tab.
export default function VitrineRolavel({
  idTitulo,
  className,
  children,
}: {
  /** id do título da seção, que dá o nome à região. */
  idTitulo: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const idDica = useId();
  const [rolavel, setRolavel] = useState(false);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento || typeof ResizeObserver === "undefined") return;
    // O ResizeObserver mede na primeira observação e a cada mudança de largura.
    const observador = new ResizeObserver(() => {
      setRolavel(elemento.scrollWidth > elemento.clientWidth + 1);
    });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      role={rolavel ? "region" : undefined}
      aria-labelledby={rolavel ? `${idTitulo} ${idDica}` : undefined}
      tabIndex={rolavel ? 0 : undefined}
    >
      {rolavel && (
        <span id={idDica} hidden>
          (fotos com rolagem lateral)
        </span>
      )}
      {children}
    </div>
  );
}
