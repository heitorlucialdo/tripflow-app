import { useTrip } from "../../hooks/useTrip";
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
}

export function TripHero({ trip, onInvite, onBudget }: Props) {
  const { members } = useTrip();

  return (
    <section className={styles.hero}>
      <span className={styles.badge}>{badge(trip)}</span>
      <h1 className={styles.title}>{trip.name}</h1>
      <p className={styles.route}>{trip.origin} → {trip.destination}</p>
      <p className={styles.dates}>
        {formatDay(trip.start_date, { day: "2-digit", month: "long" })} a {formatDay(trip.end_date, { day: "2-digit", month: "long", year: "numeric" })}
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
      </div>

      <div className={styles.actions}>
        <button className={styles.primary} onClick={onInvite}>Convidar amigos</button>
        <button className={styles.secondary} onClick={onBudget}>Quanto vai custar?</button>
      </div>
    </section>
  );
}
