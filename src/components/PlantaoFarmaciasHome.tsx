import Link from "next/link";
import Image from "next/image";
import { Pill, Phone, ArrowRight } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { PLANTAO_FARMACIAS, type SemanaPlantao } from "@/data/plantaoFarmacias";
import { fetchFarmaciasMeta } from "@/lib/data/listings";

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

export default async function PlantaoFarmaciasHome() {
  const semana = getCurrentWeek();
  if (!semana) return null;
  const fotos = await fetchFarmaciasMeta();
  const fotoBy = new Map(fotos.map((f) => [normalize(f.nome), f.foto_url]));
  const f24 = semana.farmacia24h;
  const foto = fotoBy.get(normalize(f24.nome));
  const isWA = f24.tipo === "whatsapp";
  const phoneClean = f24.telefone.replace(/\D/g, "");

  return (
    <section aria-labelledby="heading-plantao">
      <h2
        id="heading-plantao"
        className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4"
      >
        <Pill className="w-5 h-5 text-orange-500" />
        Farmácia 24h esta semana
      </h2>
      <div className="stat-card border-orange-500/30 bg-orange-500/5 flex items-center gap-3">
        {foto ? (
          <Image
            src={foto}
            alt={f24.nome}
            width={56}
            height={56}
            className="w-14 h-14 rounded-xl object-cover shrink-0 ring-1 ring-border"
            unoptimized
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
            <Pill className="w-6 h-6 text-orange-500" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-foreground">{f24.nome}</p>
          <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
            {isWA ? <WhatsAppIcon className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
            {f24.telefone}
          </p>
        </div>
        <div className="flex flex-col gap-1 items-end shrink-0">
          <a
            href={isWA ? `https://wa.me/55${phoneClean}` : `tel:${phoneClean}`}
            target={isWA ? "_blank" : undefined}
            rel={isWA ? "noopener noreferrer" : undefined}
            className="text-xs font-medium text-[#25D366] hover:underline inline-flex items-center gap-1"
          >
            {isWA ? "WhatsApp" : "Ligar"}
          </a>
          <Link
            href="/plantao-farmacias"
            className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
          >
            Ver escala <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </section>
  );
}
