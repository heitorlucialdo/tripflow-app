import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoResult } from "../../lib/places";
import type { PlanDay } from "../../lib/planner";

export const DAY_COLORS = ["#3dd9ff", "#3ee08f", "#ffc861", "#ff8a5b", "#b9a4ff", "#ff6fb1", "#7cf2d6"];

interface Props {
  lodging: GeoResult;
  days: PlanDay[];
  activeDay: number | null;
}

function pin(label: string, color: string) {
  return L.divIcon({
    className: "",
    html: `<div class="tf-pin" style="--pin:${color}"><span>${label}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [5, 34],
    popupAnchor: [12, -34],
  });
}

export function PlanMap({ lodging, days, activeDay }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { zoomControl: false }).setView([lodging.lat, lodging.lng], 13);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
      className: "tf-tiles",
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lodging.lat, lodging.lng]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const home: L.LatLngTuple = [lodging.lat, lodging.lng];
    L.marker(home, { icon: pin("H", "#ffffff") }).addTo(layer).bindPopup("<b>Hospedagem</b>");
    const bounds: L.LatLngTuple[] = [home];

    days.forEach((day, d) => {
      if (activeDay !== null && activeDay !== d) return;
      const color = DAY_COLORS[d % DAY_COLORS.length];
      const line: L.LatLngTuple[] = [home];
      day.stops.forEach(({ place: s }, i) => {
        const pos: L.LatLngTuple = [s.lat, s.lng];
        line.push(pos);
        bounds.push(pos);
        L.marker(pos, { icon: pin(String(i + 1), color) })
          .addTo(layer)
          .bindPopup(`<span class="tf-popup-day" style="color:${color}">Dia ${d + 1}</span><span class="tf-popup-name">${s.name.replace(/</g, "&lt;")}</span>`);
      });
      line.push(home);
      L.polyline(line, { color, weight: 3, opacity: 0.85, dashArray: "6 8" }).addTo(layer);
    });

    map.flyToBounds(L.latLngBounds(bounds), { padding: [40, 40], duration: 0.8, maxZoom: 15 });
  }, [days, activeDay, lodging]);

  return <div ref={elRef} className="mapa-container" />;
}
