import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icons with Vite
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const PINS: { name: string; lat: number; lng: number; day: string; emoji: string }[] = [
  { name: "Copacabana Blue Hotel",     lat: -22.9665, lng: -43.1844, day: "Terça 17/02",  emoji: "🏨" },
  { name: "Pizzaria Oggi",             lat: -22.9862, lng: -43.2176, day: "Terça 17/02",  emoji: "🍕" },
  { name: "Caminhada em Copacabana",   lat: -22.9711, lng: -43.1823, day: "Terça 17/02",  emoji: "🏖️" },
  { name: "Mureta da Urca",            lat: -22.9503, lng: -43.1664, day: "Terça 17/02",  emoji: "🍺" },
  { name: "Parque Lage",               lat: -22.9625, lng: -43.2108, day: "Quarta 18/02", emoji: "🌿" },
  { name: "Jardim Botânico",           lat: -22.9667, lng: -43.2228, day: "Quarta 18/02", emoji: "🌺" },
  { name: "Ipanema e Leblon",          lat: -22.9868, lng: -43.2029, day: "Quarta 18/02", emoji: "🏄" },
  { name: "Pôr do sol no Arpoador",    lat: -22.9888, lng: -43.1916, day: "Quarta 18/02", emoji: "🌅" },
  { name: "Baixo Botafogo",            lat: -22.9448, lng: -43.1861, day: "Quarta 18/02", emoji: "🍻" },
  { name: "SAARA",                     lat: -22.9048, lng: -43.1817, day: "Quinta 19/02", emoji: "🛍️" },
  { name: "Escadaria Selarón",         lat: -22.9143, lng: -43.1795, day: "Quinta 19/02", emoji: "🎨" },
  { name: "Arcos da Lapa",             lat: -22.9123, lng: -43.1797, day: "Quinta 19/02", emoji: "🏛️" },
  { name: "Museu do Amanhã",           lat: -22.8944, lng: -43.1803, day: "Quinta 19/02", emoji: "🔭" },
  { name: "AquaRio",                   lat: -22.8958, lng: -43.1872, day: "Quinta 19/02", emoji: "🐠" },
  { name: "Bosque Bar",                lat: -22.9741, lng: -43.2303, day: "Quinta 19/02", emoji: "🌳" },
  { name: "Stand Up Paddle",           lat: -22.9669, lng: -43.1778, day: "Sexta 20/02",  emoji: "🏄" },
  { name: "Forte Duque de Caxias",     lat: -22.9591, lng: -43.1710, day: "Sexta 20/02",  emoji: "🏰" },
  { name: "Sunset Morro da Urca",      lat: -22.9487, lng: -43.1614, day: "Sexta 20/02",  emoji: "🌄" },
  { name: "Bar Urca",                  lat: -22.9472, lng: -43.1659, day: "Sexta 20/02",  emoji: "🍹" },
  { name: "Rio Scenarium",             lat: -22.9082, lng: -43.1804, day: "Sexta 20/02",  emoji: "🎶" },
  { name: "Feira da Glória",           lat: -22.9261, lng: -43.1767, day: "Sábado 21/02", emoji: "🎪" },
  { name: "Aterro do Flamengo",        lat: -22.9342, lng: -43.1726, day: "Sábado 21/02", emoji: "🚴" },
];

const DAY_COLORS: Record<string, string> = {
  "Terça 17/02":  "#FFD700",
  "Quarta 18/02": "#4caf50",
  "Quinta 19/02": "#0077B6",
  "Sexta 20/02":  "#e91e8c",
  "Sábado 21/02": "#ff6b35",
};

function makeIcon(emoji: string, color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
      background:${color};
      color:#000;
      width:36px;height:36px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 8px rgba(0,0,0,.5);
      border:2px solid rgba(255,255,255,.4);
    "><span style="transform:rotate(45deg);font-size:16px">${emoji}</span></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -38],
  });
}

export function Mapa() {
  const mapRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || instanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [-22.95, -43.19],
      zoom: 13,
    });
    instanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Dark filter over tiles to match site theme
    const style = document.createElement("style");
    style.textContent = `.leaflet-layer { filter: invert(1) hue-rotate(180deg) brightness(.85) contrast(.9); }
      .leaflet-container { background: #0a0a0a; }`;
    document.head.appendChild(style);

    PINS.forEach((pin) => {
      const color = DAY_COLORS[pin.day] ?? "#FFD700";
      const icon  = makeIcon(pin.emoji, color);
      L.marker([pin.lat, pin.lng], { icon })
        .addTo(map)
        .bindPopup(`
          <strong style="font-size:1rem">${pin.emoji} ${pin.name}</strong><br/>
          <span style="color:${color};font-size:.8rem;font-weight:600">${pin.day}</span>
        `);
    });

    return () => { map.remove(); instanceRef.current = null; };
  }, []);

  return (
    <section className="mapa-section">
      <h2 className="section-title">O ROTEIRO NO MAPA</h2>
      <p className="galeria-sub">Todos os lugares que vocês visitaram — clique nos pins para ver o nome</p>

      <div className="mapa-legend">
        {Object.entries(DAY_COLORS).map(([day, color]) => (
          <span key={day} className="mapa-legend-item">
            <span className="mapa-legend-dot" style={{ background: color }} />
            {day}
          </span>
        ))}
      </div>

      <div ref={mapRef} className="mapa-container" />
    </section>
  );
}
