import { Trees } from "lucide-react";
import { pageMetadata, datasetJsonLd } from "@/lib/seo";
import EmColetaSection from "@/components/EmColetaSection";
import MapBiomasPanel from "@/components/meio-ambiente/MapBiomasPanel";
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

      {/* Outras fontes — em coleta */}
      <div className="mt-10">
        <EmColetaSection
          titulo="Outros indicadores ambientais — Em coleta"
          descricao="Estamos integrando alertas de desmatamento DETER/INPE, focos de queimadas, áreas protegidas (CAR/SICAR), embargos do IBAMA e qualidade da água do Rio Piracanjuba. Por enquanto, consulte as fontes oficiais abaixo."
          iconBg="bg-emerald-700/10"
          exemplosCruzamentos={[
            "Alertas de desmatamento em tempo real (DETER/INPE)",
            "Cadastro Ambiental Rural (CAR): % de imóveis com APP/RL regularizados",
            "Embargos ambientais ativos (IBAMA)",
            "Cruzamento desmatamento × expansão da soja × emissão CO2 estimada",
            "Cruzamento chuva × seca × incêndios florestais (queimadas)",
            "Áreas de Preservação Permanente: rios, encostas, nascentes",
            "Reservas Particulares do Patrimônio Natural (RPPN) no município",
          ]}
          fontes={[
            {
              nome: "MapBiomas — Plataforma de Mapeamento",
              url: "https://plataforma.brasil.mapbiomas.org/",
              descricao: "Uso e cobertura do solo de 1985 a presente, atualização anual. (Já integrado acima.)",
            },
            {
              nome: "DETER/INPE — Alertas de Desmatamento",
              url: "http://terrabrasilis.dpi.inpe.br/",
              descricao: "Alertas mensais de desmatamento e degradação florestal.",
            },
            {
              nome: "PRODES/INPE — Mapeamento Anual",
              url: "http://www.obt.inpe.br/OBT/assuntos/programas/amazonia/prodes",
              descricao: "Taxa anual de desmatamento bruto.",
            },
            {
              nome: "SICAR — Sistema Nacional do CAR",
              url: "https://www.car.gov.br/",
              descricao: "Cadastro Ambiental Rural — imóveis cadastrados, áreas RL/APP.",
            },
            {
              nome: "IBAMA — Embargos e Autuações",
              url: "https://www.gov.br/ibama/pt-br",
              descricao: "Embargos ambientais e autuações por infração.",
            },
            {
              nome: "BDQueimadas/INPE",
              url: "https://queimadas.dgi.inpe.br/queimadas/bdqueimadas",
              descricao: "Focos de queimadas detectados via satélite.",
            },
            {
              nome: "SEMARH-GO",
              url: "https://www.meioambiente.go.gov.br/",
              descricao: "Secretaria estadual: licenciamentos, recursos hídricos, fauna.",
            },
            {
              nome: "ANA — Recursos Hídricos",
              url: "https://www.gov.br/ana/pt-br",
              descricao: "Vazão de rios, qualidade da água, outorgas.",
            },
          ]}
        />
      </div>
    </div>
  );
}
