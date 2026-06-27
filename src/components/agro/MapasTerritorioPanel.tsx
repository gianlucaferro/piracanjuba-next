"use client";

import { MapPinned } from "lucide-react";

interface MapaItem {
  src: string;
  alt: string;
  width: number;
  height: number;
  titulo: string;
  legenda: string;
  fonte: string;
}

const MAPAS: MapaItem[] = [
  {
    src: "/agro/mapa-localizacao-sul-goiano.png",
    width: 1228,
    height: 1195,
    alt: "Mapa de localização de Piracanjuba e municípios limítrofes no Sul Goiano, com a sede municipal destacada.",
    titulo: "Onde fica Piracanjuba",
    legenda:
      "No Sul Goiano, microrregião do Meia Ponte. Limita com Morrinhos, Goiatuba, Pontalina, Mairipotaba, Professor Jamil, Cristianópolis, Santa Cruz de Goiás, Bela Vista de Goiás, Hidrolândia e Caldas Novas.",
    fonte: "Malha municipal digital do IBGE (2022).",
  },
  {
    src: "/agro/mapbiomas-uso-solo-piracanjuba.jpg",
    width: 990,
    height: 1116,
    alt: "Quatro mapas de uso e cobertura do solo de Piracanjuba em 1990, 2000, 2010 e 2024, mostrando a agricultura (rosa) avançando sobre pastagem (amarelo) e vegetação nativa (verde).",
    titulo: "O solo mudando em quatro momentos (1990 a 2024)",
    legenda:
      "Rosa/magenta é agricultura (sobretudo soja), amarelo é pastagem, verde é floresta e cerrado (vegetação nativa) e azul é água. Veja o rosa se espalhar década após década, comendo o amarelo e o verde.",
    fonte: "MapBiomas, Coleção 10.1 (brasil.mapbiomas.org), recorte do município 5217104.",
  },
];

export default function MapasTerritorioPanel() {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <MapPinned className="w-4 h-4 text-primary" />
          </div>
          O território em mapas
        </h2>
        <p className="text-xs text-muted-foreground mt-1 ml-10">
          A localização do município e a transformação do solo vista do alto, em fontes oficiais.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {MAPAS.map((m) => (
          <figure key={m.src} className="stat-card flex flex-col">
            <figcaption className="mb-2">
              <p className="text-sm font-semibold text-foreground">{m.titulo}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{m.legenda}</p>
            </figcaption>
            <div className="rounded-lg overflow-hidden border bg-muted/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.src}
                alt={m.alt}
                width={m.width}
                height={m.height}
                loading="lazy"
                decoding="async"
                className="w-full h-auto block"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Fonte: {m.fonte}</p>
          </figure>
        ))}
      </div>
    </section>
  );
}
