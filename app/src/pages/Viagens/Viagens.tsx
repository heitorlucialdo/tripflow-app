import { Sheet } from "../../components/Sheet/Sheet";
import styles from "../../components/Sheet/Sheet.module.css";
import { useAuth } from "../../hooks/useAuth";
import { useTrip } from "../../hooks/useTrip";
import { formatDay, DEMO_TRIP_ID } from "../../lib/trip-context";

interface Props {
  onClose: () => void;
  onCreateNew: () => void;
}

export function Viagens({ onClose, onCreateNew }: Props) {
  const { user } = useAuth();
  const { trips, activeTrip, demoMode, selectTrip } = useTrip();

  function pick(id: string | null) {
    selectTrip(id);
    onClose();
  }

  return (
    <Sheet title="Minhas viagens" onClose={onClose}>
          <>
            {!user && (
              <p className={styles.hint}>Entre na sua conta para criar viagens e convidar seus amigos.</p>
            )}

            <ul className={styles.list}>
              {trips.map(t => (
                <li key={t.id}>
                  <button
                    className={`${styles.listItem} ${activeTrip?.id === t.id ? styles.listItemActive : ""}`}
                    style={{ width: "100%", textAlign: "left", cursor: "pointer", font: "inherit" }}
                    onClick={() => pick(t.id)}
                  >
                    <span className={styles.grow}>
                      <span className={styles.itemName}>{t.name}</span>
                      <span className={styles.itemMeta}>
                        {t.origin} → {t.destination} · {formatDay(t.start_date)} a {formatDay(t.end_date)}
                      </span>
                    </span>
                    {activeTrip?.id === t.id && <span className={styles.badge}>aberta</span>}
                  </button>
                </li>
              ))}
              <li>
                <button
                  className={`${styles.listItem} ${demoMode ? styles.listItemActive : ""}`}
                  style={{ width: "100%", textAlign: "left", cursor: "pointer", font: "inherit" }}
                  onClick={() => pick(DEMO_TRIP_ID)}
                >
                  <span className={styles.grow}>
                    <span className={styles.itemName}>Ver exemplo</span>
                    <span className={styles.itemMeta}>Viagem de demonstração, Cuiabá → Rio</span>
                  </span>
                  {demoMode && <span className={styles.badge}>aberta</span>}
                </button>
              </li>
            </ul>

            <button className={styles.primaryBtn} onClick={onCreateNew} disabled={!user}>
              Criar nova viagem
            </button>
          </>
    </Sheet>
  );
}
