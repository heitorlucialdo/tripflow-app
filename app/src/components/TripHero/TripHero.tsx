import { useEffect, useState } from "react";
import GlobeHero from "../GlobeHero/GlobeHero";
import { Icon } from "../Icon";
import { Sheet } from "../Sheet/Sheet";
import { PlaceSearch } from "../PlaceSearch";
import { useTrip } from "../../hooks/useTrip";
import { geocode, distanceKm, type GeoResult } from "../../lib/places";
import { formatDay, memberLabel, parseDay, type Trip } from "../../lib/trip-context";
import { Avatar } from "../Sheet/Sheet";
import styles from "./TripHero.module.css";

function badge(trip: Trip): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = parseDay(trip.start_date);
  const end = parseDay(trip.end_date);
  const days = Math.round((start.getTime() - today.getTime()) / 86_400_000);
  if (days > 1) return `Faltam ${days} dias`;
  if (days === 1) return "É amanhã!";
  if (today <= end) return "Viagem acontecendo agora";
  return "Viagem concluída";
}

interface Props {
  trip: Trip;
  onInvite: () => void;
  onBudget: () => void;
  onChangeItinerary: () => void;
  onAskAI: () => void;
}

type Editing = "origin" | "destination" | null;

export function TripHero({ trip, onInvite, onBudget, onChangeItinerary, onAskAI }: Props) {
  const { members, updateTrip } = useTrip();
  const [editing, setEditing] = useState<Editing>(null);
  const [error, setError]     = useState<string | null>(null);

  // Viagens criadas antes das coordenadas existirem: descobre pelo nome uma vez e salva
  useEffect(() => {
    if (trip.origin_lat !== null && trip.destination_lat !== null) return;
    let alive = true;
    (async () => {
      try {
        const [o] = trip.origin_lat === null ? await geocode(trip.origin) : [null];
        const [d] = trip.destination_lat === null ? await geocode(trip.destination) : [null];
        if (!alive) return;
        await updateTrip(trip.id, {
          ...(o ? { origin_lat: o.lat, origin_lng: o.lng } : {}),
          ...(d ? { destination_lat: d.lat, destination_lng: d.lng } : {}),
        });
      } catch { /* sem globo, o resto da tela funciona */ }
    })();
    return () => { alive = false; };
  }, [trip.id, trip.origin, trip.destination, trip.origin_lat, trip.destination_lat, updateTrip]);

  async function pick(r: GeoResult) {
    setError(null);
    try {
      await updateTrip(trip.id, editing === "origin"
        ? { origin: r.name, origin_lat: r.lat, origin_lng: r.lng }
        : { destination: r.name, destination_lat: r.lat, destination_lng: r.lng });
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  const hasCoords = trip.origin_lat !== null && trip.origin_lng !== null && trip.destination_lat !== null && trip.destination_lng !== null;
  const from = hasCoords ? { lat: trip.origin_lat as number, lng: trip.origin_lng as number, name: trip.origin } : null;
  const to   = hasCoords ? { lat: trip.destination_lat as number, lng: trip.destination_lng as number, name: trip.destination } : null;
  const km   = from && to ? Math.round(distanceKm(from, to)) : null;

  return (
    <>
      <section className={styles.stage}>
        {from && to ? <GlobeHero from={from} to={to} /> : <div className={styles.globeFallback} />}

        <div className={styles.overlay}>
          <span className={styles.badge}><i />{badge(trip)}</span>
          <h1 className={styles.brand}>Trip<em>Flow</em></h1>
          <p className={styles.tripName}>{trip.name}</p>
        </div>
      </section>

      <section className={styles.hero}>
        <div className={styles.routeCard}>
          <button className={styles.place} onClick={() => setEditing("origin")} aria-label={`Trocar partida (${trip.origin})`}>
            <small>Partida</small>
            <strong>{trip.origin}</strong>
            <span className={styles.swap}><Icon name="pin" size={12} /> trocar</span>
          </button>
          <div className={styles.flight} aria-hidden>
            <span className={styles.dots} />
            <Icon name="plane" size={18} />
            {km !== null && <small>{km.toLocaleString("pt-BR")} km</small>}
          </div>
          <button className={`${styles.place} ${styles.placeEnd}`} onClick={() => setEditing("destination")} aria-label={`Trocar chegada (${trip.destination})`}>
            <small>Chegada</small>
            <strong>{trip.destination}</strong>
            <span className={styles.swap}><Icon name="pin" size={12} /> trocar</span>
          </button>
        </div>

        <p className={styles.dates}>
          {formatDay(trip.start_date, { day: "2-digit", month: "long" })} a {formatDay(trip.end_date, { day: "2-digit", month: "long", year: "numeric" })}
          {" · "}{trip.hours_per_day}h de passeio por dia
        </p>

        <div className={styles.members}>
          <div className={styles.avatars}>
            {members.slice(0, 6).map(m => (
              <span key={m.user_id} className={styles.avatarRing} title={memberLabel(m)}>
                <Avatar name={m.name} url={m.avatar_url} />
              </span>
            ))}
          </div>
          <span className={styles.count}>{members.length} no grupo</span>
          <button className={styles.inviteMini} onClick={onInvite}><Icon name="plus" size={14} /> Convidar</button>
        </div>

        <div className={styles.actions}>
          <button className={styles.primary} onClick={onChangeItinerary}><Icon name="sparkle" size={16} /> Mudar roteiro</button>
          <button className={styles.secondary} onClick={onAskAI}><Icon name="mic" size={16} /> Ajustar com IA</button>
          <button className={styles.ghost} onClick={onBudget}>Quanto vai custar?</button>
        </div>
      </section>

      {editing && (
        <Sheet title={editing === "origin" ? "Trocar local de partida" : "Trocar local de chegada"} onClose={() => setEditing(null)}>
          <PlaceSearch
            placeholder={editing === "origin" ? "De onde vocês saem?" : "Para onde vocês vão?"}
            autoFocus
            onPick={pick}
          />
          {editing === "destination" && (
            <p className={styles.note}>Trocando o destino, use "Mudar roteiro" para a IA montar os passeios da nova cidade.</p>
          )}
          {error && <p className={styles.error}>{error}</p>}
        </Sheet>
      )}
    </>
  );
}
