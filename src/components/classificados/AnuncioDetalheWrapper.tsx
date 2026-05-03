"use client";

import dynamic from "next/dynamic";

const AnuncioDetalheClient = dynamic(() => import("./AnuncioDetalheClient"), {
  ssr: false,
  loading: () => (
    <div className="container py-8">
      <div className="animate-pulse h-32 bg-muted rounded" />
    </div>
  ),
});

export default function AnuncioDetalheWrapper() {
  return <AnuncioDetalheClient />;
}
