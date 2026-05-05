import { pageMetadata, datasetJsonLd, SCHEMA_IDS } from "@/lib/seo";
import PrefeituraClient from "@/components/prefeitura/PrefeituraClient";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "Prefeitura de Piracanjuba GO",
  description:
    "Dados da Prefeitura de Piracanjuba: prefeito, vice, secretarias, servidores, contratos, despesas, obras, licitações, decretos e portarias.",
  path: "/prefeitura",
});

const SITE_URL = "https://piracanjuba.ai";
const today = new Date().toISOString().slice(0, 10);

// Schemas Dataset — um por aba estruturada da pagina /prefeitura.
// Cada dataset deixa CLARO via creator quem produziu os dados originalmente
// (Prefeitura ou TCM-GO) e via publisher que o Piracanjuba.ai eh o agregador.
// Isso ranqueia muito bem em GEO (ChatGPT, Perplexity, Google Dataset Search).
const datasets = [
  datasetJsonLd({
    name: "Apontamentos do TCM-GO sobre Piracanjuba",
    description:
      "Acórdãos, pareceres, notificações, decisões e relatórios do Tribunal de Contas dos Municípios do Estado de Goiás envolvendo a Prefeitura, Câmara, fundos e órgãos do município de Piracanjuba. Cada apontamento traz resumo gerado por IA e link direto para o PDF original publicado no domínio tcm.go.gov.br.",
    url: `${SITE_URL}/prefeitura?tab=tcm-go`,
    creatorId: SCHEMA_IDS.tcmGo,
    dateModified: today,
    keywords: [
      "transparência",
      "TCM-GO",
      "Piracanjuba",
      "acórdão",
      "fiscalização municipal",
      "contas públicas",
    ],
    variableMeasured: [
      "número do processo",
      "ano",
      "tipo de documento",
      "status do julgamento",
      "órgão alvo",
      "ementa",
      "valor envolvido",
    ],
  }),
  datasetJsonLd({
    name: "Contratos da Prefeitura de Piracanjuba",
    description:
      "Contratos firmados pela Prefeitura Municipal de Piracanjuba com fornecedores e prestadores de serviço, incluindo valor, vigência, modalidade de licitação e aditivos. Dados extraídos do portal de transparência da Prefeitura.",
    url: `${SITE_URL}/prefeitura?tab=contratos`,
    creatorId: SCHEMA_IDS.prefeitura,
    dateModified: today,
    keywords: [
      "contratos públicos",
      "Piracanjuba",
      "licitação",
      "fornecedores",
      "transparência",
    ],
    variableMeasured: [
      "número do contrato",
      "fornecedor",
      "objeto",
      "valor",
      "vigência",
      "modalidade",
    ],
  }),
  datasetJsonLd({
    name: "Servidores Municipais de Piracanjuba",
    description:
      "Folha de pagamento dos servidores da Prefeitura Municipal de Piracanjuba, incluindo cargo, lotação, remuneração bruta e líquida.",
    url: `${SITE_URL}/prefeitura?tab=servidores`,
    creatorId: SCHEMA_IDS.prefeitura,
    dateModified: today,
    keywords: [
      "servidores públicos",
      "Piracanjuba",
      "folha de pagamento",
      "remuneração",
      "transparência",
    ],
    variableMeasured: [
      "nome",
      "cargo",
      "lotação",
      "remuneração bruta",
      "remuneração líquida",
    ],
  }),
  datasetJsonLd({
    name: "Frota de Veículos da Prefeitura de Piracanjuba",
    description:
      "Veículos do poder executivo municipal de Piracanjuba (placa, modelo, ano, secretaria responsável) coletados via DETRAN-GO e dados de transparência municipal.",
    url: `${SITE_URL}/prefeitura?tab=veiculos`,
    creator: {
      type: "GovernmentOrganization",
      name: "DETRAN-GO + Prefeitura de Piracanjuba",
    },
    dateModified: today,
    keywords: ["frota municipal", "DETRAN", "Piracanjuba", "transparência"],
  }),
];

export default function PrefeituraPage() {
  return (
    <>
      {datasets.map((d, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }}
        />
      ))}
      <PrefeituraClient />
    </>
  );
}
