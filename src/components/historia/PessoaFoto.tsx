"use client";

// Foto de uma pessoa notória. Mostra a imagem em /historia/pessoas/{slug}.jpg
// se existir; senão, cai para as iniciais. Assim o operador só precisa soltar o
// arquivo na pasta public/historia/pessoas/ para a foto aparecer.

import { useState } from "react";

export default function PessoaFoto({ slug, nome }: { slug: string; nome: string }) {
  const [erro, setErro] = useState(false);
  const iniciais = nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-rose-500/10 flex items-center justify-center shrink-0">
      {!erro ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/historia/pessoas/${slug}.jpg`}
          alt={`Foto de ${nome}`}
          loading="lazy"
          className="w-full h-full object-cover"
          onError={() => setErro(true)}
        />
      ) : (
        <span className="text-rose-600 dark:text-rose-400 font-bold text-lg">{iniciais}</span>
      )}
    </div>
  );
}
