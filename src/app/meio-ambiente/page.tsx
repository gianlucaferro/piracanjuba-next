import { Trees } from "lucide-react";
import { pageMetadata, datasetJsonLd } from "@/lib/seo";
import MapBiomasPanel from "@/components/meio-ambiente/MapBiomasPanel";
import SubstituicaoPastagemSoja from "@/components/meio-ambiente/SubstituicaoPastagemSoja";
import IndicadoresAmbientaisPanel from "@/components/meio-ambiente/IndicadoresAmbientaisPanel";
import AnaliseAmbientalIntegrada from "@/components/meio-ambiente/AnaliseAmbientalIntegrada";
import QueimadasCard from "@/components/meio-ambiente/QueimadasCard";
import BiodiversidadePanel from "@/components/meio-ambiente/BiodiversidadePanel";
import { fetchMapbiomasSerie } from "@/lib/data/meio-ambiente";
import {
  fetchChuvaUltimosDias,
  fetchChuvaHistoricaMensal,
  fetchChuvaMediaHistorica,
} from "@/lib/data/clima";
import { fetchIndicadores } from "@/lib/data/home";
import { fetchBiodiversidade } from "@/lib/data/biodiversidade";

export const metadata = pageMetadata({
  title: "Meio Ambiente em Piracanjuba GO — Uso do solo MapBiomas + análise integrada",
  description:
    "Meio ambiente de Piracanjuba: risco de fogo, uso do solo MapBiomas 1985-2024, espécies registradas no GBIF e no iNaturalist, emissões da frota e saúde hídrica.",
  path: "/meio-ambiente",
});

export const revalidate = 86400;

const SITE_URL = "https://piracanjuba.ai";
const today = new Date().toISOString().slice(0, 10);

const datasets = [
  datasetJsonLd({
    name: "Uso e cobertura do solo de Piracanjuba (1985-2024)",
    description:
      "Série temporal anual de uso e cobertura do solo em Piracanjuba-GO via MapBiomas Coleção 10.1. 14 classes do MapBiomas (Floresta, Cerrado, Pastagem, Soja, Cana, Mosaico, Urbano, Água etc.) cobrindo 40 anos.",
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
      "Landsat",
    ],
  }),
  datasetJsonLd({
    name: "Análise Ambiental Integrada de Piracanjuba",
    description:
      "Indicadores ambientais derivados via cruzamento de MapBiomas (uso do solo) + Open-Meteo Archive (chuva histórica) + INMET (clima diário) + SENATRAN (frota): risco de fogo atual, pressão agrícola sobre o Cerrado, estimativa de emissões CO2, saúde hídrica anual.",
    url: `${SITE_URL}/meio-ambiente`,
    creator: {
      type: "Organization",
      name: "MapBiomas + Open-Meteo + INMET + SENATRAN",
    },
    dateModified: today,
    keywords: [
      "Piracanjuba",
      "risco de fogo",
      "pressão agrícola",
      "emissões CO2",
      "saúde hídrica",
      "cerrado",
    ],
  }),
  datasetJsonLd({
    name: "Biodiversidade registrada em Piracanjuba (GBIF e iNaturalist)",
    description:
      "Espécies e registros de ocorrência dentro do limite do município de Piracanjuba-GO, agregados do GBIF (região GADM BRA.9.183_2, licenças CC0 e CC BY 4.0) e do iNaturalist (lugar 21162): totais, grandes grupos, espécies com mais registros e espécies ameaçadas ou quase ameaçadas na Lista Vermelha da IUCN.",
    url: `${SITE_URL}/meio-ambiente`,
    creator: {
      type: "Organization",
      name: "GBIF + iNaturalist",
      url: "https://www.gbif.org/",
    },
    dateModified: today,
    keywords: ["Piracanjuba", "biodiversidade", "espécies", "GBIF", "iNaturalist", "cerrado", "fauna", "flora"],
  }),
];

export default async function MeioAmbientePage() {
  const ano = new Date().getFullYear();
  const mesAtual = new Date().getMonth() + 1;

  // Fetch tudo em paralelo
  const [rows, chuva90, chuvaMediaHistMensal, chuvaAnoCorrente, indicadores, biodiversidade] = await Promise.all([
    fetchMapbiomasSerie(),
    fetchChuvaUltimosDias(90),
    fetchChuvaMediaHistorica(2018, 2025),
    fetchChuvaHistoricaMensal(ano),
    fetchIndicadores(),
    fetchBiodiversidade(),
  ]);

  // Total chuva ano corrente YTD
  const chuvaTotalAnoCorrente = Object.values(chuvaAnoCorrente).reduce(
    (s, v) => s + (Number(v) || 0),
    0,
  );
  // Média histórica anual completa
  const chuvaMediaHistAnoCompleto = Object.values(chuvaMediaHistMensal).reduce(
    (s, v) => s + (Number(v) || 0),
    0,
  );
  const chuvaMediaHistMesAtual = chuvaMediaHistMensal[mesAtual] ?? 0;

  // Frota
  const frotaInd = indicadores.find((i) => i.chave === "frota_veiculos");
  const frotaNum = frotaInd
    ? Number(frotaInd.valor) || (frotaInd.valor_texto ? parseInt(frotaInd.valor_texto.replace(/\D/g, "")) : null)
    : null;

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
          Análise ambiental integrada de Piracanjuba: risco de fogo, pressão agrícola,
          evolução do uso do solo, emissões e as espécies já registradas no município.
        </p>
      </header>

      {/* Card de Risco de Fogo — Open-Meteo + metodologia FWI */}
      <section className="mb-6">
        <QueimadasCard />
      </section>

      {/* Painel novo: análise integrada cruzando dados que ja temos */}
      {rows.length > 0 && (
        <section className="mb-10">
          <AnaliseAmbientalIntegrada
            mapbiomasRows={rows}
            chuva90Dias={chuva90.total}
            chuvaMediaHistMesAtual={chuvaMediaHistMesAtual}
            chuvaTotalAnoCorrente={chuvaTotalAnoCorrente}
            chuvaMediaHistAnoCompleto={chuvaMediaHistAnoCompleto}
            frotaVeiculos={frotaNum}
            ano={ano}
          />
        </section>
      )}

      {/* Painel MapBiomas — serie 1985-2024 com gráfico + cards + insights */}
      {rows.length > 0 ? <MapBiomasPanel rows={rows} /> : null}

      {/* Gráfico focado: substituição pastagem -> soja (deriva das linhas MapBiomas) */}
      {rows.length > 0 ? (
        <div className="mt-10">
          <SubstituicaoPastagemSoja rows={rows} />
        </div>
      ) : null}

      {/* Biodiversidade: espécies registradas no GBIF e no iNaturalist, dentro do limite do município. */}
      <div className="mt-10">
        <BiodiversidadePanel dados={biodiversidade} />
      </div>

      {/* Painel "Indicadores Ambientais" com 5 fontes oficiais. */}
      <div className="mt-10">
        <IndicadoresAmbientaisPanel />
      </div>
    </div>
  );
}
