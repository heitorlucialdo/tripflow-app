import { useState } from "react";
import { Avatar, Sheet } from "../../components/Sheet/Sheet";
import styles from "../../components/Sheet/Sheet.module.css";
import { ConvidarAmigos } from "../../components/ConvidarAmigos/ConvidarAmigos";
import { useAuth } from "../../hooks/useAuth";
import { useTrip } from "../../hooks/useTrip";
import { supabase } from "../../lib/supabase";
import { formatDay, memberLabel } from "../../lib/trip-context";

interface Props {
  onClose: () => void;
  onOpenViagens: () => void;
}

export function Grupo({ onClose, onOpenViagens }: Props) {
  const { user } = useAuth();
  const { activeTrip, members, isAdmin, selectTrip, reloadTrips } = useTrip();
  const [error, setError]       = useState<string | null>(null);

  if (!activeTrip) {
    return (
      <Sheet title="Grupo da viagem" onClose={onClose}>
        <div className={styles.card}>
          <span className={styles.cardTitle}>Você está vendo a viagem demo</span>
          <span className={styles.cardMeta}>Crie sua própria viagem para convidar amigos e dividir gastos em tempo real.</span>
        </div>
        <button className={styles.primaryBtn} onClick={() => { onClose(); onOpenViagens(); }}>
          Criar ou abrir uma viagem
        </button>
      </Sheet>
    );
  }

  const trip = activeTrip;

  async function leaveTrip() {
    if (!user) return;
    const { error: err } = await supabase
      .from("trip_members")
      .delete()
      .eq("trip_id", trip.id)
      .eq("user_id", user.id);
    if (err) { setError("Não foi possível sair da viagem."); return; }
    selectTrip(null);
    await reloadTrips();
    onClose();
  }

  const soleAdmin = isAdmin && members.filter(m => m.role === "admin").length === 1;

  return (
    <Sheet title="Grupo da viagem" onClose={onClose}>
      <div className={styles.card}>
        <span className={styles.cardTitle}>{trip.name}</span>
        <span className={styles.cardMeta}>{trip.origin} → {trip.destination}</span>
        <span className={styles.itemMeta}>{formatDay(trip.start_date)} a {formatDay(trip.end_date)}</span>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Membros · {members.length}</h2>
        <ul className={styles.list}>
          {members.map(m => (
            <li key={m.user_id} className={styles.listItem}>
              <Avatar name={m.name} url={m.avatar_url} />
              <span className={styles.grow}>
                <span className={styles.itemName}>
                  {memberLabel(m)}{m.user_id === user?.id ? " (você)" : ""}
                </span>
                <span className={styles.itemMeta}>
                  {m.pix_key ? "Pix cadastrado" : "Sem chave Pix"}
                </span>
              </span>
              {m.role === "admin" && <span className={styles.badge}>organiza</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Convidar amigos</h2>
        <ConvidarAmigos trip={trip} canInvite={isAdmin} />
        {error && <p className={styles.error}>{error}</p>}
      </section>

      {!soleAdmin && (
        <button className={styles.secondaryBtn} onClick={leaveTrip}>Sair desta viagem</button>
      )}
    </Sheet>
  );
}
