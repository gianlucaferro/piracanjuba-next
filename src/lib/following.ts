export const FOLLOW_TOPICS = ["farmacias", "onibus", "contratos", "camara"] as const;
export type FollowTopic = typeof FOLLOW_TOPICS[number];
export type FollowItem = { id: string; topic: FollowTopic; title: string; detail: string; href: string; revision: string; filter?: string };
export type FollowFeed = { items: FollowItem[]; unavailable: FollowTopic[]; checkedAt: string };
export type FollowPreferences = { topics: FollowTopic[]; destination: string; councilor: string; frequency: "daily" | "weekly" | "off" };
export type FollowSnapshot = { checkedAt: string; revisions: Record<string, string>; initializedTopics: FollowTopic[] };
export const DEFAULT_PREFERENCES: FollowPreferences = { topics: [], destination: "all", councilor: "", frequency: "weekly" };
export const FOLLOW_LABELS: Record<FollowTopic, string> = { farmacias: "Plantão de farmácias", onibus: "Viagens de ônibus", contratos: "Contratos da Prefeitura", camara: "Atuação dos vereadores" };

export function parsePreferences(raw: string | null): FollowPreferences {
  try {
    const parsed = JSON.parse(raw ?? "null");
    if (!parsed || typeof parsed !== "object") return DEFAULT_PREFERENCES;
    return {
      topics: FOLLOW_TOPICS.filter((topic) => Array.isArray(parsed.topics) && parsed.topics.includes(topic)),
      destination: typeof parsed.destination === "string" ? parsed.destination.slice(0, 80) : "all",
      councilor: typeof parsed.councilor === "string" ? parsed.councilor.slice(0, 120) : "",
      frequency: ["daily", "weekly", "off"].includes(parsed.frequency) ? parsed.frequency : "weekly",
    };
  } catch { return DEFAULT_PREFERENCES; }
}

export function filterFollowing(items: FollowItem[], preferences: FollowPreferences): FollowItem[] {
  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  return items.filter((item) => preferences.topics.includes(item.topic)
    && (item.topic !== "onibus" || preferences.destination === "all" || item.filter === preferences.destination)
    && (item.topic !== "camara" || !preferences.councilor.trim() || normalize(item.filter ?? "").includes(normalize(preferences.councilor))));
}

export function followingChanges(items: FollowItem[], previous: FollowSnapshot | null): FollowItem[] {
  if (!previous) return [];
  return items.filter((item) => previous.initializedTopics.includes(item.topic) && previous.revisions[item.id] !== item.revision);
}

export function followingDue(previous: FollowSnapshot | null, frequency: FollowPreferences["frequency"], now: Date): boolean {
  if (frequency === "off") return false;
  if (!previous) return true;
  const last = Date.parse(previous.checkedAt);
  return !Number.isFinite(last) || now.getTime() - last >= (frequency === "daily" ? 1 : 7) * 86_400_000;
}

export function followingSnapshot(feed: FollowFeed, previous: FollowSnapshot | null): FollowSnapshot {
  // Uma indisponibilidade nunca apaga a referência anterior nem gera uma falsa novidade.
  return { checkedAt: feed.checkedAt, revisions: { ...(previous?.revisions ?? {}), ...Object.fromEntries(feed.items.map((item) => [item.id, item.revision])) }, initializedTopics: FOLLOW_TOPICS.filter((topic) => previous?.initializedTopics.includes(topic) || !feed.unavailable.includes(topic)) };
}

export function initializeFollowingTopics(feed: FollowFeed, previous: FollowSnapshot): FollowSnapshot | null {
  const missing = FOLLOW_TOPICS.filter((topic) => !previous.initializedTopics.includes(topic) && !feed.unavailable.includes(topic));
  if (!missing.length) return null;
  return { checkedAt: previous.checkedAt, initializedTopics: [...previous.initializedTopics, ...missing], revisions: { ...previous.revisions, ...Object.fromEntries(feed.items.filter((item) => missing.includes(item.topic)).map((item) => [item.id, item.revision])) } };
}
