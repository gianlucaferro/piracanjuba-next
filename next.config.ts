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
    return [{ source: "/suaempresa", destination: "/anuncie", permanent: false }];
  },
};

export default nextConfig;
