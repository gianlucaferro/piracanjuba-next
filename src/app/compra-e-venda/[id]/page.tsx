import { notFound } from "next/navigation";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { fetchAnuncioPublicoPorId } from "@/lib/data/classificados";
import AnuncioDetalheClient from "@/components/classificados/AnuncioDetalheWrapper";
import {
  anuncioPublico,
  produtoJsonLd,
  rotuloCategoria,
  serializarJsonLd,
} from "@/components/classificados/anuncio-publico";

export const revalidate = 60;

// Anúncio inexistente, removido, em análise ou expirado responde 404 (nunca uma
// página vazia indexável). Ativo e vendido são públicos; o vendido sai com SoldOut.
async function anuncioDaPagina(id: string) {
  const anuncio = await fetchAnuncioPublicoPorId(id);
  if (!anuncio || !anuncioPublico(anuncio, new Date())) return null;
  return anuncio;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const anuncio = await anuncioDaPagina(id);
  if (!anuncio) {
    return pageMetadata({
      title: "Anúncio não encontrado, Compra e Venda PBA",
      description: "Este anúncio não foi encontrado ou já expirou.",
      path: `/compra-e-venda/${id}`,
      noIndex: true,
    });
  }
  const preco =
    anuncio.preco != null
      ? ` por ${Number(anuncio.preco).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
      : "";
  return pageMetadata({
    title: `${anuncio.titulo}${preco}, Compra e Venda Piracanjuba`,
    description:
      anuncio.descricao?.slice(0, 160) ||
      `Anúncio em Piracanjuba na categoria ${rotuloCategoria(anuncio.categoria)}.`,
    path: `/compra-e-venda/${id}`,
    image: anuncio.fotos?.[0] || undefined,
  });
}

export default async function AnuncioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const anuncio = await anuncioDaPagina(id);
  if (!anuncio) notFound();

  const jsonLd = [
    produtoJsonLd(anuncio),
    breadcrumbJsonLd([
      { name: "Início", path: "/" },
      { name: "Compra e Venda", path: "/compra-e-venda" },
      { name: anuncio.titulo, path: `/compra-e-venda/${anuncio.id}` },
    ]),
  ];

  return (
    <>
      {jsonLd.map((dado, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializarJsonLd(dado) }}
        />
      ))}
      <AnuncioDetalheClient initialAnuncio={anuncio} />
    </>
  );
}
