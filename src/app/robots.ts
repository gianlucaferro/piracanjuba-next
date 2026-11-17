import type { MetadataRoute } from "next";

// Um grupo só: pela RFC 9309 o robô segue apenas o grupo mais específico que casa com ele,
// então um grupo próprio de Googlebot ou Bingbot sem os Disallow liberava /admin e /api/.
// O Next serializa a lista como linhas User-Agent seguidas, que formam um único grupo com
// os mesmos Allow e Disallow. Os bots de IA aparecem pelo nome (padrão do operador: crawlers
// de IA liberados). Sem Host: Google e Bing não usam a diretiva.
const AGENTES = [
  "*",
  "Googlebot",
  "Bingbot",
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "meta-externalagent",
  "Twitterbot",
  "facebookexternalhit",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: AGENTES, allow: "/", disallow: ["/admin", "/api/"] }],
    sitemap: "https://piracanjuba.ai/sitemap.xml",
  };
}
