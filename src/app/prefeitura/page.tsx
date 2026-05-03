import { pageMetadata } from "@/lib/seo";
import PrefeituraClient from "@/components/prefeitura/PrefeituraClient";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "Prefeitura de Piracanjuba GO",
  description:
    "Dados da Prefeitura de Piracanjuba: prefeito, vice, secretarias, servidores, contratos, despesas, obras, licitações, decretos e portarias.",
  path: "/prefeitura",
});

export default function PrefeituraPage() {
  return <PrefeituraClient />;
}
