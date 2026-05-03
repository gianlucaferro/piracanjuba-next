import { pageMetadata } from "@/lib/seo";
import PageInConstruction from "@/components/PageInConstruction";

export const metadata = pageMetadata({
  title: "Benefícios Sociais — Piracanjuba GO",
  description: "Bolsa Família, CadÚnico, calendário de pagamentos, registro e benefícios sociais em Piracanjuba.",
  path: "/beneficios-sociais",
  
});

export const revalidate = 3600;

export default function Page() {
  return (
    <PageInConstruction
      title="Benefícios Sociais — Piracanjuba GO"
      description="Bolsa Família, CadÚnico, calendário de pagamentos, registro e benefícios sociais em Piracanjuba."
    />
  );
}
