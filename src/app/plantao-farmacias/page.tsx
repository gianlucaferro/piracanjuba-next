import Link from "next/link";
import { connection } from "next/server";
import { ArrowLeft, Pill, Share2 } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { fetchFarmaciasMeta } from "@/lib/data/listings";
import {
  PLANTAO_FARMACIAS,
  aplicarContatoCadastrado,
  criarBuscaPorNome,
  descreverPlantao,
  formatPeriodoCompleto,
  formatPeriodoEscala,
  getShareWhatsAppLink,
  organizarEscala,
  type Farmacia,
  type SemanaPlantao,
} from "@/data/plantaoFarmacias";
import PlantaoFarmaciasClient from "./PlantaoFarmaciasClient";
import SemanaPlantaoResumo from "./SemanaPlantaoResumo";
import { FarmaciaPlantaoCard, type FarmaciaMeta } from "@/components/FarmaciaPlantaoCard";

export const metadata = pageMetadata({
  title: "Farmácias de Plantão em Piracanjuba GO",
  description:
    "Calendário completo de plantão das farmácias de Piracanjuba: quem está aberta 24 horas, telefones, WhatsApp e como chegar pelo Waze.",
  path: "/plantao-farmacias",
});

// Sem `revalidate`: a página é renderizada a cada requisição (await connection() no
// início do componente). Como ISR de 1 hora, o primeiro visitante depois da virada
// de sábado à meia-noite recebia a semana anterior, com a farmácia 24 horas errada.
// Só o cadastro das farmácias (fetchFarmaciasMeta) continua em cache.

// Cópia integral do PDF da escala, versionada no repositório público do site
// (docs/fontes/plantao-farmacias/README.md traz a transcrição e o SHA-256).
const PDF_ESCALA =
  "https://github.com/gianlucaferro/piracanjuba-next/blob/main/docs/fontes/plantao-farmacias/escala-2026-2027-atualizada-2026-09-07.pdf";

function normalizeFarmaciaMeta(meta: {
  nome: string | null;
  foto_url: string | null;
  telefone: string | null;
  tipo_telefone: string | null;
}): FarmaciaMeta | null {
  if (!meta.nome) return null;

  return {
    nome: meta.nome,
    foto_url: meta.foto_url || null,
    telefone: meta.telefone || null,
    tipo_telefone:
      meta.tipo_telefone === "whatsapp" || meta.tipo_telefone === "fixo"
        ? meta.tipo_telefone
        : null,
  };
}

function SchemaMarkup({
  semana,
  nextSemana,
  resolver,
}: {
  semana: SemanaPlantao;
  nextSemana?: SemanaPlantao;
  resolver: (farmacia: Farmacia) => Farmacia;
}) {
  const allFarmacias = [semana.farmacia24h, ...semana.demais]
    .filter((farmacia): farmacia is Farmacia => farmacia !== null)
    .map(resolver);

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Plantão de Farmácias em Piracanjuba",
    description: `Farmácias de plantão em Piracanjuba, GO, de ${formatPeriodoCompleto(semana, nextSemana)}`,
    url: "https://piracanjuba.ai/plantao-farmacias",
    itemListElement: allFarmacias.map((farmacia, position) => {
      const digits = farmacia.telefone.replace(/\D/g, "");
      const nationalNumber = /^55\d{10,11}$/.test(digits) ? digits.slice(2) : digits;
      const telephone = /^\d{10,11}$/.test(nationalNumber) ? `+55${nationalNumber}` : null;

      return {
        "@type": "ListItem",
        position: position + 1,
        item: {
          "@type": "Pharmacy",
          name: farmacia.nome,
          ...(telephone ? { telephone } : {}),
          address: {
            "@type": "PostalAddress",
            addressLocality: "Piracanjuba",
            addressRegion: "GO",
            addressCountry: "BR",
          },
        },
      };
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}
    />
  );
}

