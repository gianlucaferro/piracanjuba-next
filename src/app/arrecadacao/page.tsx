import { pageMetadata } from "@/lib/seo";
import PageInConstruction from "@/components/PageInConstruction";

export const metadata = pageMetadata({
  title: "Arrecadação Municipal — Piracanjuba GO",
  description: "Receitas municipais, IPTU, ISS, ITBI, transferências e impostos arrecadados em Piracanjuba.",
  path: "/arrecadacao",
  
});

export const revalidate = 3600;

export default function Page() {
  return (
    <PageInConstruction
      title="Arrecadação Municipal — Piracanjuba GO"
      description="Receitas municipais, IPTU, ISS, ITBI, transferências e impostos arrecadados em Piracanjuba."
    />
  );
}
