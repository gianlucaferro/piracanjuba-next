import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EmpresaLanding from "@/components/empresas/EmpresaLanding";
import { EMPRESAS } from "@/data/empresas";
import { SLUGS_EMPRESAS, ehSlugEmpresa } from "@/data/empresas-slugs";
import { schemaEmpresa, schemaFaq } from "@/lib/empresas-schema";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

// Páginas de empresa na raiz: piracanjuba.ai/<slug>. As seções do portal são
// rotas estáticas e vencem este segmento dinâmico; o teste
// tests/empresas.test.ts impede que um slug repita o nome de uma seção.
// dynamicParams = false: qualquer outro nome de um nível vira 404.
export const dynamicParams = false;

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

/** JSON-LD com "<" escapado, como recomenda o guia de JSON-LD do Next. */
function jsonLd(dados: unknown) {
  return { __html: JSON.stringify(dados).replace(/</g, "\\u003c") };
}

export default async function PaginaEmpresa({ params }: Props) {
  const { empresa: slug } = await params;
  if (!ehSlugEmpresa(slug)) notFound();
  const empresa = EMPRESAS[slug];
  const faq = schemaFaq(empresa);

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
          ...(faq ? [faq] : []),
        ])}
      />
      <EmpresaLanding empresa={empresa} />
    </>
  );
}
