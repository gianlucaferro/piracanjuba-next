import { pageMetadata } from "@/lib/seo";
import PageInConstruction from "@/components/PageInConstruction";

export const metadata = pageMetadata({
  title: "Notícias de Piracanjuba GO",
  description: "Notícias e atualizações sobre Piracanjuba e a região, agregadas de fontes oficiais.",
  path: "/noticias",
  
});

export const revalidate = 3600;

export default function Page() {
  return (
    <PageInConstruction
      title="Notícias de Piracanjuba GO"
      description="Notícias e atualizações sobre Piracanjuba e a região, agregadas de fontes oficiais."
    />
  );
}
