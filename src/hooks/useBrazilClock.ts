"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  const interval = window.setInterval(onChange, 30_000);
  window.addEventListener("focus", onChange);
  return () => { window.clearInterval(interval); window.removeEventListener("focus", onChange); };
}
const snapshot = () => Math.floor(Date.now() / 30_000) * 30_000;
const serverSnapshot = () => null;

export function useBrazilClock(): Date | null {
  const timestamp = useSyncExternalStore<number | null>(subscribe, snapshot, serverSnapshot);
  return timestamp === null ? null : new Date(timestamp);
}
