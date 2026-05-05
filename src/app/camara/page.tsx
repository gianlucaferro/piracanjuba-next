import { pageMetadata, datasetJsonLd, SCHEMA_IDS } from "@/lib/seo";
import CamaraClient from "@/components/camara/CamaraClient";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "Câmara Municipal de Piracanjuba GO",
  description:
    "Dados da Câmara Municipal de Piracanjuba: vereadores, servidores, contratos, projetos, atuação parlamentar, atos, despesas, receitas, diárias e licitações.",
  path: "/camara",
});

const SITE_URL = "https://piracanjuba.ai";
const today = new Date().toISOString().slice(0, 10);

const camaraDatasets = [
  datasetJsonLd({
    name: "Vereadores e atuação parlamentar da Câmara de Piracanjuba",
    description:
      "Vereadores em exercício na Câmara Municipal de Piracanjuba, com biografia, contatos, projetos de lei autorados, padrão de votação, atos administrativos e atuação parlamentar.",
    url: `${SITE_URL}/camara?tab=vereadores`,
    creatorId: SCHEMA_IDS.camara,
    dateModified: today,
    keywords: [
      "vereadores",
      "Câmara Municipal",
      "Piracanjuba",
      "transparência",
      "atuação parlamentar",
    ],
    variableMeasured: [
      "nome",
      "partido",
      "mandato",
      "projetos de lei",
      "presença em sessões",
      "votos",
    ],
  }),
  datasetJsonLd({
    name: "Atos da Câmara Municipal de Piracanjuba",
    description:
      "Resoluções, decretos legislativos, indicações, requerimentos e demais atos publicados pela Câmara Municipal de Piracanjuba. Cada ato traz resumo gerado por IA e link para o documento original.",
    url: `${SITE_URL}/camara?tab=atos`,
    creatorId: SCHEMA_IDS.camara,
    dateModified: today,
    keywords: [
      "atos legislativos",
      "Câmara Municipal",
      "Piracanjuba",
      "transparência",
    ],
    variableMeasured: [
      "número do ato",
      "tipo (resolução, decreto, indicação)",
      "data",
      "ementa",
      "autoria",
    ],
  }),
  datasetJsonLd({
    name: "Atas das sessões da Câmara de Piracanjuba",
    description:
      "Atas das sessões ordinárias e extraordinárias da Câmara Municipal de Piracanjuba, com pauta, votações, registros de fala e decisões. Inclui resumo gerado por IA.",
    url: `${SITE_URL}/camara?tab=atas`,
    creatorId: SCHEMA_IDS.camara,
    dateModified: today,
    keywords: [
      "atas legislativas",
      "sessão da câmara",
      "Piracanjuba",
      "transparência",
    ],
  }),
  datasetJsonLd({
    name: "Contratos e licitações da Câmara de Piracanjuba",
    description:
      "Contratos firmados pela Câmara Municipal de Piracanjuba e licitações abertas, com fornecedores, valores, vigência e modalidade.",
    url: `${SITE_URL}/camara?tab=contratos`,
    creatorId: SCHEMA_IDS.camara,
    dateModified: today,
    keywords: [
      "contratos públicos",
      "Câmara Municipal",
      "Piracanjuba",
      "licitação",
    ],
  }),
];

export default function CamaraPage() {
  return (
    <>
      {camaraDatasets.map((d, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }}
        />
      ))}
      <CamaraClient />
    </>
  );
}
