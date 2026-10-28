"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, X } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Coordenadas aproximadas dos bairros de Piracanjuba
const BAIRROS_COORDS: Record<string, [number, number]> = {
  "Centro": [-17.3028, -49.0289],
  "Setor Oeste": [-17.3045, -49.0340],
  "Setor Sul": [-17.3080, -49.0280],
  "Setor Norte": [-17.2970, -49.0280],
  "Setor Leste": [-17.3020, -49.0230],
  "Jardim Tropical": [-17.3060, -49.0320],
  "Vila Nova": [-17.3000, -49.0310],
  "Residencial Piracanjuba": [-17.3100, -49.0260],
  "Setor Industrial": [-17.2950, -49.0340],
  "Vila São José": [-17.3040, -49.0250],
  "Jardim América": [-17.3070, -49.0350],
  "Setor Aeroporto": [-17.2980, -49.0200],
};

// Default center of Piracanjuba
const CENTER: [number, number] = [-17.3028, -49.0289];

type Anuncio = {
  id: string;
  titulo: string;
  bairro: string | null;
  preco: number | null;
  preco_tipo: string;
  fotos: string[];
  categoria: string;
};

function getCoords(bairro: string): [number, number] | null {
  // Exact match
  if (BAIRROS_COORDS[bairro]) return BAIRROS_COORDS[bairro];
  // Partial match
  const lower = bairro.toLowerCase();
  for (const [name, coords] of Object.entries(BAIRROS_COORDS)) {
    if (lower.includes(name.toLowerCase()) || name.toLowerCase().includes(lower)) {
      return coords;
    }
  }
  // Fallback: scatter around center with small random offset
  const offset = () => (Math.random() - 0.5) * 0.008;
  return [CENTER[0] + offset(), CENTER[1] + offset()];
}

function formatPreco(preco: number | null, tipo: string) {
  if (tipo === "gratuito") return "Gratuito";
  if (!preco) return "Consulte";
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function MapaAnuncios({
  anuncios,
  onSelect,
}: {
  anuncios: Anuncio[];
  onSelect?: (id: string) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const [visible, setVisible] = useState(false);

  const withBairro = useMemo(() => anuncios.filter((a) => a.bairro), [anuncios]);

  useEffect(() => {
    if (!visible || !mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: CENTER,
      zoom: 14,
      zoomControl: true,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 18,
    }).addTo(map);

    // Group by bairro
    const groups: Record<string, Anuncio[]> = {};
    withBairro.forEach((a) => {
      const key = a.bairro!;
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    });

    Object.entries(groups).forEach(([bairro, items]) => {
      const coords = getCoords(bairro);
      if (!coords) return;

      const icon = L.divIcon({
        html: `<div style="background:#25D366;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${items.length}</div>`,
        iconSize: [32, 32],
        className: "",
      });

      const marker = L.marker(coords, { icon }).addTo(map);

      // textContent evita interpretar títulos e bairros cadastrados como HTML.
      const popupContent = document.createElement("div");
      popupContent.style.maxWidth = "220px";
      const heading = document.createElement("strong");
      heading.textContent = bairro;
      heading.style.fontSize = "13px";
      popupContent.append(heading);
      const count = document.createElement("p");
      count.textContent = `${items.length} anúncio(s)`;
      count.style.cssText = "font-size:11px;color:#666;margin:4px 0 0";
      popupContent.append(count);
      const list = document.createElement("div");
      list.style.cssText = "margin-top:8px;max-height:120px;overflow-y:auto";
      for (const item of items.slice(0, 5)) {
        const action = onSelect
          ? document.createElement("button")
          : document.createElement("a");
        if (action instanceof HTMLButtonElement && onSelect) {
          action.type = "button";
          action.addEventListener("click", () => onSelect(item.id));
        } else if (action instanceof HTMLAnchorElement) {
          action.href = `/compra-e-venda/${encodeURIComponent(item.id)}`;
        }
        action.style.cssText = "display:block;width:100%;text-align:left;padding:4px 0;border-top:1px solid #eee;cursor:pointer";
        const title = document.createElement("div");
        title.textContent = `${item.titulo.slice(0, 40)}${item.titulo.length > 40 ? "..." : ""}`;
        title.style.cssText = "font-size:11px;font-weight:600";
        const price = document.createElement("div");
        price.textContent = formatPreco(item.preco, item.preco_tipo);
        price.style.cssText = "font-size:10px;color:#25D366;font-weight:bold";
        action.append(title, price);
        list.append(action);
      }
      if (items.length > 5) {
        const remaining = document.createElement("div");
        remaining.textContent = `+${items.length - 5} mais`;
        remaining.style.cssText = "font-size:10px;color:#666;padding-top:4px";
        list.append(remaining);
      }
      popupContent.append(list);

      marker.bindPopup(popupContent);
    });

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [visible, withBairro, onSelect]);

  if (withBairro.length === 0) return null;

  return (
    <div className="space-y-2">
      <button
        onClick={() => setVisible(!visible)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <MapPin className="w-3.5 h-3.5" />
        {visible ? "Ocultar mapa" : `Ver mapa (${withBairro.length} anúncios com localização)`}
        {visible && <X className="w-3 h-3" />}
      </button>
      {visible && (
        <div
          ref={mapRef}
          className="w-full h-64 sm:h-80 rounded-xl border overflow-hidden"
          style={{ zIndex: 1 }}
        />
      )}
    </div>
  );
}
