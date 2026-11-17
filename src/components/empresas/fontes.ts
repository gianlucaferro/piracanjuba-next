import { Bricolage_Grotesque, Cormorant_Garamond, Hanken_Grotesk, Raleway } from "next/font/google";
import type { Empresa } from "@/data/empresas";

// Fontes das marcas. preload: false porque a rota [empresa] importa todas,
// mas cada página só usa as da própria empresa: o navegador baixa o arquivo
// da fonte apenas quando ela aparece na tela.
// Itálico para o trecho em destaque do título, como no site da loja.
const vitorinoTitulo = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
  variable: "--fonte-marca-titulo",
});

const vitorinoTexto = Raleway({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--fonte-marca-texto",
});

const aparecaTitulo = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--fonte-marca-titulo",
});

const aparecaTexto = Hanken_Grotesk({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--fonte-marca-texto",
});

export const CLASSES_FONTES: Record<Empresa["fontes"], string> = {
  vitorino: `${vitorinoTitulo.variable} ${vitorinoTexto.variable}`,
  apareca: `${aparecaTitulo.variable} ${aparecaTexto.variable}`,
};
