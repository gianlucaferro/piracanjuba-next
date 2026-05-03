import Link from "next/link";
import Image from "next/image";
import { Users, ArrowRight, Phone, Mail, Instagram } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { fetchVereadoresLista } from "@/lib/data/vereadores";

export const metadata = pageMetadata({
  title: "Vereadores de Piracanjuba GO",
  description:
    "Lista completa dos vereadores de Piracanjuba: partido, mandato, atuação parlamentar, contato e produção legislativa.",
  path: "/vereadores",
});

export const revalidate = 3600;

export default async function VereadoresPage() {
  const vereadores = await fetchVereadoresLista();

  return (
    <>
      <section className="bg-gradient-to-br from-primary/15 to-primary/5 border-b border-border">
        <div className="container py-10 md:py-14">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Vereadores de Piracanjuba
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            {vereadores.length} vereadores em mandato. Clique no nome para ver perfil
            completo, partido, atuação parlamentar, projetos e remuneração.
          </p>
        </div>
      </section>

      <div className="container py-8">
        {vereadores.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">
            Nenhum vereador cadastrado ainda.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {vereadores.map((v) => (
              <article key={v.id} className="stat-card flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex-shrink-0 ring-1 ring-border">
                    {v.foto_url ? (
                      <Image
                        src={v.foto_url}
                        alt={v.nome}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl text-muted-foreground">
                        {v.nome[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-foreground text-base truncate">{v.nome}</h2>
                    <p className="text-xs text-muted-foreground">
                      {v.partido || "Sem partido"}
                      {v.cargo_mesa && (
                        <span className="ml-2 text-primary">· {v.cargo_mesa}</span>
                      )}
                    </p>
                    {v.votos_eleicao && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {v.votos_eleicao.toLocaleString("pt-BR")} votos ({v.ano_eleicao})
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  {v.telefone && (
                    <a
                      href={`tel:${v.telefone}`}
                      className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary"
                    >
                      <Phone className="w-3 h-3" />
                      <span className="truncate max-w-[120px]">{v.telefone}</span>
                    </a>
                  )}
                  {v.email && (
                    <a
                      href={`mailto:${v.email}`}
                      className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary"
                    >
                      <Mail className="w-3 h-3" />
                      <span className="truncate max-w-[120px]">{v.email}</span>
                    </a>
                  )}
                  {v.instagram && (
                    <a
                      href={`https://instagram.com/${v.instagram.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary"
                    >
                      <Instagram className="w-3 h-3" />
                      {v.instagram.replace("@", "")}
                    </a>
                  )}
                </div>

                {v.slug && (
                  <Link
                    href={`/vereadores/${v.slug}`}
                    className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1 mt-auto pt-2 border-t border-border"
                  >
                    Ver perfil completo <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
