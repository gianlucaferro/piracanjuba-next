import { pageMetadata } from "@/lib/seo";
import PageInConstruction from "@/components/PageInConstruction";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const nome = slug
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
  return pageMetadata({
    title: `Vereador ${nome} — Piracanjuba GO`,
    description: `Perfil completo do vereador ${nome} de Piracanjuba: partido, salário, custo total, atuação parlamentar e produção legislativa.`,
    path: `/vereadores/${slug}`,
  });
}

export const revalidate = 3600;

export default async function VereadorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const nome = slug
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
  return (
    <PageInConstruction
      title={`Vereador ${nome}`}
      description="Perfil do vereador, atuação parlamentar, salário, projetos e votações em Piracanjuba GO."
    />
  );
}
