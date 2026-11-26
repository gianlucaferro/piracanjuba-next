import type { NextConfig } from "next";

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
      { source: "/zap-pba/claro", destination: "/claro", permanent: true },
      { source: "/claro-piracanjuba", destination: "/claro", permanent: true },
      { source: "/zap-pba/oticas-diego", destination: "/oticas-diego", permanent: true },
      { source: "/oticasdiego", destination: "/oticas-diego", permanent: true },
      { source: "/zap-pba/kamilla-morranna", destination: "/kamillamorranna", permanent: true },
      { source: "/zap-pba/box-87-auto-center", destination: "/box-87-auto-center", permanent: true },
      { source: "/box87", destination: "/box-87-auto-center", permanent: true },
      { source: "/wennder-trindade-advogado", destination: "/zap-pba/wennder-trindade-advogado", permanent: true },
      { source: "/drpark", destination: "/estacionamentoaeroporto", permanent: true },
      { source: "/zap-pba/b10-auto-center", destination: "/b10-auto-center", permanent: true },
      { source: "/b10", destination: "/b10-auto-center", permanent: true },
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
    return [{
      source: "/marcas-zap/compartilhar/ellen-vieira-advocacia.jpg",
      destination: "/empresas/evadvocacia/compartilhar.jpg",
    }, {
      source: "/marcas-zap/compartilhar/claro.jpg",
      destination: "/empresas/claro-piracanjuba/compartilhar.jpg",
    }, {
      source: "/marcas-zap/compartilhar/oticas-diego.jpg",
      destination: "/empresas/oticas-diego/compartilhar-logo.jpg",
    }, {
      source: "/empresas/oticas-diego/compartilhar.jpg",
      destination: "/empresas/oticas-diego/compartilhar-logo.jpg",
    }, {
      source: "/marcas-zap/compartilhar/kamilla-morranna.jpg",
      destination: "/empresas/kamillamorranna/compartilhar.jpg",
    }, {
      source: "/marcas-zap/compartilhar/box-87-auto-center.jpg",
      destination: "/empresas/box-87-auto-center/compartilhar.jpg",
    }];
  },
};

export default nextConfig;
