import type { Metadata } from "next";

const SITE_URL = "https://piracanjuba.ai";

export function pageMetadata(opts: {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: "website" | "article";
  noIndex?: boolean;
}): Metadata {
  const url = opts.path ? `${SITE_URL}${opts.path}` : SITE_URL;
  const image = opts.image || "/icon-192.png";

  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: opts.path || "/" },
    robots: opts.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      type: opts.type || "website",
      locale: "pt_BR",
      url,
      siteName: "Piracanjuba.ai",
      title: opts.title,
      description: opts.description,
      images: [{ url: image, alt: opts.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      images: [image],
    },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

// ===== IDs canônicos pra @graph =====
//
// Schema.org permite usar @id como URI estável. Isso permite:
// - Referenciar entidades sem duplicar dados
// - Google entender que GovernmentOrganization "Prefeitura" e
//   NewsMediaOrganization "Piracanjuba.ai" sao distintos
// - Outros schemas (Article, Dataset) apontam pra essas entidades via @id
const ID = {
  site: `${SITE_URL}/#website`,
  org: `${SITE_URL}/#org`,
  publisher: `${SITE_URL}/#publisher`,
  municipio: `${SITE_URL}/#municipio`,
  prefeitura: `${SITE_URL}/#prefeitura`,
  camara: `${SITE_URL}/#camara`,
  tcmGo: `${SITE_URL}/#tcm-go`,
} as const;

/**
 * @graph principal injetado em todas as páginas via layout.tsx.
 *
 * Distinções importantes:
 * - Piracanjuba.ai e' NewsMediaOrganization (jornalismo civico independente)
 * - O municipio aparece como AdministrativeArea (lugar geografico), nao como
 *   GovernmentOrganization. Isso evita impersonacao.
 * - A Prefeitura/Camara aparecem como GovernmentOrganization SEPARADAS, com
 *   url apontando pros sites oficiais e @id distinto. Sao referencia, nao alias.
 */
export function siteIdentityGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      // 1. O SITE
      {
        "@type": "WebSite",
        "@id": ID.site,
        name: "Piracanjuba.ai",
        alternateName: "Portal de Transparência Cidadã de Piracanjuba",
        url: SITE_URL,
        description:
          "Portal independente de transparência cidadã que agrega e analisa dados públicos sobre o município de Piracanjuba-GO com auxílio de inteligência artificial. Não tem vínculo com órgão público.",
        inLanguage: "pt-BR",
        publisher: { "@id": ID.org },
        about: { "@id": ID.municipio },
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      // 2. A ORGANIZACAO (Piracanjuba.ai como veiculo de jornalismo civico)
      {
        "@type": ["NewsMediaOrganization", "Organization"],
        "@id": ID.org,
        name: "Piracanjuba.ai",
        url: SITE_URL,
        logo: `${SITE_URL}/icon-512.png`,
        description:
          "Iniciativa cidadã independente de transparência municipal. Agrega dados oficiais com IA — sem vínculo com prefeitura, câmara ou qualquer órgão público.",
        disambiguatingDescription:
          "NÃO é a Prefeitura de Piracanjuba nem órgão oficial. É um portal independente mantido por cidadão.",
        foundingDate: "2026-01",
        ethicsPolicy: `${SITE_URL}/sobre`,
        diversityPolicy: `${SITE_URL}/sobre`,
        masthead: `${SITE_URL}/sobre`,
        actionableFeedbackPolicy: `${SITE_URL}/sobre`,
        correctionsPolicy: `${SITE_URL}/sobre`,
        verificationFactCheckingPolicy: `${SITE_URL}/sobre`,
        founder: {
          "@type": "Person",
          name: "Gianluca Ferro",
        },
        parentOrganization: { "@id": ID.publisher },
        areaServed: { "@id": ID.municipio },
        sameAs: [
          "https://www.instagram.com/piracanjuba.ai",
        ],
      },
      // 3. A EMPRESA mantenedora (Ferro Labs)
      {
        "@type": "Organization",
        "@id": ID.publisher,
        name: "Ferro Labs Tecnologia LTDA",
        taxID: "66.034.538/0001-25",
        founder: {
          "@type": "Person",
          name: "Gianluca Ferro",
        },
      },
      // 4. O MUNICIPIO como lugar geografico (NAO como entidade governamental)
      {
        "@type": "AdministrativeArea",
        "@id": ID.municipio,
        name: "Piracanjuba",
        alternateName: "Piracanjuba-GO",
        containedInPlace: {
          "@type": "State",
          name: "Goiás",
          containedInPlace: { "@type": "Country", name: "Brasil" },
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: -17.3028,
          longitude: -49.0167,
        },
      },
      // 5. A PREFEITURA (entidade governamental SEPARADA — referencia)
      {
        "@type": "GovernmentOrganization",
        "@id": ID.prefeitura,
        name: "Prefeitura Municipal de Piracanjuba",
        url: "https://piracanjuba.go.gov.br",
        areaServed: { "@id": ID.municipio },
      },
      // 6. A CAMARA (entidade governamental SEPARADA — referencia)
      {
        "@type": "GovernmentOrganization",
        "@id": ID.camara,
        name: "Câmara Municipal de Piracanjuba",
        url: "https://camarapiracanjuba.centi.com.br",
        areaServed: { "@id": ID.municipio },
      },
      // 7. TCM-GO (entidade governamental estadual — referencia pra Datasets)
      {
        "@type": "GovernmentOrganization",
        "@id": ID.tcmGo,
        name: "Tribunal de Contas dos Municípios do Estado de Goiás",
        alternateName: "TCM-GO",
        url: "https://www.tcm.go.gov.br",
      },
    ],
  };
}

