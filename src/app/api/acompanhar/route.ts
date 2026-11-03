import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { PLANTAO_FARMACIAS } from "@/data/plantaoFarmacias";
import { BUS_DESTINATIONS, getUpcomingBusDepartures } from "@/data/horariosOnibus";
import { brazilDate, weekForDate } from "@/lib/civic-day";
import type { FollowFeed, FollowItem } from "@/lib/following";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const items: FollowItem[] = [];
  const unavailable: FollowFeed["unavailable"] = [];
  const week = weekForDate(PLANTAO_FARMACIAS, brazilDate(now));
  if (week) items.push({ id: `farmacias:${week.inicio}`, topic: "farmacias", title: week.farmacia24h?.nome ?? "Escala da semana", detail: week.farmacia24h ? `Plantão 24h na semana iniciada em ${week.inicio}` : `Farmácias da semana iniciada em ${week.inicio}`, href: "/plantao-farmacias", revision: JSON.stringify(week) });
  else unavailable.push("farmacias");
  for (const trip of getUpcomingBusDepartures(now, 100)) {
    const destination = BUS_DESTINATIONS.find((d) => d.id === trip.destinationId);
    items.push({ id: `onibus:${trip.id}`, topic: "onibus", title: `${trip.departure} para ${destination?.name ?? trip.destinationId}`, detail: `Viagem em ${trip.date}. Consulte empresa, embarque e fonte.`, href: `/horarios-onibus?data=${trip.date}&destino=${trip.destinationId}`, revision: JSON.stringify([trip.departure, trip.arrival, trip.operatorId, trip.boarding, trip.connections]), filter: trip.destinationId });
  }
  if (!items.some((item) => item.topic === "onibus")) unavailable.push("onibus");
  const sb = createPublicSupabaseClient();
  const results = await Promise.allSettled([
    sb.from("contratos").select("id,numero,empresa,objeto,valor,status,vigencia_inicio,vigencia_fim").order("vigencia_inicio", { ascending: false, nullsFirst: false }).order("numero").order("empresa").order("id").limit(30),
    sb.from("atuacao_parlamentar").select("id,tipo,numero,ano,autor_texto,descricao,data").order("data", { ascending: false }).order("id").limit(50),
  ]);
  const contracts = results[0];
  if (contracts.status === "rejected" || contracts.value.error) unavailable.push("contratos");
  else for (const contract of contracts.value.data ?? []) {
    items.push({ id: `contratos:${contract.id}`, topic: "contratos", title: `Contrato ${contract.numero ?? "sem número"}: ${contract.empresa ?? "Fornecedor não informado"}`, detail: (contract.objeto ?? "Consulte o objeto e os aditivos no contrato.").slice(0, 220), href: "/prefeitura/contratos", revision: JSON.stringify(contract) });
  }
  const council = results[1];
  if (council.status === "rejected" || council.value.error) unavailable.push("camara");
  else for (const act of council.value.data ?? []) {
    items.push({ id: `camara:${act.id}`, topic: "camara", title: `${act.tipo} ${act.numero}/${act.ano}: ${act.autor_texto}`, detail: `${act.data}. ${act.descricao ?? ""}`.slice(0, 240), href: "/atuacao-parlamentar", revision: JSON.stringify(act), filter: act.autor_texto });
  }
  return Response.json({ items, unavailable, checkedAt: now.toISOString() } satisfies FollowFeed, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" } });
}
