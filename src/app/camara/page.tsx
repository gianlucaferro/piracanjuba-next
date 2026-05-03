import { pageMetadata } from "@/lib/seo";
import PageInConstruction from "@/components/PageInConstruction";

export const metadata = pageMetadata({
  title: "Câmara Municipal de Piracanjuba GO",
  description: "Vereadores, projetos de lei, votações, atas, presença e atuação parlamentar da Câmara Municipal de Piracanjuba.",
  path: "/camara",
  
});

export const revalidate = 3600;

export default function Page() {
  return (
    <PageInConstruction
      title="Câmara Municipal de Piracanjuba GO"
      description="Vereadores, projetos de lei, votações, atas, presença e atuação parlamentar da Câmara Municipal de Piracanjuba."
      fonteUrl="https://camaradepiracanjuba.go.gov.br/"
      fonteLabel="Site oficial da Câmara"
    />
  );
}
