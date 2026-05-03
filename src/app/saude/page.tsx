import { pageMetadata } from "@/lib/seo";
import PageInConstruction from "@/components/PageInConstruction";

export const metadata = pageMetadata({
  title: "Saúde Pública de Piracanjuba GO",
  description: "Indicadores epidemiológicos, dengue, profissionais de saúde, estabelecimentos, vacinação e despesas em saúde.",
  path: "/saude",
  
});

export const revalidate = 3600;

export default function Page() {
  return (
    <PageInConstruction
      title="Saúde Pública de Piracanjuba GO"
      description="Indicadores epidemiológicos, dengue, profissionais de saúde, estabelecimentos, vacinação e despesas em saúde."
    />
  );
}
