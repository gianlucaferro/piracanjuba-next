import type { NextConfig } from "next";
import { FICHAS_REBAIXADAS } from "./src/data/empresas-slugs.ts";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "oinweocqcptwxqsztlcl.supabase.co" },
      { protocol: "https", hostname: "uulpqmylqnonbxozdbtb.supabase.co" }, // legado
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "**" }, // imagens externas (vereadores, fontes, etc)
    ],
  },
  // "piracanjuba.ai/suaempresa" é o endereço de exemplo do anúncio da página de empresa
  // (carrossel do Instagram, 2026-11-17); quem digitar o exemplo cai na página de venda.
  async redirects() {
    return [
      { source: "/suaempresa", destination: "/anuncie", permanent: false },
      { source: "/zap-pba/ellen-vieira-advocacia", destination: "/evadvocacia", permanent: true },
      { source: "/zap-pba/oticas-diego", destination: "/oticas-diego", permanent: true },
      { source: "/oticasdiego", destination: "/oticas-diego", permanent: true },
      { source: "/zap-pba/adriana-manicure-e-pedicure", destination: "/manicure", permanent: true },
      { source: "/zap-pba/box-87-auto-center", destination: "/box-87-auto-center", permanent: true },
      { source: "/box87", destination: "/box-87-auto-center", permanent: true },
      { source: "/wennder-trindade-advogado", destination: "/zap-pba/wennder-trindade-advogado", permanent: true },
      { source: "/drpark", destination: "/estacionamentoaeroporto", permanent: true },
      // A Master Tech recusou a landing (2026-11-26): o atalho volta à ficha neutra do guia; a
      // URL curta serve a ficha por rewrite (abaixo). Procedimento em docs/empresa-recusou-landing.md.
      { source: "/mastertech", destination: "/zap-pba/master-tech-auto-center", permanent: true },
      // Não pagaram a landing (2026-11-26): os atalhos voltam à ficha neutra do guia.
      { source: "/claro-piracanjuba", destination: "/zap-pba/claro", permanent: true },
      { source: "/b10", destination: "/zap-pba/b10-auto-center", permanent: true },
      { source: "/zap-pba/smart-especializada", destination: "/smart-especializada", permanent: true },
      { source: "/zap-pba/as-meninas-multimarcas", destination: "/as-meninas-multimarcas", permanent: true },
      { source: "/zap-pba/superfrio-ar-condicionado", destination: "/superfrio-ar-condicionado", permanent: true },
      { source: "/hotelviasul", destination: "/hotel", permanent: true },
      { source: "/hotel-via-sul", destination: "/hotel", permanent: true },
      { source: "/zap-pba/viaggi-vistos", destination: "/viaggi-vistos", permanent: true },
      { source: "/lhs", destination: "/advogado", permanent: true },
      { source: "/lhs-advocacia", destination: "/advogado", permanent: true },
      // 308: páginas /transparencia/* da Câmara levadas para a aba equivalente (Onda 2, IDX-03,
      // 2026-11-19). Mesma lista de REDIRECIONAMENTOS_PERMANENTES em src/lib/sitemap-rotas.ts.
      { source: "/transparencia/contratos-camara", destination: "/camara/contratos", permanent: true },
      { source: "/transparencia/licitacoes-camara", destination: "/camara/licitacoes", permanent: true },
      { source: "/transparencia/folha-camara", destination: "/camara/servidores", permanent: true },
      { source: "/transparencia/indicacoes", destination: "/camara/indicacoes", permanent: true },
      { source: "/transparencia/atividades-legislativas", destination: "/camara/projetos", permanent: true },
      { source: "/transparencia/atos-camara", destination: "/camara/atuacao", permanent: true },
    ];
  },
  async rewrites() {
    return [
      // Fichas rebaixadas servidas na URL curta (200, canonical em /zap-pba/<slug>), sem 308:
      // quem guardou no navegador o 308 antigo /zap-pba/<slug> -> /<curta> não cai em laço.
      ...FICHAS_REBAIXADAS.map(({ slug, curta }) => ({ source: `/${curta}`, destination: `/zap-pba/${slug}` })),
    {
      source: "/marcas-zap/compartilhar/ellen-vieira-advocacia.jpg",
      destination: "/empresas/evadvocacia/compartilhar.jpg",
    }, {
      source: "/marcas-zap/compartilhar/oticas-diego.jpg",
      destination: "/empresas/oticas-diego/compartilhar-logo.jpg",
    }, {
      source: "/empresas/oticas-diego/compartilhar.jpg",
      destination: "/empresas/oticas-diego/compartilhar-logo.jpg",
    }, {
      source: "/marcas-zap/compartilhar/adriana-manicure-e-pedicure.jpg",
      destination: "/empresas/manicure/compartilhar.jpg",
    }, {
      source: "/marcas-zap/compartilhar/box-87-auto-center.jpg",
      destination: "/empresas/box-87-auto-center/compartilhar.jpg",
    }, {
      source: "/marcas-zap/compartilhar/viaggi-vistos.jpg",
      destination: "/empresas/viaggi-vistos/compartilhar.jpg",
    }, {
      source: "/marcas-zap/compartilhar/smart-especializada.jpg",
      destination: "/empresas/smart-especializada/compartilhar.jpg",
    }, {
      source: "/marcas-zap/compartilhar/as-meninas-multimarcas.jpg",
      destination: "/empresas/as-meninas-multimarcas/compartilhar.jpg",
    }, {
      source: "/marcas-zap/compartilhar/superfrio-ar-condicionado.jpg",
      destination: "/empresas/superfrio-ar-condicionado/compartilhar.jpg",
    }];
  },
};

export default nextConfig;
