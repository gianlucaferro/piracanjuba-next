import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EmpresaLanding from "@/components/empresas/EmpresaLanding";
import { EMPRESAS, type Empresa } from "@/data/empresas";
import { SLUGS_EMPRESAS, ehSlugEmpresa } from "@/data/empresas-slugs";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

// Páginas de empresa na raiz: piracanjuba.ai/<slug>. As seções do portal são
// rotas estáticas e vencem este segmento dinâmico; o teste
// tests/empresas.test.ts impede que um slug repita o nome de uma seção.
// dynamicParams = false: qualquer outro nome de um nível vira 404.
export const dynamicParams = false;

const SITE_URL = "https://piracanjuba.ai";

type Props = { params: Promise<{ empresa: string }> };

export function generateStaticParams() {
  return SLUGS_EMPRESAS.map((empresa) => ({ empresa }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { empresa: slug } = await params;
  if (!ehSlugEmpresa(slug)) return {};
  const empresa = EMPRESAS[slug];
  return pageMetadata({
    title: empresa.seo.titulo,
    description: empresa.seo.descricao,
    path: `/${slug}`,
    image: empresa.seo.imagem,
  });
}

function schemaEmpresa(empresa: Empresa) {
  const pagina = `${SITE_URL}/${empresa.slug}`;
  const { cidade, uf, atendimento } = empresa.endereco;
  const sameAs = [empresa.contato.site?.url, empresa.contato.instagram?.url].filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": empresa.seo.tipoSchema,
    "@id": `${pagina}#empresa`,
    name: empresa.nome,
    description: empresa.seo.descricao,
    url: empresa.contato.site?.url ?? pagina,
    mainEntityOfPage: pagina,
    image: `${SITE_URL}${empresa.foto?.src ?? empresa.seo.imagem}`,
    logo: `${SITE_URL}${empresa.seo.logoSchema ?? empresa.logo.src}`,
    telephone: `+${empresa.contato.whatsapp}`,
    ...(atendimento === "presencial"
      ? {
          address: {
            "@type": "PostalAddress",
            addressLocality: cidade,
            addressRegion: uf,
            addressCountry: "BR",
          },
          areaServed: { "@type": "City", name: `${cidade}, ${uf}` },
        }
      : {
          areaServed: [
            { "@type": "City", name: `${cidade}, ${uf}` },
            { "@type": "Country", name: "Brasil" },
          ],
        }),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

/** JSON-LD com "<" escapado, como recomenda o guia de JSON-LD do Next. */
function jsonLd(dados: unknown) {
  return { __html: JSON.stringify(dados).replace(/</g, "\\u003c") };
}

export default async function PaginaEmpresa({ params }: Props) {
  const { empresa: slug } = await params;
  if (!ehSlugEmpresa(slug)) notFound();
  const empresa = EMPRESAS[slug];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd([
          schemaEmpresa(empresa),
          breadcrumbJsonLd([
            { name: "Início", path: "/" },
            { name: empresa.nome, path: `/${slug}` },
          ]),
        ])}
      />
      <EmpresaLanding empresa={empresa} />
    </>
  );
}