/**
 * Schema Dataset — pra cada coleção de dados estruturados (TCM, contratos,
 * vereadores, dengue etc). É o ouro pra GEO: ChatGPT/Perplexity entendem
 * rastreabilidade (creator vs publisher) e Google Dataset Search indexa.
 *
 * @example
 *   datasetJsonLd({
 *     name: "Apontamentos TCM-GO sobre Piracanjuba",
 *     description: "...",
 *     creatorId: ID.tcmGo,           // origem oficial
 *     // publisher = Piracanjuba.ai (default)
 *     dateModified: "2026-05-04",
 *     keywords: ["transparencia", "tcm-go", "piracanjuba"],
 *   })
 */
export function datasetJsonLd(opts: {
  name: string;
  description: string;
  url: string;
  /** @id da entidade governamental que originou os dados (ID.prefeitura, ID.camara, ID.tcmGo) */
  creatorId?: string;
  /** Se a fonte nao for governo (ex: INMET, IBGE), passa creator inline */
  creator?: { name: string; url?: string; type?: string };
  dateModified?: string;
  datePublished?: string;
  keywords?: string[];
  license?: string;
  variableMeasured?: string[];
  /** Encontros: distribuicao em diferentes formatos */
  distribution?: Array<{ encodingFormat: string; contentUrl: string }>;
}) {
  const creator = opts.creatorId
    ? { "@id": opts.creatorId }
    : opts.creator
    ? {
        "@type": opts.creator.type || "Organization",
        name: opts.creator.name,
        ...(opts.creator.url ? { url: opts.creator.url } : {}),
      }
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    inLanguage: "pt-BR",
    isAccessibleForFree: true,
    license: opts.license || "https://creativecommons.org/licenses/by/4.0/",
    ...(creator ? { creator } : {}),
    publisher: { "@id": `${SITE_URL}/#org` },
    spatialCoverage: { "@id": `${SITE_URL}/#municipio` },
    ...(opts.dateModified ? { dateModified: opts.dateModified } : {}),
    ...(opts.datePublished ? { datePublished: opts.datePublished } : {}),
    ...(opts.keywords?.length ? { keywords: opts.keywords.join(", ") } : {}),
    ...(opts.variableMeasured?.length ? { variableMeasured: opts.variableMeasured } : {}),
    ...(opts.distribution?.length
      ? {
          distribution: opts.distribution.map((d) => ({
            "@type": "DataDownload",
            ...d,
          })),
        }
      : {}),
  };
}

/** Helper pra emitir schema como <script type="application/ld+json"> */
export function jsonLdScript(data: unknown) {
  return {
    __html: JSON.stringify(data),
  };
}

/** IDs canônicos exportados pra outras páginas referenciarem. */
export const SCHEMA_IDS = ID;
