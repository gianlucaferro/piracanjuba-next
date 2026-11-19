import Link from "next/link";
import NextImage from "next/image";
import { Clock, MapPin, Package } from "lucide-react";
import { formatarReais, precoDaOferta, rotuloCategoria, type AnuncioPublico } from "./anuncio-publico";

function precoVisivel(anuncio: AnuncioPublico): string {
  const preco = precoDaOferta(anuncio);
  if (preco === 0) return "Gratuito";
  if (preco === null) return "Consulte";
  return anuncio.preco_tipo === "negociavel" ? `${formatarReais(preco)} (negociável)` : formatarReais(preco);
}

function dataPublicacao(iso: string | null): string | null {
  if (!iso) return null;
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return null;
  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
}

/**
 * Primeiro lote de anúncios renderizado no servidor, com link para cada anúncio.
 * Aparece no HTML inicial e enquanto a lista interativa (filtros, busca, favoritos)
 * carrega no cliente, que depois ocupa o lugar dele.
 */
export default function ListaAnunciosServidor({
  anuncios,
  total,
}: {
  anuncios: AnuncioPublico[];
  total: number;
}) {
  if (anuncios.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Nenhum anúncio publicado no momento.
      </p>
    );
  }
  return (
    <section aria-labelledby="anuncios-recentes" className="space-y-3">
      <h2 id="anuncios-recentes" className="text-base font-bold text-foreground">
        Anúncios recentes
        {total > anuncios.length && (
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({anuncios.length} de {total})
          </span>
        )}
      </h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {anuncios.map((a) => {
          const foto = a.fotos?.[0];
          const data = dataPublicacao(a.created_at);
          return (
            <li key={a.id}>
              <article className="stat-card flex gap-3 h-full">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                  {foto ? (
                    <NextImage
                      unoptimized
                      width={80}
                      height={80}
                      src={foto}
                      alt={a.titulo}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <Package className="w-6 h-6 text-muted-foreground/50" />
                  )}
                </div>
                <div className="min-w-0 space-y-1">
                  <h3 className="text-sm font-semibold text-foreground leading-snug">
                    <Link href={`/compra-e-venda/${a.id}`} className="hover:text-primary hover:underline">
                      {a.titulo}
                    </Link>
                  </h3>
                  <p className="text-base font-bold text-primary">{precoVisivel(a)}</p>
                  <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span>{rotuloCategoria(a.categoria)}</span>
                    {a.status === "vendido" && <span className="font-semibold text-blue-700">Vendido</span>}
                    {a.bairro && (
                      <span className="inline-flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" /> {a.bairro}
                      </span>
                    )}
                    {data && (
                      <span className="inline-flex items-center gap-0.5">
                        <Clock className="w-3 h-3" /> {data}
                      </span>
                    )}
                  </p>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
