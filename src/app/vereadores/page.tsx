import { pageMetadata } from "@/lib/seo";
import PageInConstruction from "@/components/PageInConstruction";

export const metadata = pageMetadata({
  title: "Vereadores de Piracanjuba GO",
  description: "Lista completa dos 11 vereadores de Piracanjuba: partido, salário, custo total, atuação parlamentar e produção legislativa.",
  path: "/vereadores",
  
});

export const revalidate = 3600;

export default function Page() {
  return (
    <PageInConstruction
      title="Vereadores de Piracanjuba GO"
      description="Lista completa dos 11 vereadores de Piracanjuba: partido, salário, custo total, atuação parlamentar e produção legislativa."
      fonteUrl="https://camaradepiracanjuba.go.gov.br/vereadores/"
      fonteLabel="Lista oficial de vereadores"
    />
  );
}
