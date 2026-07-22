import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import styles from "./Cadastro.module.css";

export function Cadastro() {
  const navigate = useNavigate();
  const { signUpWithEmail } = useAuth();

  const [name, setName]             = useState("");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [showConf, setShowConf]     = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [info, setInfo]             = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [fieldError, setFieldError] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!name.trim() || !email.trim() || !password.trim() || !confirm.trim()) {
      setFieldError(true);
      setError("Preencha todos os campos.");
      return;
    }

    if (password !== confirm) {
      setFieldError(true);
      setError("As senhas não coincidem.");
      return;
    }

    if (password.length < 6) {
      setFieldError(true);
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setFieldError(false);
    setLoading(true);
    try {
      await signUpWithEmail(email, password, name);
      setInfo("Conta criada! Verifique seu email para confirmar o cadastro.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  }

  const EyeIcon = ({ open }: { open: boolean }) => open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a0b4c8" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a0b4c8" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );

  return (
    <div className={styles.page}>
      <div className={styles.topoBg} aria-hidden="true">
        <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <g fill="none" stroke="#4fc3f7" strokeWidth="0.8" opacity="0.07">
            <ellipse cx="200" cy="-20" rx="160" ry="80" />
            <ellipse cx="200" cy="-20" rx="200" ry="110" />
            <ellipse cx="200" cy="-20" rx="240" ry="140" />
            <ellipse cx="200" cy="-20" rx="280" ry="170" />
            <ellipse cx="200" cy="-20" rx="320" ry="200" />
            <ellipse cx="200" cy="-20" rx="360" ry="230" />
            <ellipse cx="200" cy="-20" rx="400" ry="260" />
            <ellipse cx="200" cy="-20" rx="440" ry="290" />
            <ellipse cx="200" cy="-20" rx="480" ry="320" />
          </g>
        </svg>
      </div>

      <div className={styles.card}>
        <h1 className={styles.title}>Crie sua conta</h1>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={`${styles.inputCard} ${fieldError ? styles.inputCardError : ""}`}>
            <div className={styles.inputRow}>
              <input
                className={styles.input}
                type="text"
                placeholder="Nome completo"
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div className={styles.inputDivider} />
            <div className={styles.inputRow}>
              <input
                className={styles.input}
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className={styles.inputDivider} />
            <div className={styles.inputRow}>
              <input
                className={styles.input}
                type={showPass ? "text" : "password"}
                placeholder="Senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowPass(v => !v)}>
                <EyeIcon open={showPass} />
              </button>
            </div>
            <div className={styles.inputDivider} />
            <div className={styles.inputRow}>
              <input
                className={styles.input}
                type={showConf ? "text" : "password"}
                placeholder="Confirmar senha"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowConf(v => !v)}>
                <EyeIcon open={showConf} />
              </button>
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}
          {info  && <p className={styles.info}>{info}</p>}

          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? "Aguarde..." : "Criar conta"}
          </button>
        </form>

        <p className={styles.footer}>
          Já tem conta?{" "}
          <button className={styles.linkBtn} onClick={() => navigate("/login")}>
            Entrar
          </button>
        </p>
      </div>
    </div>
  );
}
