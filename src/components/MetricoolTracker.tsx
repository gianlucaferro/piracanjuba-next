"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const HASH = "8f7dc2a017d7b5479d123578d8ddb40c";
const PRODUCTION_HOSTS = new Set(["piracanjuba.ai", "www.piracanjuba.ai"]);
const PRIVATE_PATH = /^\/(?:admin|auth|login|api)(?:\/|$)/i;
const PRIVATE_PARAMETER = /^(?:code|token|access_token|refresh_token|email|cpf|cnpj|password|senha|busca)$/i;

declare global {
  interface Window {
    beTracker?: { t: (options: { hash: string }) => void };
  }
}

let trackerReady: Promise<void> | undefined;

function isPublicUrl(value: string) {
  try {
    const url = new URL(value);
    return !PRIVATE_PATH.test(url.pathname)
      && !url.hash
      && !Array.from(url.searchParams.keys()).some((key) => PRIVATE_PARAMETER.test(key));
  } catch {
    return false;
  }
}

function canTrack() {
  return PRODUCTION_HOSTS.has(window.location.hostname)
    && isPublicUrl(window.location.href)
    && (!document.referrer || isPublicUrl(document.referrer));
}

function loadTracker() {
  if (window.beTracker) return Promise.resolve();
  if (!trackerReady) {
    trackerReady = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://tracker.metricool.com/resources/be.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        script.remove();
        trackerReady = undefined;
        reject(new Error("Metricool indisponível"));
      };
      document.head.appendChild(script);
    });
  }
  return trackerReady;
}

export default function MetricoolTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!canTrack()) return;
    let cancelled = false;

    void loadTracker().then(() => {
      // Ignora carregamentos concluídos depois de uma mudança de página.
      if (cancelled || !canTrack() || !window.beTracker
        || window.location.pathname !== pathname) return;
      window.beTracker.t({ hash: HASH });
    }).catch(() => {
      // Uma falha no analytics não deve interromper a navegação.
    });

    return () => { cancelled = true; };
  }, [pathname]);

  return null;
}
