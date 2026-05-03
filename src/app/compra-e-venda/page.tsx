import { pageMetadata } from "@/lib/seo";
import PageInConstruction from "@/components/PageInConstruction";

export const metadata = pageMetadata({
  title: "Compra e Venda PBA — Classificados de Piracanjuba",
  description: "Anuncie grátis em Piracanjuba: imóveis, veículos, eletrônicos, serviços, agro e mais.",
  path: "/compra-e-venda",
  
});

export const revalidate = 3600;

export default function Page() {
  return (
    <PageInConstruction
      title="Compra e Venda PBA — Classificados de Piracanjuba"
      description="Anuncie grátis em Piracanjuba: imóveis, veículos, eletrônicos, serviços, agro e mais."
    />
  );
}
