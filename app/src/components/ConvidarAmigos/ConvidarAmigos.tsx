import { useState } from "react";
import styles from "../Sheet/Sheet.module.css";
import { Icon } from "../Icon";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import type { Trip } from "../../lib/trip-context";

const INVITE_DAYS = 7;

export function ConvidarAmigos({ trip, canInvite }: { trip: Pick<Trip, "id" | "name" | "destination">; canInvite: boolean }) {
  const { user } = useAuth();
  const [link, setLink]         = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  if (!canInvite) return <p className={styles.hint}>Peça o link de convite para quem organiza a viagem.</p>;

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

  const inviteText = link ? `Bora pra ${trip.destination}! Entra no grupo da viagem "${trip.name}" no TripFlow: ${link}` : "";

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

  return (
    <>
      <p className={styles.hint}>
        Um único link serve para o grupo todo e vale por {INVITE_DAYS} dias. Quem abrir entra direto, mesmo sem ter conta.
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
            <a className={styles.primaryBtn} href={`https://wa.me/?text=${encodeURIComponent(inviteText)}`} target="_blank" rel="noopener noreferrer">
              Enviar no WhatsApp
            </a>
            <button className={styles.secondaryBtn} onClick={share}>
              <Icon name="share" size={18} /> {copied ? "Copiado!" : "Compartilhar"}
            </button>
          </div>
        </>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </>
  );
}
