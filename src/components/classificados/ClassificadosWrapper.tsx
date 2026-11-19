"use client";

import { createContext, useContext, type ReactNode } from "react";
import dynamic from "next/dynamic";

type Conteudo = {
  /** Cabeçalho renderizado no servidor (H1, introdução e parágrafo-resposta). */
  cabecalho?: ReactNode;
  /** Primeiro lote de anúncios renderizado no servidor. */
  listaServidor?: ReactNode;
};

// O fallback do next/dynamic não recebe props; o conteúdo do servidor chega a ele
// por contexto. Ele vai no HTML inicial e fica na tela até a lista interativa carregar.
const ConteudoServidor = createContext<Conteudo>({});

const CLASSES_CONTAINER =
  "container w-full max-w-full px-4 sm:px-6 py-6 space-y-5 overflow-x-hidden box-border";

function Carregando() {
  const { cabecalho, listaServidor } = useContext(ConteudoServidor);
  if (!cabecalho && !listaServidor) {
    return (
      <div className="container py-8">
        <div className="animate-pulse h-32 bg-muted rounded" />
      </div>
    );
  }
  return (
    <div className={CLASSES_CONTAINER}>
      {cabecalho}
      {listaServidor ?? <div className="animate-pulse h-32 bg-muted rounded" />}
    </div>
  );
}

// A lista interativa continua só no cliente: usa localStorage, sessão do Supabase,
// gravação de áudio e o mapa (Leaflet), que não rodam no servidor.
const ClassificadosClient = dynamic<{ cabecalho?: ReactNode }>(
  () => import("./ClassificadosClient"),
  { ssr: false, loading: Carregando },
);

export default function ClassificadosWrapper({ cabecalho, listaServidor }: Conteudo) {
  return (
    <ConteudoServidor.Provider value={{ cabecalho, listaServidor }}>
      <ClassificadosClient cabecalho={cabecalho} />
    </ConteudoServidor.Provider>
  );
}
