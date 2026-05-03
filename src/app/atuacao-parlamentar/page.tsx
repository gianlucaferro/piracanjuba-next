import { pageMetadata } from "@/lib/seo";
import PageInConstruction from "@/components/PageInConstruction";

export const metadata = pageMetadata({
  title: "Atuação Parlamentar — Piracanjuba GO",
  description: "Requerimentos, indicações, moções e proposições de cada vereador da Câmara Municipal de Piracanjuba.",
  path: "/atuacao-parlamentar",
  
});

export const revalidate = 3600;

export default function Page() {
  return (
    <PageInConstruction
      title="Atuação Parlamentar — Piracanjuba GO"
      description="Requerimentos, indicações, moções e proposições de cada vereador da Câmara Municipal de Piracanjuba."
      fonteUrl="https://acessoainformacao.camaradepiracanjuba.go.gov.br/"
      fonteLabel="Portal da Transparência"
    />
  );
}
