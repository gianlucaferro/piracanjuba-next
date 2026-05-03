import { pageMetadata } from "@/lib/seo";
import PageInConstruction from "@/components/PageInConstruction";

export const metadata = pageMetadata({
  title: "Prefeitura de Piracanjuba GO",
  description: "Servidores, contratos, despesas, obras, secretarias, decretos e portarias da Prefeitura de Piracanjuba.",
  path: "/prefeitura",
  
});

export const revalidate = 3600;

export default function Page() {
  return (
    <PageInConstruction
      title="Prefeitura de Piracanjuba GO"
      description="Servidores, contratos, despesas, obras, secretarias, decretos e portarias da Prefeitura de Piracanjuba."
      fonteUrl="https://www.piracanjuba.go.gov.br/"
      fonteLabel="Site oficial da Prefeitura"
    />
  );
}
