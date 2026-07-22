import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import styles from "./NovaSenha.module.css";

export function NovaSenha() {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();

  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState(false);
  const [loading, setLoading]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!password || !confirm) { setError("Preencha os dois campos."); return; }
    if (password.length < 6)   { setError("A senha deve ter no mínimo 6 caracteres."); return; }
    if (password !== confirm)  { setError("As senhas não coincidem."); return; }

    setLoading(true);
    try {
      await updatePassword(password);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch {
      setError("Não foi possível atualizar a senha. O link pode ter expirado.");
    } finally {
      setLoading(false);
    }
  }

  const EyeBtn = ({ show, toggle }: { show: boolean; toggle: () => void }) => (
    <button type="button" className={styles.eyeBtn} onClick={toggle} aria-label={show ? "Ocultar" : "Mostrar"}>
      {show ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a0b4c8" strokeWidth="2">
          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a0b4c8" strokeWidth="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      )}
    </button>
  );

  return (
    <div className={styles.page}>
      <div className={styles.topoBg} aria-hidden="true">
        <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <g fill="none" stroke="#4fc3f7" strokeWidth="0.8" opacity="0.07">
            {[80,110,140,170,200,230,260,290,320].map((ry, i) => (
              <ellipse key={i} cx="200" cy="-20" rx={160 + i * 40} ry={ry} />
            ))}
          </g>
        </svg>
      </div>

      <div className={styles.card}>
        <div className={styles.iconBox}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0011 2a1.5 1.5 0 00-1.5 1.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="#4fc3f7"/>
          </svg>
        </div>

        <h1 className={styles.title}>Nova senha</h1>
        <p className={styles.desc}>Escolha uma senha forte para sua conta.</p>

        {success ? (
          <div className={styles.successBox}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#4ade8020" stroke="#4ade80" strokeWidth="1.5"/>
              <path d="M8 12l3 3 5-5" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className={styles.successText}>Senha atualizada! Redirecionando para o login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className={styles.inputCard}>
              <div className={styles.inputRow}>
                <input
                  className={styles.input}
                  type={showPass ? "text" : "password"}
                  placeholder="Nova senha"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                  autoFocus
                />
                <EyeBtn show={showPass} toggle={() => setShowPass(v => !v)} />
              </div>
              <div className={styles.inputDivider} />
              <div className={styles.inputRow}>
                <input
                  className={styles.input}
                  type={showConf ? "text" : "password"}
                  placeholder="Confirmar nova senha"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
                <EyeBtn show={showConf} toggle={() => setShowConf(v => !v)} />
              </div>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button className={styles.submitBtn} type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar nova senha"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
