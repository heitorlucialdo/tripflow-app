import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTrip } from "../hooks/useTrip";
import { useTripRows } from "../hooks/useTripRows";
import { formatDay, memberLabel, tripDays, type Trip } from "../lib/trip-context";
import type { ItineraryItem } from "./RoteiroViagem/RoteiroViagem";
import { CompartilharLocalizacao } from "./CompartilharLocalizacao/CompartilharLocalizacao";
import { useSharedLocation } from "../hooks/useSharedLocation";

interface Person {
  id: string;
  label: string;
  lat: number;
  lng: number;
  self: boolean;
}

interface Pin {
  name: string;
  lat: number;
  lng: number;
  day: string;
}

const PINS: Pin[] = [
  { name: "Copacabana Blue Hotel",     lat: -22.9665, lng: -43.1844, day: "Terça 17/02" },
  { name: "Pizzaria Oggi",             lat: -22.9862, lng: -43.2176, day: "Terça 17/02" },
  { name: "Caminhada em Copacabana",   lat: -22.9711, lng: -43.1823, day: "Terça 17/02" },
  { name: "Mureta da Urca",            lat: -22.9503, lng: -43.1664, day: "Terça 17/02" },
  { name: "Parque Lage",               lat: -22.9625, lng: -43.2108, day: "Quarta 18/02" },
  { name: "Jardim Botânico",           lat: -22.9667, lng: -43.2228, day: "Quarta 18/02" },
  { name: "Ipanema e Leblon",          lat: -22.9868, lng: -43.2029, day: "Quarta 18/02" },
  { name: "Pôr do sol no Arpoador",    lat: -22.9888, lng: -43.1916, day: "Quarta 18/02" },
  { name: "Baixo Botafogo",            lat: -22.9448, lng: -43.1861, day: "Quarta 18/02" },
  { name: "SAARA",                     lat: -22.9048, lng: -43.1817, day: "Quinta 19/02" },
  { name: "Escadaria Selarón",         lat: -22.9143, lng: -43.1795, day: "Quinta 19/02" },
  { name: "Arcos da Lapa",             lat: -22.9123, lng: -43.1797, day: "Quinta 19/02" },
  { name: "Museu do Amanhã",           lat: -22.8944, lng: -43.1803, day: "Quinta 19/02" },
  { name: "AquaRio",                   lat: -22.8958, lng: -43.1872, day: "Quinta 19/02" },
  { name: "Bosque Bar",                lat: -22.9741, lng: -43.2303, day: "Quinta 19/02" },
  { name: "Stand Up Paddle",           lat: -22.9669, lng: -43.1778, day: "Sexta 20/02" },
  { name: "Forte Duque de Caxias",     lat: -22.9591, lng: -43.1710, day: "Sexta 20/02" },
  { name: "Sunset Morro da Urca",      lat: -22.9487, lng: -43.1614, day: "Sexta 20/02" },
  { name: "Bar Urca",                  lat: -22.9472, lng: -43.1659, day: "Sexta 20/02" },
  { name: "Rio Scenarium",             lat: -22.9082, lng: -43.1804, day: "Sexta 20/02" },
  { name: "Feira da Glória",           lat: -22.9261, lng: -43.1767, day: "Sábado 21/02" },
  { name: "Aterro do Flamengo",        lat: -22.9342, lng: -43.1726, day: "Sábado 21/02" },
];

const DAY_COLORS: Record<string, string> = {
  "Terça 17/02":  "#3dd9ff",
  "Quarta 18/02": "#3ee08f",
  "Quinta 19/02": "#ffc861",
  "Sexta 20/02":  "#ff8a5b",
  "Sábado 21/02": "#b9a4ff",
};


const PALETTE = ["#3dd9ff", "#3ee08f", "#ffc861", "#ff8a5b", "#b9a4ff", "#ff6fae", "#7cf2e1"];

// Nomes vêm do que o grupo digitou: montar o popup com textContent evita injeção de HTML.
function popupContent(day: string, name: string, color: string): HTMLElement {
  const wrap = document.createElement("div");
  const d = document.createElement("span");
  d.className = "tf-popup-day";
  d.style.color = color;
  d.textContent = day;
  const n = document.createElement("span");
  n.className = "tf-popup-name";
  n.textContent = name;
  wrap.append(d, n);
  return wrap;
}

