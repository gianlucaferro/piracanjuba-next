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
};

export default nextConfig;
