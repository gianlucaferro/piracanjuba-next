import { Package } from "lucide-react";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { fetchAnunciosLista } from "@/lib/data/classificados";
import ClassificadosClient from "@/components/classificados/ClassificadosWrapper";
import ListaAnunciosServidor from "@/components/classificados/ListaAnunciosServidor";
import { CHAVE_LISTA_ANUNCIOS } from "@/components/classificados/buscar-anuncios";
import {
  anuncioPublico,
  dataLocal,
  fraseRespostaAnuncios,
  listaAnunciosJsonLd,
  resumirAnuncios,
  serializarJsonLd,
} from "@/components/classificados/anuncio-publico";

export const metadata = pageMetadata({
  title: "Compra e Venda PBA: classificados grátis em Piracanjuba GO",
  description:
    "Anuncie e compre em Piracanjuba: imóveis, veículos, agro, eletrônicos, serviços. Anúncios gratuitos com WhatsApp e fotos.",
  path: "/compra-e-venda",
});

export const revalidate = 60;

/** Mesmo PAGE_SIZE da lista do cliente. */
const PRIMEIRO_LOTE = 20;
/**
 * Acima disso a lista inteira não vai para o HTML (meta de cerca de 500 KB por
 * página): o servidor mostra só o primeiro lote e o cliente busca o resto, como
 * antes. A hidratação usa a lista completa porque a query key é a da lista toda.
 */
const LIMITE_HIDRATACAO = 60;

export default async function ComprarEVendaPage() {
  const anuncios = await fetchAnunciosLista();
  const agora = new Date();
  const publicos = anuncios ? anuncios.filter((a) => anuncioPublico(a, agora)) : null;
  const lote = publicos ? publicos.slice(0, PRIMEIRO_LOTE) : [];
  const resposta = publicos ? fraseRespostaAnuncios(resumirAnuncios(publicos, agora), dataLocal(agora)) : null;

  const queryClient = new QueryClient();
  if (anuncios && anuncios.length <= LIMITE_HIDRATACAO) {
    queryClient.setQueryData(CHAVE_LISTA_ANUNCIOS, anuncios);
  }

  const cabecalho = (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Package className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold text-foreground">
          Compra e Venda <span className="text-[#25D366]">PBA</span>
        </h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Compre, venda e anuncie grátis em Piracanjuba.
      </p>
      {resposta && <p className="text-sm text-foreground mt-2 max-w-3xl">{resposta}</p>}
    </div>
  );

  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Início", path: "/" },
      { name: "Compra e Venda", path: "/compra-e-venda" },
    ]),
    ...(lote.length > 0 ? [listaAnunciosJsonLd(lote)] : []),
  ];

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {jsonLd.map((dado, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializarJsonLd(dado) }}
        />
      ))}
      <ClassificadosClient
        cabecalho={cabecalho}
        listaServidor={
          publicos ? <ListaAnunciosServidor anuncios={lote} total={publicos.length} /> : undefined
        }
      />
    </HydrationBoundary>
  );
}
