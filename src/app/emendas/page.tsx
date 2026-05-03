import { pageMetadata } from "@/lib/seo";
import PageInConstruction from "@/components/PageInConstruction";

export const metadata = pageMetadata({
  title: "Emendas Parlamentares — Piracanjuba GO",
  description: "Emendas parlamentares federais e estaduais destinadas a Piracanjuba: valor empenhado, pago e objeto.",
  path: "/emendas",
  
});

export const revalidate = 3600;

export default function Page() {
  return (
    <PageInConstruction
      title="Emendas Parlamentares — Piracanjuba GO"
      description="Emendas parlamentares federais e estaduais destinadas a Piracanjuba: valor empenhado, pago e objeto."
    />
  );
}
