import {
  formatPeriodoCompleto,
  getShareWhatsAppLink,
  getTelefoneLink,
  getWazeLink,
  type Farmacia,
  type SemanaPlantao,
} from "@/data/plantaoFarmacias";

// Versão enxuta da semana, só com texto e links (sem foto nem ícones), para manter o
// HTML do calendário leve: o estilo das linhas e dos links fica no <ul>, não em cada item.
// Sem hooks: serve à página (servidor) e ao calendário (cliente).
export default function SemanaPlantaoResumo({
  semana,
  nextSemana,
  resolver,
  titulo,
  nivel = "h3",
  comoChegar = true,
}: {
  semana: SemanaPlantao;
  nextSemana?: SemanaPlantao;
  resolver: (farmacia: Farmacia) => Farmacia;
  titulo?: string;
  nivel?: "h2" | "h3";
  /** Link do Waze; dispensável nas semanas encerradas. */
  comoChegar?: boolean;
}) {
  const Titulo = nivel;

  return (
    <article
      id={semana.inicio}
      className="scroll-mt-24 space-y-2 rounded-lg border border-border p-4 target:border-amber-400 target:bg-amber-50/50 target:ring-2 target:ring-amber-400/30 dark:target:bg-amber-950/20"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Titulo className="text-sm font-semibold text-foreground">
          {titulo ?? formatPeriodoCompleto(semana, nextSemana)}
        </Titulo>
        <a
          href={getShareWhatsAppLink(semana, nextSemana)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-[#25D366] hover:underline"
        >
          Compartilhar
        </a>
      </div>
      {!semana.farmacia24h && (
        <p className="text-sm text-muted-foreground">
          Plantão de 24 horas não informado nesta escala.
        </p>
      )}
      <ul className="divide-y divide-border text-sm *:flex *:flex-wrap *:items-center *:gap-x-3 *:gap-y-0.5 *:py-1.5 [&_a]:text-primary [&_a:hover]:underline">
        {semana.farmacia24h && (
          <LinhaFarmacia farmacia={resolver(semana.farmacia24h)} is24h comoChegar={comoChegar} />
        )}
        {semana.demais.map((farmacia) => (
          <LinhaFarmacia key={farmacia.nome} farmacia={resolver(farmacia)} comoChegar={comoChegar} />
        ))}
      </ul>
    </article>
  );
}

function LinhaFarmacia({
  farmacia,
  is24h = false,
  comoChegar,
}: {
  farmacia: Farmacia;
  is24h?: boolean;
  comoChegar: boolean;
}) {
  const contato = getTelefoneLink(farmacia);
  const whatsapp = farmacia.tipo === "whatsapp";
  const waze = comoChegar ? getWazeLink(farmacia) : null;

  return (
    <li>
      <span className="font-medium text-foreground">{farmacia.nome}</span>
      {is24h && (
        <span className="rounded bg-orange-500/10 px-1.5 text-xs font-bold text-orange-600 dark:text-orange-400">
          24 horas
        </span>
      )}
      {contato ? (
        <a
          href={contato}
          target={whatsapp ? "_blank" : undefined}
          rel={whatsapp ? "noopener noreferrer" : undefined}
        >
          {whatsapp ? "WhatsApp" : "Telefone"} {farmacia.telefone}
        </a>
      ) : (
        <span className="text-muted-foreground">Telefone não informado</span>
      )}
      {waze && (
        <a
          href={waze}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Abrir ${farmacia.nome} no Waze`}
        >
          Waze
        </a>
      )}
    </li>
  );
}
