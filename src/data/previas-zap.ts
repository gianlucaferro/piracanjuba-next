import catalogo from "./previas-zap.json";

export type PreviaZap = {
  slug: string;
  nome: string;
  categoria: string;
  setor: string;
  oferta?: string[];
  siteRotulo?: string;
  atividade: string;
  resumo: string;
  detalhe?: string;
  telefones: string[];
  endereco?: string;
  mapa?: string;
  instagram?: string;
  site?: string;
  facebook?: string;
  logo?: string;
  cor?: string;
  foto?: string;
  fotoAlt?: string;
  instagramRede?: boolean;
  siteRede?: boolean;
  contatoRede?: boolean;
  atendimentoRemoto?: boolean;
};

export const previas: readonly PreviaZap[] = catalogo;
export const previaPorSlug = new Map(previas.map((previa) => [previa.slug, previa]));
