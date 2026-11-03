"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { FOLLOW_TOPICS, initializeFollowingTopics, parsePreferences, type FollowFeed, type FollowPreferences, type FollowSnapshot } from "@/lib/following";

const KEY = "pba-following-v1";
const EVENT = "pba-following-change";
const empty = () => null;
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => { window.removeEventListener("storage", onChange); window.removeEventListener(EVENT, onChange); };
}
function read() { try { return localStorage.getItem(KEY); } catch { return null; } }

export function saveFollowing(preferences: FollowPreferences, snapshot: FollowSnapshot | null) {
  localStorage.setItem(KEY, JSON.stringify({ preferences, snapshot }));
  window.dispatchEvent(new Event(EVENT));
}

export function clearFollowing() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

export function useFollowing() {
  const raw = useSyncExternalStore(subscribe, read, empty);
  return useMemo(() => {
    let value: { preferences?: unknown; snapshot?: FollowSnapshot } = {};
    try { value = JSON.parse(raw ?? "{}") ?? {}; } catch { /* Preferências locais inválidas. */ }
    const snapshot = value.snapshot && typeof value.snapshot.checkedAt === "string" && value.snapshot.revisions && typeof value.snapshot.revisions === "object" ? { ...value.snapshot, initializedTopics: FOLLOW_TOPICS.filter((topic) => Array.isArray(value.snapshot?.initializedTopics) && value.snapshot.initializedTopics.includes(topic)) } : null;
    return { preferences: parsePreferences(JSON.stringify(value.preferences)), snapshot, ready: raw !== null };
  }, [raw]);
}

export async function fetchFollowingFeed(): Promise<FollowFeed> {
  const response = await fetch("/api/acompanhar");
  if (!response.ok) throw new Error("Não foi possível consultar as novidades agora.");
  return response.json() as Promise<FollowFeed>;
}

export function useFollowingFeed(enabled: boolean) {
  const saved = useFollowing();
  const query = useQuery({ queryKey: ["following-feed"], queryFn: fetchFollowingFeed, enabled, staleTime: 300_000, refetchOnWindowFocus: true, retry: 1 });
  useEffect(() => {
    if (!enabled || !query.data || !saved.snapshot) return;
    const initialized = initializeFollowingTopics(query.data, saved.snapshot);
    if (initialized) {
      try { saveFollowing(saved.preferences, initialized); } catch { /* O visitante pode continuar consultando sem persistência. */ }
    }
  }, [enabled, query.data, saved]);
  return query;
}
