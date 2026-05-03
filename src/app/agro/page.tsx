import { pageMetadata } from "@/lib/seo";
import PageInConstruction from "@/components/PageInConstruction";

export const metadata = pageMetadata({
  title: "Agro em Piracanjuba GO",
  description: "PIB do agro, produtividade ton/ha, ranking regional e indicadores agropecuários de Piracanjuba.",
  path: "/agro",
  
});

export const revalidate = 3600;

export default function Page() {
  return (
    <PageInConstruction
      title="Agro em Piracanjuba GO"
      description="PIB do agro, produtividade ton/ha, ranking regional e indicadores agropecuários de Piracanjuba."
    />
  );
}
