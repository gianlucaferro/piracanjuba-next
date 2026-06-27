"use client";

// Imagem ilustrativa opcional. Faz um HEAD no arquivo e só renderiza se ele existir
// e for uma imagem. Assim, enquanto o operador não adiciona o arquivo em public/,
// nada aparece (sem imagem quebrada); quando o arquivo é adicionado, a foto surge.

import { useEffect, useState } from "react";

export default function FotoOpcional({ src, alt, legenda, className }: { src: string; alt: string; legenda?: string; className?: string }) {
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let vivo = true;
    fetch(src, { method: "HEAD" })
      .then((r) => {
        if (vivo) setOk(r.ok && (r.headers.get("content-type") || "").startsWith("image/"));
      })
      .catch(() => {
        if (vivo) setOk(false);
      });
    return () => {
      vivo = false;
    };
  }, [src]);

  if (!ok) return null;

  return (
    <figure className={`mt-4${className ? ` ${className}` : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" className="w-full rounded-xl border border-border object-cover" />
      {legenda && <figcaption className="text-sm text-muted-foreground mt-1.5">{legenda}</figcaption>}
    </figure>
  );
}
