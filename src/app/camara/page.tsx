import { pageMetadata } from "@/lib/seo";
import CamaraClient from "@/components/camara/CamaraClient";

export const metadata = pageMetadata({
  title: "Câmara Municipal de Piracanjuba GO",
  description:
    "Dados da Câmara Municipal de Piracanjuba: vereadores, servidores, contratos, projetos, atuação parlamentar, atos, despesas, receitas, diárias e licitações.",
  path: "/camara",
});

export default function CamaraPage() {
  return <CamaraClient />;
}
