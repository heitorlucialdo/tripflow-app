import { useState } from "react";
import { Sheet } from "../../components/Sheet/Sheet";
import styles from "../../components/Sheet/Sheet.module.css";
import { useAuth } from "../../hooks/useAuth";
import { useTrip } from "../../hooks/useTrip";
import { formatDay, DEMO_TRIP_ID } from "../../lib/trip-context";

interface Props {
  onClose: () => void;
  startCreating?: boolean;
}

export function Viagens({ onClose, startCreating = false }: Props) {
  const { user } = useAuth();
  const { trips, activeTrip, demoMode, selectTrip, createTrip } = useTrip();
  const [creating, setCreating] = useState(startCreating);

  function pick(id: string | null) {
    selectTrip(id);
    onClose();
  }

  return (
    <Sheet title={creating ? "Nova viagem" : "Minhas viagens"} onClose={onClose}>
      {creating
        ? <NovaViagemForm
            onCancel={() => setCreating(false)}
            onCreate={async input => { await createTrip(input); onClose(); }}
          />
        : (
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

            <button className={styles.primaryBtn} onClick={() => setCreating(true)} disabled={!user}>
              Criar nova viagem
            </button>
          </>
        )}
    </Sheet>
  );
}

interface FormProps {
  onCancel: () => void;
  onCreate: (input: { name: string; origin: string; destination: string; start_date: string; end_date: string }) => Promise<void>;
}

function NovaViagemForm({ onCancel, onCreate }: FormProps) {
  const [name, setName]               = useState("");
  const [origin, setOrigin]           = useState("");
  const [destination, setDestination] = useState("");
  const [start, setStart]             = useState("");
  const [end, setEnd]                 = useState("");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const valid = name.trim() && origin.trim() && destination.trim() && start && end && end >= start;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSaving(true); setError(null);
    try {
      await onCreate({
        name: name.trim(),
        origin: origin.trim(),
        destination: destination.trim(),
        start_date: start,
        end_date: end,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a viagem.");
      setSaving(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <label className={styles.label}>
        Nome da viagem
        <input className={styles.input} value={name} onChange={e => setName(e.target.value)}
          placeholder="Ex.: Carnaval em Salvador" maxLength={80} required />
      </label>
      <div className={styles.row}>
        <label className={styles.label}>
          Saindo de
          <input className={styles.input} value={origin} onChange={e => setOrigin(e.target.value)}
            placeholder="Cuiabá" maxLength={60} required />
        </label>
        <label className={styles.label}>
          Indo para
          <input className={styles.input} value={destination} onChange={e => setDestination(e.target.value)}
            placeholder="Salvador" maxLength={60} required />
        </label>
      </div>
      <div className={styles.row}>
        <label className={styles.label}>
          Ida
          <input className={styles.input} type="date" value={start} onChange={e => setStart(e.target.value)} required />
        </label>
        <label className={styles.label}>
          Volta
          <input className={styles.input} type="date" value={end} min={start || undefined}
            onChange={e => setEnd(e.target.value)} required />
        </label>
      </div>
      {start && end && end < start && <p className={styles.error}>A volta precisa ser depois da ida.</p>}
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        <button type="button" className={styles.secondaryBtn} onClick={onCancel}>Voltar</button>
        <button type="submit" className={styles.primaryBtn} disabled={!valid || saving}>
          {saving ? "Criando..." : "Criar viagem"}
        </button>
      </div>
      <p className={styles.hint}>Depois de criar, você recebe um link para chamar o grupo pelo WhatsApp.</p>
    </form>
  );
}
