import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const PINS: { name: string; lat: number; lng: number; day: string }[] = [
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


function makeIcon(order: number, color: string, delay: number) {
  return L.divIcon({
    className: "",
    html: `<div class="tf-pin" style="--pin:${color};animation-delay:${delay}ms"><span>${order}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [5, 34],
    popupAnchor: [12, -34],
  });
}


export function Mapa() {
  const mapRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [activeDay, setActiveDay] = useState<string | null>(null);

  useEffect(() => {
    if (!mapRef.current || instanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [-22.95, -43.19],
      zoom: 13,
      zoomControl: false,
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    instanceRef.current = map;

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
      className: "tf-tiles",
      maxZoom: 19,
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);

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

    const visible = PINS.filter((p) => !activeDay || p.day === activeDay);
    visible.forEach((pin, i) => {
      const color = DAY_COLORS[pin.day] ?? "#3dd9ff";
      const order = PINS.indexOf(pin) + 1;
      L.marker([pin.lat, pin.lng], { icon: makeIcon(order, color, i * 35) })
        .addTo(layer)
        .bindPopup(
          `<span class="tf-popup-day" style="color:${color}">${pin.day}</span>` +
          `<span class="tf-popup-name">${pin.name}</span>`
        );
    });

    if (visible.length > 0) {
      map.flyToBounds(L.latLngBounds(visible.map((p) => [p.lat, p.lng])), {
        padding: [48, 48],
        duration: 0.8,
        maxZoom: 15,
      });
    }
  }, [activeDay]);

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
        {Object.entries(DAY_COLORS).map(([day, color]) => (
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

      <div ref={mapRef} className="mapa-container" />
    </section>
  );
}
