import type { MetadataRoute } from "next";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { BUS_CHECKED_AT } from "@/data/horariosOnibus";
import { EMPRESAS } from "@/data/empresas";
import { SLUGS_EMPRESAS } from "@/data/empresas-slugs";
import { ABAS_CAMARA, ABAS_PREFEITURA, ROTAS_ESTATICAS } from "@/lib/sitemap-rotas";

const SITE_URL = "https://piracanjuba.ai";

export const revalidate = 3600; // 1 hora

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // lastModified só entra quando a rota tem data própria: conferência dos ônibus, ficha da
  // empresa e updated_at do banco. As demais saem sem <lastmod> (antes recebiam a hora do
  // build, e o Google tende a ignorar o lastmod do site inteiro quando ele não é preciso).
  const staticRoutes: MetadataRoute.Sitemap = ROTAS_ESTATICAS.map((rota) => ({
    url: `${SITE_URL}${rota.path}`,
    ...(rota.path === "/horarios-onibus" && BUS_CHECKED_AT ? { lastModified: new Date(BUS_CHECKED_AT) } : {}),
    changeFrequency: rota.changeFrequency,
    priority: rota.priority,
  }));

  // Abas indexáveis da Prefeitura e da Câmara (rotas próprias para SEO).
  const tabRoutes: MetadataRoute.Sitemap = [
    ...ABAS_PREFEITURA.map((a) => ({ url: `${SITE_URL}/prefeitura/${a}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...ABAS_CAMARA.map((a) => ({ url: `${SITE_URL}/camara/${a}`, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];

  // Páginas de empresa (piracanjuba.ai/<slug>), com a data da última conferência da ficha.
  const empresaRoutes: MetadataRoute.Sitemap = SLUGS_EMPRESAS.map((slug) => ({
    url: `${SITE_URL}/${slug}`,
    lastModified: new Date(`${EMPRESAS[slug].conferidoEm}T12:00:00-03:00`),
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  // Anúncios ativos do classificados (dinâmico)
  const dynamicRoutes: MetadataRoute.Sitemap = [];

  try {
    const supabase = createPublicSupabaseClient();

    const { data: ads } = await supabase
      .from("classificados")
      .select("id, updated_at")
      .eq("status", "ativo")
      .order("updated_at", { ascending: false })
      .limit(500);

    if (ads) {
      for (const ad of ads) {
        dynamicRoutes.push({
          url: `${SITE_URL}/compra-e-venda/${ad.id}`,
          ...(ad.updated_at ? { lastModified: new Date(ad.updated_at) } : {}),
          changeFrequency: "weekly",
          priority: 0.6,
        });
      }
    }

    // Vereadores
    const { data: vereadores } = await supabase
      .from("vereadores")
      .select("slug, updated_at")
      .not("slug", "is", null)
      .limit(50);

    if (vereadores) {
      for (const v of vereadores) {
        if (!v.slug) continue;
        dynamicRoutes.push({
          url: `${SITE_URL}/vereadores/${v.slug}`,
          ...(v.updated_at ? { lastModified: new Date(v.updated_at) } : {}),
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
    }
  } catch (e) {
    // Se DB falhar, retorna só rotas estáticas
    console.error("Sitemap dynamic routes failed:", e);
  }

  return [...staticRoutes, ...tabRoutes, ...empresaRoutes, ...dynamicRoutes];
}