function makeIcon(order: number, color: string, delay: number) {
  return L.divIcon({
    className: "",
    html: `<div class="tf-pin" style="--pin:${color};animation-delay:${delay}ms"><span>${order}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [5, 34],
    popupAnchor: [12, -34],
  });
}


function personIcon(label: string, self: boolean) {
  const el = document.createElement("div");
  el.className = `tf-person${self ? " tf-person-self" : ""}`;
  el.textContent = label.slice(0, 2).toUpperCase();
  el.title = self ? "Você" : label;
  return L.divIcon({ className: "", html: el, iconSize: [34, 34], iconAnchor: [17, 17] });
}

export function Mapa() {
  const { activeTrip } = useTrip();
  const { rows } = useTripRows<ItineraryItem>("itinerary_items", activeTrip?.id ?? null, [
    { column: "day" }, { column: "position" },
  ]);

  // Memorizado: o mapa reposiciona a câmera sempre que os pins mudam de identidade.
  const tripPins = useMemo(() => {
    if (!activeTrip) return null;
    const days = tripDays(activeTrip);
    const dayLabel = (d: string) => `Dia ${days.indexOf(d) + 1} · ${formatDay(d, { day: "2-digit", month: "2-digit" })}`;
    const pins: Pin[] = rows
      .filter(r => r.lat !== null && r.lng !== null)
      .map(r => ({ name: r.title, lat: r.lat as number, lng: r.lng as number, day: dayLabel(r.day) }));
    const dayColors: Record<string, string> = {};
    days.forEach((d, i) => {
      const label = dayLabel(d);
      if (pins.some(p => p.day === label)) dayColors[label] = PALETTE[i % PALETTE.length];
    });
    return { pins, dayColors };
  }, [activeTrip, rows]);

  if (!activeTrip || !tripPins) return <MapaView pins={PINS} dayColors={DAY_COLORS} />;
  return <TripMapa key={activeTrip.id} trip={activeTrip} pins={tripPins.pins} dayColors={tripPins.dayColors} />;
}

function TripMapa({ trip, pins, dayColors }: { trip: Trip; pins: Pin[]; dayColors: Record<string, string> }) {
  const { members } = useTrip();
  const location = useSharedLocation(trip.id);

  const people = useMemo<Person[]>(() => {
    const list: Person[] = location.others.map(p => {
      const m = members.find(x => x.user_id === p.userId);
      return { id: p.userId, label: m ? memberLabel(m) : "?", lat: p.lat, lng: p.lng, self: false };
    });
    if (location.myPosition) list.push({ id: "me", label: "Eu", ...location.myPosition, self: true });
    return list;
  }, [location.others, location.myPosition, members]);

  return (
    <MapaView pins={pins} dayColors={dayColors} people={people} myPosition={location.myPosition}>
      <CompartilharLocalizacao
        tripEnd={trip.end_date}
        ready={location.ready}
        sharing={location.sharing}
        shareUntil={location.shareUntil}
        othersCount={location.others.length}
        error={location.error}
        onStart={location.start}
        onStop={location.stop}
      />
    </MapaView>
  );
}

const LOCATE_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>';

function MapaView({ pins, dayColors, people = [], myPosition = null, children }: {
  pins: Pin[];
  dayColors: Record<string, string>;
  people?: Person[];
  // Posição já conhecida (quem está compartilhando); evita pedir de novo ao GPS.
  myPosition?: { lat: number; lng: number } | null;
  children?: ReactNode;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const peopleLayerRef = useRef<L.LayerGroup | null>(null);
  const selfLayerRef = useRef<L.LayerGroup | null>(null);
  const myPositionRef = useRef(myPosition);
  const centerRef = useRef<() => void>(() => {});
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [locError, setLocError] = useState<string | null>(null);

  // Centraliza na pessoa. Sem compartilhamento ativo, pede a posição uma vez
  // e só desenha no aparelho dela: nada é enviado ao grupo.
  useEffect(() => {
    myPositionRef.current = myPosition;
    if (myPosition) selfLayerRef.current?.clearLayers();
    centerRef.current = () => {
      const map = instanceRef.current;
      if (!map) return;
      const fly = (lat: number, lng: number) =>
        map.flyTo([lat, lng], Math.max(map.getZoom(), 16), { duration: 0.8 });

      const known = myPositionRef.current;
      if (known) { setLocError(null); fly(known.lat, known.lng); return; }

      if (!("geolocation" in navigator)) { setLocError("Este aparelho não informa localização."); return; }
      navigator.geolocation.getCurrentPosition(
        p => {
          const { latitude: lat, longitude: lng } = p.coords;
          const layer = selfLayerRef.current;
          if (layer && !myPositionRef.current) {
            layer.clearLayers();
            L.marker([lat, lng], { icon: personIcon("Eu", true), zIndexOffset: 1100 }).addTo(layer);
          }
          setLocError(null);
          fly(lat, lng);
        },
        err => setLocError(err.code === err.PERMISSION_DENIED
          ? "Permissão de localização negada. Libere nas configurações do navegador."
          : "Não consegui obter sua localização agora."),
        { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
      );
    };
  }, [myPosition]);

  useEffect(() => {
    if (!mapRef.current || instanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [-22.95, -43.19],
      zoom: 13,
      zoomControl: false,
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);

    const Locate = L.Control.extend({
      onAdd() {
        const btn = L.DomUtil.create("button", "tf-locate");
        btn.type = "button";
        btn.title = "Centralizar na minha localização";
        btn.setAttribute("aria-label", "Centralizar na minha localização");
        btn.innerHTML = LOCATE_ICON;
        L.DomEvent.disableClickPropagation(btn);
        L.DomEvent.on(btn, "click", () => centerRef.current());
        return btn;
      },
    });
    new Locate({ position: "bottomright" }).addTo(map);
    instanceRef.current = map;

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
      className: "tf-tiles",
      maxZoom: 19,
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    peopleLayerRef.current = L.layerGroup().addTo(map);
    selfLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = instanceRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const visible = pins.filter((p) => !activeDay || p.day === activeDay);
    visible.forEach((pin, i) => {
      const color = dayColors[pin.day] ?? "#3dd9ff";
      const order = pins.indexOf(pin) + 1;
      L.marker([pin.lat, pin.lng], { icon: makeIcon(order, color, i * 35) })
        .addTo(layer)
        .bindPopup(popupContent(pin.day, pin.name, color));
    });

    if (visible.length > 0) {
      map.flyToBounds(L.latLngBounds(visible.map((p) => [p.lat, p.lng])), {
        padding: [48, 48],
        duration: 0.8,
        maxZoom: 15,
      });
    }
  }, [activeDay, pins, dayColors]);

  // Pessoas ficam numa camada própria: atualizar posição não move a câmera.
  useEffect(() => {
    const layer = peopleLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    people.forEach(p => {
      L.marker([p.lat, p.lng], { icon: personIcon(p.label, p.self), zIndexOffset: 1000 }).addTo(layer);
    });
  }, [people]);

  return (
    <section className="mapa-section">
      <h2 className="section-title">O roteiro no mapa</h2>
      <p className="galeria-sub" style={{ textAlign: "center" }}>
        Toque em um dia para filtrar — os números seguem a ordem do roteiro
      </p>

      <div className="mapa-legend" role="group" aria-label="Filtrar por dia">
        <button
          className={`mapa-legend-item ${activeDay === null ? "is-active" : ""}`}
          onClick={() => setActiveDay(null)}
        >
          Todos
        </button>
        {Object.entries(dayColors).map(([day, color]) => (
          <button
            key={day}
            className={`mapa-legend-item ${activeDay === day ? "is-active" : ""}`}
            onClick={() => setActiveDay(activeDay === day ? null : day)}
            aria-pressed={activeDay === day}
          >
            <span className="mapa-legend-dot" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
            {day}
          </button>
        ))}
      </div>

      {children}

      {pins.length === 0 && (
        <p className="galeria-sub" style={{ textAlign: "center" }}>
          Adicione lugares ao roteiro usando a busca para eles aparecerem aqui.
        </p>
      )}

      <div ref={mapRef} className="mapa-container" />
      {locError && <p className="galeria-sub" role="alert" style={{ textAlign: "center" }}>{locError}</p>}
    </section>
  );
}
