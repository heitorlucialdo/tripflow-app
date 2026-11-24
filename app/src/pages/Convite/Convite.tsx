import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "../../components/Sheet/Sheet.module.css";
import page from "./Convite.module.css";
import { useAuth } from "../../hooks/useAuth";
import { useTrip } from "../../hooks/useTrip";
import { supabase } from "../../lib/supabase";
import { formatDay, PENDING_INVITE_KEY } from "../../lib/trip-context";


interface Preview {
  trip_id: string;
  name: string;
  origin: string;
  destination: string;
  start_date: string;
  end_date: string;
  members: string[];
}

const ERRORS: Record<string, string> = {
  invalid_token:      "Este convite não existe. Peça um novo link para quem organiza.",
  token_expired:      "Este convite expirou. Peça um novo link para quem organiza.",
  token_already_used: "Este convite já foi usado. Peça um novo link para quem organiza.",
  not_authenticated:  "Entre na sua conta para aceitar o convite.",
};

export function Convite() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { selectTrip, reloadTrips } = useTrip();

  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [name, setName]       = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    supabase.rpc("invite_preview", { p_token: token }).then(({ data, error: err }) => {
      const result = data as (Preview & { error?: string }) | null;
      if (err || !result) setError("Não foi possível abrir o convite.");
      else if (result.error) {
        setError(ERRORS[result.error] ?? "Convite inválido.");
        try { sessionStorage.removeItem(PENDING_INVITE_KEY); } catch { /* armazenamento indisponível */ }
      }
      else setPreview(result);
    });
  }, [token]);

  async function accept() {
    const { data, error: err } = await supabase.rpc("accept_invite", { p_token: token });
    const result = data as { success?: boolean; error?: string; trip_id?: string } | null;
    if (err || !result) throw new Error("Não foi possível entrar na viagem.");
    if (result.error && result.error !== "already_member") throw new Error(ERRORS[result.error] ?? "Convite inválido.");
    try { sessionStorage.removeItem(PENDING_INVITE_KEY); } catch { /* armazenamento indisponível */ }
    await reloadTrips();
    if (result.trip_id) selectTrip(result.trip_id);
    navigate("/", { replace: true });
  }

  async function joinAsMember() {
    setJoining(true); setError(null);
    try { await accept(); } catch (e) { setError(e instanceof Error ? e.message : "Erro ao entrar."); setJoining(false); }
  }

  async function joinAsGuest(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setJoining(true); setError(null);
    const { error: err } = await supabase.auth.signInAnonymously({ options: { data: { full_name: name.trim() } } });
    if (err) {
      setError("Entrada sem conta indisponível no momento. Use \"Já tenho conta\".");
      setJoining(false);
      return;
    }
    try { await accept(); } catch (e2) { setError(e2 instanceof Error ? e2.message : "Erro ao entrar."); setJoining(false); }
  }

  function goToLogin() {
    try { sessionStorage.setItem(PENDING_INVITE_KEY, token); } catch { /* armazenamento indisponível */ }
    navigate("/login");
  }

  return (
    <main className={page.wrap}>
      <div className={page.panel}>
        <span className={page.kicker}>Convite de viagem</span>

        {!preview && !error && <p className={styles.hint}>Abrindo convite...</p>}

        {preview && (
          <>
            <h1 className={page.title}>{preview.name}</h1>
            <p className={page.route}>{preview.origin} → {preview.destination}</p>
            <p className={styles.itemMeta}>
              {formatDay(preview.start_date, { day: "2-digit", month: "long" })} a {formatDay(preview.end_date, { day: "2-digit", month: "long" })}
            </p>
            {preview.members.length > 0 && (
              <p className={styles.hint}>Já estão no grupo: {preview.members.join(", ")}</p>
            )}
          </>
        )}

        {error && <p className={styles.error}>{error}</p>}

        {error && !preview && (
          <button className={styles.secondaryBtn} onClick={() => navigate("/", { replace: true })}>Ir para o app</button>
        )}

        {preview && !authLoading && (
          user ? (
            <button className={styles.primaryBtn} onClick={joinAsMember} disabled={joining}>
              {joining ? "Entrando..." : "Entrar na viagem"}
            </button>
          ) : (
            <>
              <form className={styles.form} onSubmit={joinAsGuest}>
                <label className={styles.label}>
                  Como o grupo te chama?
                  <input className={styles.input} value={name} onChange={e => setName(e.target.value)}
                    placeholder="Seu nome ou apelido" maxLength={40} autoFocus />
                </label>
                <button className={styles.primaryBtn} type="submit" disabled={!name.trim() || joining}>
                  {joining ? "Entrando..." : "Entrar sem criar conta"}
                </button>
              </form>
              <button className={styles.secondaryBtn} onClick={goToLogin} disabled={joining}>
                Já tenho conta
              </button>
            </>
          )
        )}
      </div>
    </main>
  );
}
