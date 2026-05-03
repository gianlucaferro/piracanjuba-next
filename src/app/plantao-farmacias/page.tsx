import { pageMetadata } from "@/lib/seo";
import PageInConstruction from "@/components/PageInConstruction";

export const metadata = pageMetadata({
  title: "Farmácias de Plantão — Piracanjuba GO",
  description: "Escala de plantão das farmácias de Piracanjuba: quem está aberta esta semana e telefones de contato.",
  path: "/plantao-farmacias",
  
});

export const revalidate = 3600;

export default function Page() {
  return (
    <PageInConstruction
      title="Farmácias de Plantão — Piracanjuba GO"
      description="Escala de plantão das farmácias de Piracanjuba: quem está aberta esta semana e telefones de contato."
    />
  );
}
