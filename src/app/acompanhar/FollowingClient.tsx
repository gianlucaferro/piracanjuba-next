"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, Bookmark, Check, Trash2 } from "lucide-react";
import { BUS_DESTINATIONS } from "@/data/horariosOnibus";
import { FOLLOW_LABELS, FOLLOW_TOPICS, filterFollowing, followingChanges, followingSnapshot, type FollowPreferences } from "@/lib/following";
import { clearFollowing, fetchFollowingFeed, saveFollowing, useFollowing, useFollowingFeed } from "@/hooks/useFollowing";

export default function FollowingClient() {
  const { preferences, snapshot } = useFollowing();
  const [draft, setDraft] = useState<FollowPreferences | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const selected = draft ?? preferences;
  const feed = useFollowingFeed(preferences.topics.length > 0);
  const visible = feed.data ? filterFollowing(feed.data.items, preferences) : [];
  const changes = followingChanges(visible, snapshot);
  const changed = new Set(changes.map((item) => item.id));

  async function save() {
    setSaving(true); setMessage("");
    try {
      if (selected.frequency === "off") {
        saveFollowing(selected, snapshot);
        setDraft(null);
        setMessage("Preferências salvas. Avisos cancelados neste navegador.");
        return;
      }
      const current = await fetchFollowingFeed();
      const nextSnapshot = followingSnapshot(current, snapshot);
      // Alterar interesses estabelece uma referência; não anuncia o passado como novidade.
      saveFollowing(selected, nextSnapshot);
      setDraft(null);
      setMessage("Preferências salvas neste navegador. Você pode cancelar os avisos a qualquer momento.");
      await feed.refetch();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível salvar neste navegador."); }
    finally { setSaving(false); }
  }

  function markRead() {
    if (!feed.data) return;
    try { saveFollowing(preferences, followingSnapshot(feed.data, snapshot)); setMessage("Novidades marcadas como vistas."); }
    catch { setMessage("O navegador não permitiu guardar suas preferências."); }
  }

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div><Link href="/" className="text-sm text-primary hover:underline">Início</Link><h1 className="text-2xl sm:text-3xl font-bold mt-3">Favoritos e avisos</h1><p className="text-muted-foreground mt-2">Escolha o que acompanhar. Os favoritos ficam neste navegador e os avisos aparecem quando você volta ao site.</p></div>
      <section className="rounded-xl border bg-card p-5 space-y-5" aria-labelledby="following-settings">
        <h2 id="following-settings" className="font-semibold flex gap-2 items-center"><Bookmark className="h-5 w-5" /> Seus interesses</h2>
        <div className="grid sm:grid-cols-2 gap-3">{FOLLOW_TOPICS.map((topic) => <label key={topic} className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer"><input type="checkbox" checked={selected.topics.includes(topic)} onChange={(event) => setDraft({ ...selected, topics: event.target.checked ? [...selected.topics, topic] : selected.topics.filter((item) => item !== topic) })} className="h-4 w-4" />{FOLLOW_LABELS[topic]}</label>)}</div>
        {selected.topics.includes("onibus") && <label className="block text-sm font-medium">Destino de ônibus<select value={selected.destination} onChange={(event) => setDraft({ ...selected, destination: event.target.value })} className="mt-1 block w-full rounded-lg border bg-background p-3"><option value="all">Todos os destinos</option>{BUS_DESTINATIONS.map((destination) => <option key={destination.id} value={destination.id}>{destination.name}</option>)}</select></label>}
        {selected.topics.includes("camara") && <label className="block text-sm font-medium">Vereador que deseja acompanhar<input value={selected.councilor} maxLength={120} onChange={(event) => setDraft({ ...selected, councilor: event.target.value })} placeholder="Todos, ou digite parte do nome" className="mt-1 block w-full rounded-lg border bg-background p-3" /></label>}
        <label className="block text-sm font-medium">Frequência dos avisos ao voltar<select value={selected.frequency} onChange={(event) => setDraft({ ...selected, frequency: event.target.value as FollowPreferences["frequency"] })} className="mt-1 block w-full rounded-lg border bg-background p-3"><option value="daily">Diária</option><option value="weekly">Semanal</option><option value="off">Sem avisos, somente favoritos</option></select></label>
        <p className="text-sm text-muted-foreground">Sem envio de e-mail ou notificações fora do site. A consulta inclui a escala vigente, as viagens conferidas e uma seleção dos contratos e atos mais recentes. Não substitui o acompanhamento integral das fontes oficiais.</p>
        <div className="flex flex-wrap gap-3"><button type="button" onClick={save} disabled={saving} className="rounded-lg bg-primary text-primary-foreground px-4 py-2 disabled:opacity-50">{saving ? "Salvando..." : "Salvar preferências"}</button><button type="button" onClick={() => { try { clearFollowing(); setDraft(null); setMessage("Favoritos e avisos removidos deste navegador."); } catch { setMessage("Não foi possível remover as preferências."); } }} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2"><Trash2 className="h-4 w-4" /> Apagar preferências</button></div>
        {message && <p role="status" className="text-sm">{message}</p>}
      </section>
      {preferences.topics.length > 0 && <section className="space-y-4" aria-labelledby="following-feed"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="following-feed" className="text-xl font-semibold flex items-center gap-2"><Bell className="h-5 w-5" /> O que você acompanha</h2><button onClick={markRead} disabled={!feed.data} className="text-sm text-primary inline-flex items-center gap-1"><Check className="h-4 w-4" /> Marcar como visto</button></div>
        {feed.isPending && <p role="status">Consultando as fontes...</p>}
        {feed.error && <p role="alert">Não foi possível consultar agora. Seus favoritos continuam salvos. <button className="underline" onClick={() => feed.refetch()}>Tentar novamente</button></p>}
        {feed.data?.unavailable.filter((topic) => preferences.topics.includes(topic)).map((topic) => <p key={topic} className="text-sm text-muted-foreground">{FOLLOW_LABELS[topic]}: sem informação conferida nesta consulta. <Link className="text-primary underline" href={topic === "onibus" ? "/horarios-onibus" : topic === "farmacias" ? "/plantao-farmacias" : topic === "contratos" ? "/prefeitura/contratos" : "/atuacao-parlamentar"}>Consultar a seção</Link></p>)}
        {feed.data && visible.length === 0 && <p className="text-muted-foreground">Nenhum registro corresponde aos seus filtros nesta consulta.</p>}
        <div className="grid sm:grid-cols-2 gap-3">{visible.map((item) => <Link key={item.id} href={item.href} className="rounded-xl border bg-card p-4 hover:border-primary"><p className="text-xs font-medium text-primary">{FOLLOW_LABELS[item.topic]}{changed.has(item.id) ? " · Novo ou atualizado" : ""}</p><h3 className="font-semibold mt-1">{item.title}</h3><p className="text-sm text-muted-foreground mt-2">{item.detail}</p><span className="text-sm text-primary inline-block mt-3">Ver registros e fontes →</span></Link>)}</div>
      </section>}
    </div>
  );
}
