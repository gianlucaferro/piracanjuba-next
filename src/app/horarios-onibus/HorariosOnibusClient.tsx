"use client";

import { useEffect, useState } from "react";
import {
  Archive,
  ArrowRight,
  ArrowUpRight,
  BusFront,
  CalendarDays,
  CalendarSearch,
  ChevronDown,
  Clock3,
  Info,
  MapPin,
  Phone,
  Route,
} from "lucide-react";
import {
  BUS_CHECKED_AT,
  BUS_DESTINATIONS,
  BUS_OPERATORS,
  BUS_SNAPSHOT_DATE,
  getBrazilDate,
  getBusDepartures,
  getBusSearchUrl,
  getInitialBusDate,
  isBusDate,
  isBusDeparturePast,
  type BusDeparture,
} from "@/data/horariosOnibus";

const controlClassName =
  "h-12 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20";
const externalLinkClassName =
  "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours > 0 ? `${hours}h` : "", rest > 0 ? `${rest}min` : ""]
    .filter(Boolean)
    .join(" ");
}

function formatPhone(number: string) {
  if (number.startsWith("0800")) {
    return number.replace(/^(0800)(\d{3})(\d{4})$/, "$1 $2 $3");
  }
  return number.replace(/^(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3");
}

function DepartureCard({
  departure,
  now,
}: {
  departure: BusDeparture;
  now: Date;
}) {
  const destination = BUS_DESTINATIONS.find((item) => item.id === departure.destinationId);
  const operator = BUS_OPERATORS.find((item) => item.id === departure.operatorId);
  const isPast = isBusDeparturePast(departure, now);
  const isArchived = departure.date < getBrazilDate(now);
  const searchUrl = getBusSearchUrl(departure.destinationId, departure.date);

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <BusFront className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            {operator?.name ?? departure.operatorId}
          </div>
          {isPast && (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {isArchived ? "Consulta arquivada" : "Horário já passado"}
            </span>
          )}
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-x-3 sm:gap-x-6">
          <div className="min-w-0">
            <p className="mb-1 text-xs text-muted-foreground">Saída</p>
            <time
              dateTime={`${departure.date}T${departure.departure}:00-03:00`}
              className="text-3xl font-bold tracking-tight text-foreground tabular-nums"
            >
              {departure.departure}
            </time>
            <p className="mt-1 text-sm font-medium text-foreground">Piracanjuba, GO</p>
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">{departure.date}</p>
          </div>
          <div className="flex flex-col items-center gap-1.5 pt-7 text-muted-foreground">
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
            <span className="whitespace-nowrap text-xs">{formatDuration(departure.durationMinutes)}</span>
          </div>
          <div className="min-w-0 text-right">
            <p className="mb-1 text-xs text-muted-foreground">Chegada prevista</p>
            <time
              dateTime={`${departure.arrivalDate}T${departure.arrival}:00-03:00`}
              className="text-3xl font-bold tracking-tight text-foreground tabular-nums"
            >
              {departure.arrival}
            </time>
            <h3 className="mt-1 text-sm font-semibold text-foreground">
              {destination ? `${destination.name}, ${destination.state}` : departure.destinationId}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">{departure.arrivalDate}</p>
          </div>
        </div>

        {!!departure.connections?.length && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            Troca de ônibus em {departure.connections.map((connection) => connection.city).join(", ")}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {departure.serviceClasses.map((serviceClass) => (
            <span key={serviceClass} className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
              {serviceClass}
            </span>
          ))}
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-background p-3 text-sm">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">{departure.boarding.name}</p>
            {departure.boarding.address && (
              <p className="leading-relaxed text-muted-foreground">{departure.boarding.address}</p>
            )}
            <p className="text-xs leading-relaxed text-muted-foreground">
              {departure.boarding.verified
                ? "Ponto informado no itinerário consultado. Confira no bilhete antes de embarcar."
                : "Confirme com a empresa o endereço exato de embarque desta viagem."}
            </p>
          </div>
        </div>

        {departure.alighting && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Desembarque: {departure.alighting.name}.</span>{" "}
            {departure.alighting.address}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Consultado em <time dateTime={departure.checkedAt} className="tabular-nums">{departure.checkedAt}</time>
          </p>
          {searchUrl && !isPast && (
            <a href={searchUrl} target="_blank" rel="noopener noreferrer" className={`${externalLinkClassName} bg-primary text-primary-foreground hover:bg-primary/90`}>
              Conferir na ClickBus
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">, {destination?.name}, {departure.date}, abre em nova aba</span>
            </a>
          )}
        </div>
      </div>

      <details className="group border-t border-border">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5 [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2"><Route className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Itinerário e fontes</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="space-y-4 px-4 pb-5 pt-1 sm:px-5">
          <ol className="space-y-3 border-l border-border pl-4 text-sm">
            <li className="relative flex flex-wrap justify-between gap-2 before:absolute before:-left-[21px] before:top-1.5 before:h-2 before:w-2 before:rounded-full before:bg-primary">
              <span className="text-foreground">Embarque em Piracanjuba</span>
              <span className="font-medium tabular-nums">{departure.departure}</span>
            </li>
            {departure.stops.map((stop, index) => (
              <li key={`${stop.name}-${index}`} className="flex flex-wrap justify-between gap-2 text-muted-foreground">
                <span>{stop.name}</span><span className="tabular-nums">{stop.time}</span>
              </li>
            ))}
            <li className="relative flex flex-wrap justify-between gap-2 before:absolute before:-left-[21px] before:top-1.5 before:h-2 before:w-2 before:rounded-full before:bg-primary">
              <span className="text-foreground">{destination?.name ?? departure.destinationId}</span>
              <span className="font-medium tabular-nums">{departure.arrival} ({departure.arrivalDate})</span>
            </li>
          </ol>
          {departure.connections?.map((connection) => (
            <div key={`${connection.city}-${connection.departure}`} className="rounded-lg bg-muted p-3 text-sm leading-relaxed text-foreground">
              <p className="font-semibold">Troca de ônibus em {connection.city}</p>
              <p>Chegada às {connection.arrival}. Nova saída às {connection.departure}, com {connection.operator}.</p>
              <p className="mt-1 text-xs text-muted-foreground">Confira os dois trechos e o local da conexão antes de comprar.</p>
            </div>
          ))}
          {departure.stops.length === 0 && !departure.connections?.length && (
            <p className="text-xs leading-relaxed text-muted-foreground">As paradas intermediárias não foram registradas nesta consulta.</p>
          )}
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-xs font-semibold text-foreground">Fontes da consulta para {departure.date}</p>
            <div className="flex flex-wrap gap-2">
              {departure.sources.map((source) => (
                <a key={`${source.name}-${source.url}`} href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {source.name}<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sr-only">, abre em nova aba</span>
                </a>
              ))}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">Os horários e a disponibilidade podem mudar depois da consulta. O link abre a busca no canal de venda.</p>
          </div>
        </div>
      </details>
    </article>
  );
}

function ExternalSearch({ date, destinationId }: { date: string; destinationId: string }) {
  const destinations = BUS_DESTINATIONS.filter((item) => destinationId === "all" || item.id === destinationId);
  if (!isBusDate(date)) return null;

  return (
    <section aria-labelledby="bus-search-heading" className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <h2 id="bus-search-heading" className="text-base font-semibold text-foreground">Conferir nos canais de consulta</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        As buscas abaixo saem de Piracanjuba e levam a data {date}. Confirme o ponto de embarque e a empresa nos detalhes da viagem.
      </p>
      <div className="mt-4 divide-y divide-border">
        {destinations.map((destination) => {
          const clickbusUrl = getBusSearchUrl(destination.id, date);
          const mobifacilUrl = getBusSearchUrl(destination.id, date, "mobifacil");
          return (
            <div key={destination.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
              <p className="text-sm font-semibold text-foreground">{destination.name}, {destination.state}</p>
              <div className="flex flex-wrap gap-2">
                {clickbusUrl && <a href={clickbusUrl} target="_blank" rel="noopener noreferrer" className={`${externalLinkClassName} bg-primary/5 text-primary hover:bg-primary/10`}>ClickBus<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /><span className="sr-only">: Piracanjuba a {destination.name} em {date}, nova aba</span></a>}
                {mobifacilUrl && <a href={mobifacilUrl} target="_blank" rel="noopener noreferrer" className={`${externalLinkClassName} border border-border text-foreground hover:bg-muted`}>Mobifácil<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /><span className="sr-only">: Piracanjuba a {destination.name} em {date}, nova aba</span></a>}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Mobifácil é o canal de venda indicado pela Expresso União. A ClickBus reúne ofertas de diferentes empresas. Uma busca pode não trazer todas as opções.</p>
    </section>
  );
}

function BoardingAndContacts() {
  return (
    <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
      <section aria-labelledby="bus-boarding-heading" className="rounded-xl border border-border bg-card p-5">
        <h2 id="bus-boarding-heading" className="flex items-center gap-2 text-base font-semibold text-foreground"><MapPin className="h-5 w-5 text-primary" aria-hidden="true" /> Onde embarcar</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">O ponto exato depende da viagem. Confira o endereço no itinerário ou no bilhete, inclusive se a opção menciona terminal, trevo ou posto.</p>
        <div className="mt-4 space-y-2 rounded-lg bg-background p-3">
          <p className="text-sm font-semibold text-foreground">Guichê Guanabara / Real Expresso</p>
          <p className="text-sm text-muted-foreground">Rua Cônego Olinto, s/n, Piracanjuba.</p>
          <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground"><Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> Atendimento das 08:00 às 18:00, todos os dias.</p>
          <p className="text-xs leading-relaxed text-muted-foreground">Esse é o horário do guichê. A saída do ônibus aparece em cada viagem.</p>
          <a href="https://viajeguanabara.com.br/horarios-e-guiches/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-primary hover:underline">Conferir no site da Guanabara<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /><span className="sr-only">, abre em nova aba</span></a>
        </div>
      </section>

      <section aria-labelledby="bus-contacts-heading" className="rounded-xl border border-border bg-card p-5">
        <h2 id="bus-contacts-heading" className="flex items-center gap-2 text-base font-semibold text-foreground"><Phone className="h-5 w-5 text-primary" aria-hidden="true" /> Fale com a empresa</h2>
        <div className="mt-4 space-y-4">
          {BUS_OPERATORS.map((operator) => (
            <div key={operator.id} className="space-y-2 border-b border-border pb-4 last:border-0 last:pb-0">
              <h3 className="text-sm font-semibold text-foreground">{operator.name}</h3>
              {operator.phones.map((phone) => (
                <a key={phone.number} href={`tel:${phone.number.startsWith("0800") ? phone.number : `+55${phone.number}`}`} className="flex min-h-10 items-center justify-between gap-2 rounded-lg bg-background px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted">
                  <span><span className="block text-xs text-muted-foreground">{phone.label}</span><span className="font-medium tabular-nums">{formatPhone(phone.number)}</span></span>
                  <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                </a>
              ))}
              {operator.note && <p className="text-xs leading-relaxed text-muted-foreground">{operator.note}</p>}
              {!operator.website.includes("clickbus.com.br") && (
                <a href={operator.website} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-primary hover:underline">Site da {operator.name}<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /><span className="sr-only">, abre em nova aba</span></a>
              )}
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}

export default function HorariosOnibusClient({ serverNow }: { serverNow: string }) {
  const [now, setNow] = useState(() => new Date(serverNow));
  const [dateInput, setDateInput] = useState(() => getInitialBusDate(new Date(serverNow)));
  const [dateWasSelected, setDateWasSelected] = useState(false);
  const [destinationId, setDestinationId] = useState("all");
  const [operatorId, setOperatorId] = useState("all");

  useEffect(() => {
    const updateNow = () => setNow(new Date());
    const initial = window.setTimeout(updateNow, 0);
    const interval = window.setInterval(updateNow, 60_000);
    document.addEventListener("visibilitychange", updateNow);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", updateNow);
    };
  }, []);

  const selectedDate = dateWasSelected ? dateInput : getInitialBusDate(now);
  const validDate = isBusDate(selectedDate);
  const archived = validDate && selectedDate < getBrazilDate(now);
  const departures = getBusDepartures(selectedDate, destinationId, operatorId);
  const allOperatorsDepartures = getBusDepartures(selectedDate, destinationId);
  const hasOtherOperators = departures.length === 0 && allOperatorsDepartures.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/5 p-4 text-sm">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <p className="leading-relaxed text-foreground">
          Consulta feita em <strong className="font-semibold">{BUS_CHECKED_AT}</strong>, com horários verificados para <strong className="font-semibold">{BUS_SNAPSHOT_DATE}</strong>.
          {" "}Esta seleção pode mudar e não reúne todas as saídas. Confirme a viagem com a empresa antes de sair.
        </p>
      </div>

      <section aria-labelledby="bus-filters-heading" className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 id="bus-filters-heading" className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground"><CalendarSearch className="h-5 w-5 text-primary" aria-hidden="true" /> Planeje sua saída</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <label htmlFor="bus-destination" className="block text-sm font-medium text-foreground">Destino</label>
            <select id="bus-destination" value={destinationId} onChange={(event) => setDestinationId(event.target.value)} className={controlClassName}>
              <option value="all">Todos os destinos</option>
              {BUS_DESTINATIONS.map((destination) => <option key={destination.id} value={destination.id}>{destination.name}, {destination.state}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="bus-date" className="block text-sm font-medium text-foreground">Data da viagem</label>
            <input id="bus-date" type="date" max="9999-12-31" aria-describedby="bus-date-help" aria-invalid={!validDate} value={selectedDate} onInput={(event) => { setDateWasSelected(true); setDateInput(event.currentTarget.value); }} className={controlClassName} />
            <p id="bus-date-help" className={`text-xs ${validDate ? "text-muted-foreground" : "text-destructive"}`}>{validDate ? `Data selecionada: ${selectedDate}` : "Selecione uma data válida no calendário."}</p>
          </div>
          <div className="space-y-2">
            <label htmlFor="bus-operator" className="block text-sm font-medium text-foreground">Empresa</label>
            <select id="bus-operator" value={operatorId} onChange={(event) => setOperatorId(event.target.value)} className={controlClassName}>
              <option value="all">Todas as empresas</option>
              {BUS_OPERATORS.map((operator) => <option key={operator.id} value={operator.id}>{operator.name}</option>)}
            </select>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <section aria-labelledby="bus-results-heading" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2" aria-live="polite" aria-atomic="true">
              <h2 id="bus-results-heading" className="flex items-center gap-2 text-lg font-semibold text-foreground"><CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" /> {validDate ? `Consulta para ${selectedDate}` : "Selecione a data da viagem"}</h2>
              {validDate && <span className="text-xs text-muted-foreground">{departures.length} {departures.length === 1 ? "opção consultada" : "opções consultadas"}</span>}
            </div>

            {archived && (
              <div className="rounded-xl border border-border bg-muted p-4 text-sm">
                <p className="flex items-center gap-2 font-semibold text-foreground"><Archive className="h-4 w-4" aria-hidden="true" /> Consulta arquivada</p>
                <p className="mt-1 leading-relaxed text-muted-foreground">Você selecionou uma data passada. Os registros abaixo são históricos e não indicam próximas saídas.</p>
                <button type="button" onClick={() => { setDateInput(getBrazilDate(now)); setDateWasSelected(true); }} className="mt-2 min-h-10 text-sm font-semibold text-primary hover:underline">Voltar à data atual</button>
              </div>
            )}

            {departures.length > 0 ? (
              <div className="space-y-4">{departures.map((departure) => <DepartureCard key={departure.id} departure={departure} now={now} />)}</div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card px-5 py-8 text-center sm:py-10">
                <CalendarSearch className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
                <h3 className="text-base font-semibold text-foreground">
                  {!validDate ? "Escolha uma data para consultar" : hasOtherOperators ? "Não há consulta registrada para esta empresa" : "Ainda não conferimos os horários para esta data"}
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                  {!validDate ? "Use o calendário no campo acima." : hasOtherOperators ? "Há registros de outras empresas para o destino e a data escolhidos. Você também pode consultar os canais abaixo." : "Isso não significa que não existam ônibus. Confira as opções para o destino escolhido nos canais abaixo."}
                </p>
                {hasOtherOperators && <button type="button" onClick={() => setOperatorId("all")} className={`${externalLinkClassName} mt-4 bg-primary/5 text-primary hover:bg-primary/10`}>Ver todas as empresas</button>}
              </div>
            )}
          </section>

          <ExternalSearch date={selectedDate} destinationId={destinationId} />

          <section aria-labelledby="bus-before-travel-heading" className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h2 id="bus-before-travel-heading" className="text-base font-semibold text-foreground">Antes de viajar</h2>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
              <li>Confirme a data, o sentido e o endereço de embarque com a empresa.</li>
              <li>Confira as condições de viagem e a disponibilidade no canal de venda.</li>
              <li>Os horários apresentados seguem o horário de Brasília. A chegada é prevista.</li>
            </ul>
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-sm leading-relaxed text-muted-foreground">Para verificar linhas e empresas autorizadas, consulte a ANTT nas viagens entre estados e a AGR nas viagens dentro de Goiás. Os quadros das linhas podem informar a partida em outra cidade, não a passagem por Piracanjuba.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <a href="https://quadros-horarios.antt.gov.br/" target="_blank" rel="noopener noreferrer" className={`${externalLinkClassName} text-primary hover:bg-primary/5`}>Consultar ANTT<ArrowUpRight className="h-4 w-4" aria-hidden="true" /><span className="sr-only">, abre em nova aba</span></a>
                <a href="https://goias.gov.br/agr/quadro-de-horarios/" target="_blank" rel="noopener noreferrer" className={`${externalLinkClassName} text-primary hover:bg-primary/5`}>Consultar AGR Goiás<ArrowUpRight className="h-4 w-4" aria-hidden="true" /><span className="sr-only">, abre em nova aba</span></a>
              </div>
            </div>
          </section>
        </div>
        <BoardingAndContacts />
      </div>
    </div>
  );
}
