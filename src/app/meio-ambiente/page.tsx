import { Trees } from "lucide-react";
import { pageMetadata, datasetJsonLd } from "@/lib/seo";
import MapBiomasPanel from "@/components/meio-ambiente/MapBiomasPanel";
import IndicadoresAmbientaisPanel from "@/components/meio-ambiente/IndicadoresAmbientaisPanel";
import { fetchMapbiomasSerie } from "@/lib/data/meio-ambiente";

export const metadata = pageMetadata({
  title: "Meio Ambiente em Piracanjuba GO — Uso do solo MapBiomas 1985-2024",
  description:
    "Como o território de Piracanjuba mudou em 40 anos: floresta, cerrado, pastagem, agricultura, urbano via MapBiomas Coleção 10.1. Plus alertas DETER, queimadas, áreas protegidas.",
  path: "/meio-ambiente",
});

export const revalidate = 86400;

const SITE_URL = "https://piracanjuba.ai";
const today = new Date().toISOString().slice(0, 10);

const datasets = [
  datasetJsonLd({
    name: "Uso e cobertura do solo de Piracanjuba (1985-2024)",
    description:
      "Série temporal anual de uso e cobertura do solo em Piracanjuba-GO via MapBiomas Coleção 10.1. 14 classes do MapBiomas (Floresta, Cerrado, Pastagem, Soja, Cana, Mosaico, Urbano, Água etc.) cobrindo 40 anos. Reanálise de imagens Landsat com classificação por IA.",
    url: `${SITE_URL}/meio-ambiente`,
    creator: {
      type: "Organization",
      name: "MapBiomas Brasil",
      url: "https://brasil.mapbiomas.org/",
    },
    dateModified: today,
    keywords: [
      "MapBiomas",
      "uso do solo",
      "Piracanjuba",
      "desmatamento",
      "cerrado",
      "soja",
      "transição florestal",
      "Landsat",
    ],
    variableMeasured: [
      "Área de floresta nativa (ha)",
      "Área de cerrado (ha)",
      "Área de pastagem (ha)",
      "Área de agricultura (ha)",
      "Área urbana (ha)",
      "Área de corpos d'água (ha)",
    ],
  }),
];

export default async function MeioAmbientePage() {
  const rows = await fetchMapbiomasSerie();

  return (
    <div className="container py-6 max-w-5xl">
      {datasets.map((d, i) => (
        <script
          key={`ds-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }}
        />
      ))}

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Trees className="w-6 h-6 text-emerald-700" />
          Meio Ambiente
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Uso do solo (MapBiomas), desmatamento, áreas protegidas e qualidade ambiental em Piracanjuba.
        </p>
      </header>

      {/* Painel principal: MapBiomas 1985-2024 com gráfico + cards + insights */}
      {rows.length > 0 ? <MapBiomasPanel rows={rows} /> : null}

      {/* Painel "Indicadores Ambientais" com 5 fontes oficiais filtraveis. */}
      {/* Substitui o "Em coleta" generico — cada card aponta direto pra dashboard */}
      {/* oficial filtravel por Piracanjuba (BDQueimadas, DETER, SICAR, IBAMA, ANA). */}
      <div className="mt-10">
        <IndicadoresAmbientaisPanel />
      </div>
    </div>
  );
}
