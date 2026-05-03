import Image from "next/image";
import { Pill, Phone, Star } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { pageMetadata } from "@/lib/seo";
import { fetchFarmaciasMeta } from "@/lib/data/listings";
import { PLANTAO_FARMACIAS, type SemanaPlantao } from "@/data/plantaoFarmacias";

export const metadata = pageMetadata({
  title: "Farmácias de Plantão em Piracanjuba GO",
  description:
    "Escala de plantão das farmácias de Piracanjuba: quem está aberta esta semana 24 horas, telefones e fotos.",
  path: "/plantao-farmacias",
});

export const revalidate = 3600;

function getCurrentWeek(): SemanaPlantao | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let current: SemanaPlantao | null = null;
  for (const semana of PLANTAO_FARMACIAS) {
    const inicio = new Date(semana.inicio + "T00:00:00");
    if (inicio <= today) current = semana;
    else break;
  }
  return current;
}

function normalize(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default async function PlantaoFarmaciasPage() {
  const semana = getCurrentWeek();
  const fotosMeta = await fetchFarmaciasMeta();
  const fotoBy = new Map(fotosMeta.map((f) => [normalize(f.nome), f]));

  const findFoto = (nome: string) => {
    const slug = normalize(nome);
    return fotoBy.get(slug) || fotoBy.get(slug.replace("drogaria-", ""));
  };

  return (
    <>
      <section className="bg-gradient-to-br from-orange-500/15 to-orange-500/5 border-b border-border">
        <div className="container py-10 md:py-14">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Pill className="w-8 h-8 text-orange-500" />
            Farmácias de Plantão
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Escala oficial das farmácias de Piracanjuba, GO. A escala muda toda semana
            (sábado para sábado).
          </p>
        </div>
      </section>

      <div className="container py-8 space-y-10">
        {!semana ? (
          <p className="text-muted-foreground text-center py-12">
            Escala não disponível para hoje.
          </p>
        ) : (
          <>
            {/* 24h em destaque */}
            <section>
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1">
                <Star className="w-4 h-4 text-orange-500 fill-orange-500" />
                Esta semana — 24 horas
              </h2>
              <FarmaciaCard
                farmacia={semana.farmacia24h}
                foto={findFoto(semana.farmacia24h.nome)?.foto_url ?? null}
                destaque
              />
            </section>

            {/* Demais farmácias */}
            <section>
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                Outras farmácias de plantão
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {semana.demais.map((f) => (
                  <FarmaciaCard
                    key={f.nome}
                    farmacia={f}
                    foto={findFoto(f.nome)?.foto_url ?? null}
                  />
                ))}
              </div>
            </section>

            <p className="text-xs text-muted-foreground pt-6 border-t border-border">
              Escala válida a partir de{" "}
              <span className="text-foreground">
                {new Date(semana.inicio + "T00:00:00").toLocaleDateString("pt-BR")}
              </span>
              . Fonte: Sindfarma Goiás.
            </p>
          </>
        )}
      </div>
    </>
  );
}

function FarmaciaCard({
  farmacia,
  foto,
  destaque = false,
}: {
  farmacia: { nome: string; telefone: string; tipo: "whatsapp" | "fixo" };
  foto: string | null;
  destaque?: boolean;
}) {
  const telefoneClean = farmacia.telefone.replace(/\D/g, "");
  const isWA = farmacia.tipo === "whatsapp";
  const href = isWA ? `https://wa.me/55${telefoneClean}` : `tel:${telefoneClean}`;

  return (
    <a
      href={href}
      target={isWA ? "_blank" : undefined}
      rel={isWA ? "noopener noreferrer" : undefined}
      className={`stat-card card-hover flex items-center gap-3 group ${
        destaque ? "border-orange-500/40 bg-orange-500/5" : ""
      }`}
    >
      {foto ? (
        <Image
          src={foto}
          alt={farmacia.nome}
          width={64}
          height={64}
          className="w-16 h-16 rounded-xl object-cover ring-1 ring-border shrink-0"
          unoptimized
        />
      ) : (
        <div className="w-16 h-16 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
          <Pill className="w-7 h-7 text-orange-500" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className={`font-semibold ${destaque ? "text-lg" : "text-sm"} text-foreground`}>
          {farmacia.nome}
        </h3>
        <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5">
          {isWA ? <WhatsAppIcon className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
          {farmacia.telefone}
        </p>
      </div>
    </a>
  );
}
