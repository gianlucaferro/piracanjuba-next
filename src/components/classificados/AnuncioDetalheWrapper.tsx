"use client";

import AnuncioDetalheClient, { type AnuncioDetalheClientProps } from "./AnuncioDetalheClient";

// Renderizado também no servidor: título, preço, descrição e breadcrumb do anúncio
// vão no HTML inicial. O que depende do browser (favoritos, contagem de visita,
// compartilhar, lightbox) roda só depois da hidratação.
export default function AnuncioDetalheWrapper(props: AnuncioDetalheClientProps) {
  return <AnuncioDetalheClient {...props} />;
}
