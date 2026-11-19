import { Package } from "lucide-react";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { fetchAnunciosLista } from "@/lib/data/classificados";
import ClassificadosClient from "@/components/classificados/ClassificadosWrapper";
import ListaAnunciosServidor from "@/components/classificados/ListaAnunciosServidor";
import RespostaAnuncios from "@/components/classificados/RespostaAnuncios";
import { CHAVE_LISTA_ANUNCIOS } from "@/components/classificados/buscar-anuncios";
import {
  anuncioPublico,
  listaAnunciosJsonLd,
  respostaDaLista,
  serializarJsonLd,
} from "@/components/classificados/anuncio-publico";

// Título de até 60 caracteres com o sufixo do layout ("Compra e Venda PBA" segue no H1 e
// abre a description); description de 120 a 160 (tests/classificados-seo.test.ts).
export const metadata = pageMetadata({
  title: "Classificados grátis em Piracanjuba GO",
  description:
    "Compra e Venda PBA: anuncie e compre em Piracanjuba. Imóveis, veículos, agro, eletrônicos e serviços, com anúncios gratuitos, WhatsApp e fotos.",
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
  const resposta = publicos ? respostaDaLista(publicos, agora) : null;

  // A hidratação leva a mesma lista filtrada que o HTML mostra: o cache do servidor pode
  // guardar por até 60 segundos um anúncio que venceu depois de lido.
  const queryClient = new QueryClient();
  if (publicos && publicos.length <= LIMITE_HIDRATACAO) {
    queryClient.setQueryData(CHAVE_LISTA_ANUNCIOS, publicos);
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
      {/* Frase do servidor no HTML; no navegador, recalculada da lista atual. */}
      <RespostaAnuncios inicial={resposta} />
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
