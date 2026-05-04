import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { pageMetadata } from "@/lib/seo";
import { fetchSaudeData } from "@/lib/data/setores";
import SaudeClient from "./SaudeClient";

export const metadata = pageMetadata({
  title: "Saúde Pública de Piracanjuba GO",
  description:
    "Indicadores de saúde de Piracanjuba: dengue (InfoDengue), estabelecimentos CNES, profissionais, leitos e dados SES-GO.",
  path: "/saude",
});

export const revalidate = 3600;

const HEALTH_CATEGORIES = [
  "dengue",
  "chikungunya",
  "zika",
  "meningite",
  "dda",
  "hiv",
  "mortalidade_geral",
  "mortalidade_infantil",
];

function summarizeHealthWorkers(
  servidores: { cargo: string | null }[],
): { total: number; counts: Record<string, number> } {
  const counts: Record<string, number> = {};
  for (const servidor of servidores) {
    const cargo = (servidor.cargo || "").toUpperCase();
    if (cargo.includes("ENFERM")) counts["Enfermeiros"] = (counts["Enfermeiros"] || 0) + 1;
    else if (cargo.includes("ODONT")) counts["Dentistas"] = (counts["Dentistas"] || 0) + 1;
    else if (cargo.includes("AGENTE COMUNIT")) counts["Agentes de Saúde"] = (counts["Agentes de Saúde"] || 0) + 1;
    else if (cargo.includes("FISIOT")) counts["Fisioterapeutas"] = (counts["Fisioterapeutas"] || 0) + 1;
    else if (cargo.includes("PSICOL")) counts["Psicólogos"] = (counts["Psicólogos"] || 0) + 1;
    else if (cargo.includes("FARMAC")) counts["Farmacêuticos"] = (counts["Farmacêuticos"] || 0) + 1;
    else if (cargo.includes("NUTRI")) counts["Nutricionistas"] = (counts["Nutricionistas"] || 0) + 1;
  }
  return { total: servidores.length, counts };
}

export default async function SaudePage() {
  const data = await fetchSaudeData();
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear];
  const queryClient = new QueryClient();

  queryClient.setQueryData(["servidores-saude-count"], summarizeHealthWorkers(data.servidoresSaude.data));
  queryClient.setQueryData(["saude-estabelecimentos"], data.estabelecimentos);

  for (const categoria of HEALTH_CATEGORIES) {
    for (const year of years) {
      const indicador = ["dengue", "chikungunya", "zika"].includes(categoria) ? "casos_mes" : undefined;
      queryClient.setQueryData(
        ["saude-indicadores", categoria, year, indicador],
        data.indicadores.filter((item) => {
          if (item.categoria !== categoria) return false;
          if (indicador && item.indicador !== indicador) return false;
          return indicador ? item.ano === year : true;
        }),
      );
    }
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SaudeClient />
    </HydrationBoundary>
  );
}
