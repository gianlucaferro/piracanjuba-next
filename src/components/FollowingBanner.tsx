"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useFollowing, useFollowingFeed } from "@/hooks/useFollowing";
import { useBrazilClock } from "@/hooks/useBrazilClock";
import { filterFollowing, followingChanges, followingDue } from "@/lib/following";

export default function FollowingBanner() {
  const { preferences, snapshot } = useFollowing();
  const now = useBrazilClock();
  const due = Boolean(now && snapshot && preferences.topics.length && followingDue(snapshot, preferences.frequency, now));
  const feed = useFollowingFeed(due);
  const changes = due && feed.data ? followingChanges(filterFollowing(feed.data.items, preferences), snapshot) : [];
  if (!changes.length) return null;
  return <aside className="border-b bg-primary/10"><div className="container py-3 text-sm flex gap-2 items-center"><Bell className="h-4 w-4 shrink-0" /><Link href="/acompanhar" className="font-medium hover:underline">Há {changes.length} registro(s) novo(s) ou atualizado(s) nos assuntos que você acompanha. Ver novidades →</Link></div></aside>;
}
