import { pageMetadata } from "@/lib/seo";
import PageInConstruction from "@/components/PageInConstruction";

export const metadata = pageMetadata({
  title: "Segurança em Piracanjuba GO",
  description: "Ocorrências, indicadores de segurança pública, contatos de PM e Bombeiros em Piracanjuba.",
  path: "/seguranca",
  
});

export const revalidate = 3600;

export default function Page() {
  return (
    <PageInConstruction
      title="Segurança em Piracanjuba GO"
      description="Ocorrências, indicadores de segurança pública, contatos de PM e Bombeiros em Piracanjuba."
    />
  );
}
