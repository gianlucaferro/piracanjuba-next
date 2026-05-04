import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { pageMetadata } from "@/lib/seo";
import { fetchAgroData } from "@/lib/data/setores";
import AgroClient from "./AgroClient";

export const metadata = pageMetadata({
  title: "Agro em Piracanjuba GO",
  description:
    "Dados agropecuários de Piracanjuba: produção, pecuária, histórico, rankings e comparativos oficiais.",
  path: "/agro",
});

export const revalidate = 3600;

export default async function AgroPage() {
  const queryClient = new QueryClient();
  queryClient.setQueryData(["agro-indicadores-page"], await fetchAgroData());

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AgroClient />
    </HydrationBoundary>
  );
}
