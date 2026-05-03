import { pageMetadata } from "@/lib/seo";
import PageInConstruction from "@/components/PageInConstruction";

export const metadata = pageMetadata({
  title: "Educação de Piracanjuba GO",
  description: "IDEB, escolas municipais, matrículas, infraestrutura, contatos e investimento por aluno.",
  path: "/educacao",
  
});

export const revalidate = 3600;

export default function Page() {
  return (
    <PageInConstruction
      title="Educação de Piracanjuba GO"
      description="IDEB, escolas municipais, matrículas, infraestrutura, contatos e investimento por aluno."
    />
  );
}
