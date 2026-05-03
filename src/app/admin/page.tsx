import { pageMetadata } from "@/lib/seo";
import PageInConstruction from "@/components/PageInConstruction";

export const metadata = pageMetadata({
  title: "Painel Administrativo",
  description: "Área administrativa do Piracanjuba.ai.",
  path: "/admin",
  noIndex: true,
});

export const revalidate = 3600;

export default function Page() {
  return (
    <PageInConstruction
      title="Painel Administrativo"
      description="Área administrativa do Piracanjuba.ai."
    />
  );
}
