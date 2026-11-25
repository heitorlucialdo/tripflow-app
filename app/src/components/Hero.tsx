import { useState } from "react";
import GlobeHero from "./GlobeHero/GlobeHero";
import { Icon } from "./Icon";
import { distanceKm } from "../lib/places";
import type { TripRoute } from "../hooks/useTripRoute";

const TRIP_START = new Date("2026-02-16T00:00:00-03:00");
const TRIP_END   = new Date("2026-02-22T23:59:59-03:00");

function getDaysBadge() {
  const now = Date.now();
  if (now < TRIP_START.getTime()) {
    const days = Math.ceil((TRIP_START.getTime() - now) / 86_400_000);
    return { label: `Faltam ${days} dias`, tone: "soon" };
  }
  if (now <= TRIP_END.getTime()) {
    return { label: "Viagem acontecendo agora", tone: "live" };
  }
  const days = Math.floor((now - TRIP_END.getTime()) / 86_400_000);
  return { label: `Concluída há ${days} dias`, tone: "past" };
}

interface Props {
  route: TripRoute;
  onPlan: () => void;
  onChangeRoute: () => void;
}

export function Hero({ route, onPlan, onChangeRoute }: Props) {
  const { origin, destination } = route;
  // O roteiro demo (data.ts) é do Rio; para outros destinos mostramos o estado de planejamento
  const isDemo = /rio de janeiro/i.test(destination.name);
  const km = Math.round(distanceKm(origin, destination));
  const badge = isDemo ? getDaysBadge() : { label: `Planejando · ${km.toLocaleString("pt-BR")} km`, tone: "soon" };
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="hero hero--globe">

      {/* Overlay com título e info — fica por cima */}
      <div className="hero-overlay">
        <div className="hero-dots" />
        <span className={`hero-badge hero-badge--${badge.tone}`}>
          <i />
          {badge.label}
        </span>
        <h1 className="hero-title">
          Viagem<br /><em>dos Amigos</em>
        </h1>
        <div className="hero-route hero-route--names">
          <span><b>{origin.name}</b>Origem</span>
          <span className="hero-route-line"><Icon name="plane" size={16} /></span>
          <span><b>{destination.name}</b>Destino</span>
        </div>
        <p className="hero-dates">
          {isDemo ? "16 — 22 fev 2026 · 4 amigos" : "Monte o roteiro com passeios, restaurantes e baladas"}
          {" · "}
          <button className="hero-change" onClick={onChangeRoute}>trocar</button>
        </p>

        <button className="hero-plan" onClick={onPlan}>
          <Icon name="sparkle" size={18} />
          Planejar roteiro em {destination.name}
        </button>

        <div className="hero-share">
          <a
            className="share-btn share-whatsapp"
            href={`https://wa.me/?text=${encodeURIComponent(`Olha o roteiro da nossa viagem para ${destination.name}!\n` + window.location.href)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.113.549 4.1 1.51 5.833L0 24l6.336-1.48A11.934 11.934 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.807 9.807 0 01-5.006-1.371l-.36-.214-3.722.869.936-3.62-.235-.372A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
            </svg>
            WhatsApp
          </a>
          <button className="share-btn share-copy" onClick={copyLink}>
            <Icon name="share" size={16} />
            {copied ? "Link copiado" : "Copiar link"}
          </button>
        </div>

      </div>

      {/* Globo Three.js — renderiza por baixo do overlay */}
      <GlobeHero from={origin} to={destination} />

    </section>
  );
}
