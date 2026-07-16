import { pageMetadata } from "@/lib/seo";
import GruposClient from "./GruposClient";

export const metadata = pageMetadata({
  title: "Grupos econômicos entre os fornecedores de Piracanjuba",
  description:
    "Empresas com contrato na prefeitura ou câmara de Piracanjuba que compartilham os mesmos sócios, cruzando o quadro societário oficial da Receita Federal com os contratos públicos. Vínculos societários que não aparecem olhando contrato por contrato.",
  path: "/grupos-economicos",
});

export default function GruposEconomicosPage() {
  return <GruposClient />;
}
