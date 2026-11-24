import { useState } from "react";
import { Avatar, Sheet } from "../../components/Sheet/Sheet";
import styles from "../../components/Sheet/Sheet.module.css";
import { Icon } from "../../components/Icon";
import { useAuth } from "../../hooks/useAuth";
import { useTrip } from "../../hooks/useTrip";
import { supabase } from "../../lib/supabase";
import { formatDay, memberLabel } from "../../lib/trip-context";

interface Props {
  onClose: () => void;
  onOpenViagens: () => void;
}

const INVITE_DAYS = 7;

export function Grupo({ onClose, onOpenViagens }: Props) {
  const { user } = useAuth();
  const { activeTrip, members, isAdmin, selectTrip, reloadTrips } = useTrip();
  const [link, setLink]         = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied]     = useState(false);
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

  async function generateLink() {
    if (!user) return;
    setCreating(true); setError(null);
    const expires = new Date(Date.now() + INVITE_DAYS * 86_400_000).toISOString();
    const { data, error: err } = await supabase
      .from("invites")
      .insert({ trip_id: trip.id, created_by: user.id, multi_use: true, expires_at: expires })
      .select("token")
      .single();
    setCreating(false);
    if (err || !data) { setError("Não foi possível gerar o convite."); return; }
    setLink(`${window.location.origin}/convite/${(data as { token: string }).token}`);
  }

  const inviteText = link
    ? `Bora pra ${trip.destination}! Entra no grupo da viagem "${trip.name}" no TripFlow: ${link}`
    : "";

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    if (!link) return;
    if (navigator.share) {
      try { await navigator.share({ title: trip.name, text: inviteText }); } catch { /* compartilhamento cancelado */ }
    } else {
      await copy();
    }
  }

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
        {isAdmin ? (
          <>
            <p className={styles.hint}>
              Um único link serve para o grupo todo e vale por {INVITE_DAYS} dias.
              Quem abrir entra direto, mesmo sem ter conta.
            </p>
            {!link && (
              <button className={styles.primaryBtn} onClick={generateLink} disabled={creating}>
                <Icon name="link" size={18} /> {creating ? "Gerando..." : "Gerar link de convite"}
              </button>
            )}
            {link && (
              <>
                <div className={styles.linkBox}>{link}</div>
                <div className={styles.actions}>
                  <a
                    className={styles.primaryBtn}
                    href={`https://wa.me/?text=${encodeURIComponent(inviteText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Enviar no WhatsApp
                  </a>
                  <button className={styles.secondaryBtn} onClick={share}>
                    <Icon name="share" size={18} /> {copied ? "Copiado!" : "Compartilhar"}
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <p className={styles.hint}>Peça o link de convite para quem organiza a viagem.</p>
        )}
        {error && <p className={styles.error}>{error}</p>}
      </section>

      {!soleAdmin && (
        <button className={styles.secondaryBtn} onClick={leaveTrip}>Sair desta viagem</button>
      )}
    </Sheet>
  );
}
