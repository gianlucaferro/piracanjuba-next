import { pageMetadata } from "@/lib/seo";
import PostosClient from "./PostosClient";

export const metadata = pageMetadata({
  title: "Postos de Combustível em Piracanjuba GO",
  description:
    "Lista dos postos de combustível de Piracanjuba, Goiás, com bandeira, produtos, endereço e situação regulatória, com dados oficiais da Agência Nacional do Petróleo (ANP). Atualização mensal.",
  path: "/postos-combustivel",
});

export default function PostosCombustivelPage() {
  return <PostosClient />;
}
