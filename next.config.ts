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
};

export default nextConfig;
