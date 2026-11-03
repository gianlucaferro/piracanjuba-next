"use client";

import Link from "next/link";
import { Pill, BusFront, Trash2, Phone, Bell } from "lucide-react";
import { PLANTAO_FARMACIAS } from "@/data/plantaoFarmacias";
import { BUS_DESTINATIONS, getUpcomingBusDepartures } from "@/data/horariosOnibus";
import { brazilDate, weekForDate } from "@/lib/civic-day";
import { useBrazilClock } from "@/hooks/useBrazilClock";

export default function TodayInPiracanjuba() {
  const now = useBrazilClock();
  const date = now ? brazilDate(now) : null;
  const week = date ? weekForDate(PLANTAO_FARMACIAS, date) : null;
  const nextBus = now ? getUpcomingBusDepartures(now, 1)[0] : null;
  const destination = BUS_DESTINATIONS.find((item) => item.id === nextBus?.destinationId);
  const cards = [
    { href: "/plantao-farmacias", title: "Farmácia de plantão", icon: Pill, text: !date ? "Consulte a escala" : week?.farmacia24h ? `${week.farmacia24h.nome}, plantão 24h` : week ? "Veja as farmácias da semana" : "Consulte a cobertura da escala" },
    { href: "/horarios-onibus", title: "Próxima saída conferida", icon: BusFront, text: nextBus ? `${nextBus.departure} para ${destination?.name ?? nextBus.destinationId}, ${nextBus.date}` : "Busque por data e destino" },
    { href: "/coleta-lixo", title: "Coleta no seu bairro", icon: Trash2, text: "Dias, horários e orientações" },
    { href: "/contatos", title: "Contatos úteis", icon: Phone, text: "Serviços públicos e emergências" },
  ];

  return (
    <section aria-labelledby="heading-hoje" className="rounded-2xl border bg-primary/5 p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 id="heading-hoje" className="text-xl font-bold">Hoje em Piracanjuba</h2>
          <p className="text-sm text-muted-foreground">{date ? `${date} · Horário de Brasília` : "Serviços para o seu dia a dia"}</p>
        </div>
        <Link href="/acompanhar" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"><Bell className="h-4 w-4" /> Favoritos e avisos</Link>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(({ href, title, icon: Icon, text }) => (
          <Link key={href} href={href} className="rounded-xl border bg-card p-4 hover:border-primary transition-colors">
            <Icon className="h-5 w-5 text-primary mb-2" aria-hidden />
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{text}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
