import { Users } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { fetchVereadoresLista } from "@/lib/data/vereadores";
import { FONTES_CAMARA } from "@/lib/fontes-oficiais";
import VereadoresClient from "./VereadoresClient";
import { descreverSubsidio } from "./remuneracao";
import { fetchSubsidioAtualVereadores } from "./subsidio-atual";

export const metadata = pageMetadata({
  title: "Vereadores de Piracanjuba GO",
  description:
    "Lista completa dos vereadores de Piracanjuba: partido, mandato, atuação parlamentar, contato e produção legislativa.",
  path: "/vereadores",
});

export const revalidate = 3600;

export default async function VereadoresPage() {
  const [vereadores, subsidio] = await Promise.all([
    fetchVereadoresLista(),
    fetchSubsidioAtualVereadores(),
  ]);

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
          {subsidio && (
            <p className="mt-3 text-foreground max-w-2xl">
              O subsídio mensal de um vereador de Piracanjuba{" "}
              <strong>{descreverSubsidio(subsidio)}</strong> (competência {subsidio.competencia}),
              segundo a{" "}
              <a
                href={FONTES_CAMARA.folhas}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                folha de pagamento da Câmara Municipal
              </a>
              .
            </p>
          )}
        </div>
      </section>

      <div className="container py-8">
        <VereadoresClient vereadores={vereadores} />
      </div>
    </>
  );
}
