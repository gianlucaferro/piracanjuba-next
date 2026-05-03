import { pageMetadata } from "@/lib/seo";
import PageInConstruction from "@/components/PageInConstruction";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;
  return pageMetadata({
    title: "Anúncio — Compra e Venda PBA Piracanjuba",
    description: "Detalhes do anúncio do Compra e Venda PBA Piracanjuba.",
    path: `/compra-e-venda`,
  });
}

export const revalidate = 600;

export default async function AnuncioPage() {
  return (
    <PageInConstruction
      title="Anúncio do Compra e Venda PBA"
      description="Os detalhes deste anúncio estarão disponíveis em breve."
    />
  );
}