export default async function PlantaoFarmaciasPage() {
  // A semana vigente depende do relógio de Brasília: decide-se na requisição, nunca no
  // prerender (next/server connection, docs 03-api-reference/04-functions/connection.md).
  await connection();
  const escala = organizarEscala();
  const fotosMeta = (await fetchFarmaciasMeta())
    .map(normalizeFarmaciaMeta)
    .filter((meta): meta is FarmaciaMeta => Boolean(meta));

  const getMeta = criarBuscaPorNome(fotosMeta);
  const resolver = (farmacia: Farmacia) => aplicarContatoCadastrado(farmacia, getMeta(farmacia.nome));
  // O calendário (cliente) só precisa do contato cadastrado, não da foto.
  const contatos = fotosMeta.map(({ nome, telefone, tipo_telefone }) => ({ nome, telefone, tipo_telefone }));

  const semana = escala.atual === null ? null : PLANTAO_FARMACIAS[escala.atual];
  const semanaSeguinte = escala.atual === null ? undefined : PLANTAO_FARMACIAS[escala.atual + 1];
  const proxima = escala.proxima === null ? null : PLANTAO_FARMACIAS[escala.proxima];

  return (
    <>
      {semana && <SchemaMarkup semana={semana} nextSemana={semanaSeguinte} resolver={resolver} />}
      <div className="container py-6 space-y-6">
        <div>
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <div className="mb-1 flex items-center gap-2">
            <Pill className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">
              Farmácias de plantão em Piracanjuba
            </h1>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Escala semanal das farmácias de plantão em Piracanjuba (GO), com a farmácia 24 horas,
            telefones, WhatsApp e como chegar pelo Waze. Primeiro vêm a semana atual e a próxima;
            depois, as semanas seguintes e, no fim, as anteriores.
          </p>
        </div>

        <section aria-labelledby="titulo-semana-atual" className="space-y-4">
          {semana ? (
            <article
              id={semana.inicio}
              className="scroll-mt-24 space-y-3 rounded-lg border border-primary bg-primary/5 p-4 ring-2 ring-primary/20"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="titulo-semana-atual" className="text-lg font-semibold text-foreground">
                  Plantão desta semana: {formatPeriodoCompleto(semana, semanaSeguinte)}
                </h2>
                <a
                  href={getShareWhatsAppLink(semana, semanaSeguinte)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-[#25D366]/10 px-2 py-0.5 text-sm font-medium text-[#25D366] transition-colors hover:bg-[#25D366]/20"
                  title="Compartilhar no WhatsApp"
                >
                  <Share2 className="h-3 w-3" /> Compartilhar
                </a>
              </div>
              <p className="text-sm text-foreground">{descreverPlantao(semana, semanaSeguinte, resolver)}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {semana.farmacia24h && (
                  <FarmaciaPlantaoCard
                    farmacia={semana.farmacia24h}
                    meta={getMeta(semana.farmacia24h.nome)}
                    is24h
                  />
                )}
                {semana.demais.map((farmacia) => (
                  <FarmaciaPlantaoCard
                    key={farmacia.nome}
                    farmacia={farmacia}
                    meta={getMeta(farmacia.nome)}
                  />
                ))}
              </div>
            </article>
          ) : (
            <div className="space-y-1 rounded-lg border border-border p-4">
              <h2 id="titulo-semana-atual" className="text-lg font-semibold text-foreground">
                Plantão desta semana
              </h2>
              <p className="text-sm text-muted-foreground">
                A escala publicada cobre de {formatPeriodoEscala(0, PLANTAO_FARMACIAS.length - 1)} e
                não inclui a data de hoje. Confirme o plantão diretamente com as farmácias.
              </p>
            </div>
          )}

          {proxima && escala.proxima !== null && (
            <SemanaPlantaoResumo
              semana={proxima}
              nextSemana={PLANTAO_FARMACIAS[escala.proxima + 1]}
              resolver={resolver}
              nivel="h2"
              titulo={`Próxima semana: ${formatPeriodoCompleto(proxima, PLANTAO_FARMACIAS[escala.proxima + 1])}`}
            />
          )}

          <p className="text-sm text-muted-foreground">
            Fonte: Escala de Plantão das Farmácias - Piracanjuba / GO - 2026/2027 (
            <a
              href={PDF_ESCALA}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              PDF da escala
            </a>
            ). Cada semana da escala começa no sábado.
          </p>
        </section>

        <PlantaoFarmaciasClient
          futuras={escala.futuras}
          anteriores={escala.anteriores}
          contatos={contatos}
        />
      </div>
    </>
  );
}
