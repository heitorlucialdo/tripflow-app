import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import styles from "./Login.module.css";

export function Login() {
  const navigate = useNavigate();
  const { signInWithGoogle, signInWithEmail, sendOtp, verifyOtp } = useAuth();

  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [fieldError, setFieldError] = useState(false);

  // Esqueceu a senha — etapa 1: email / etapa 2: código
  const [forgotOpen, setForgotOpen]   = useState(false);
  const [forgotStep, setForgotStep]   = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCode, setForgotCode]   = useState("");
  const [forgotErr, setForgotErr]     = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  function openForgot() {
    setForgotOpen(true);
    setForgotStep(1);
    setForgotEmail(email);
    setForgotCode("");
    setForgotErr(null);
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setForgotErr(null);
    if (!forgotEmail.trim()) { setForgotErr("Digite seu email."); return; }
    setForgotLoading(true);
    try {
      await sendOtp(forgotEmail.trim());
      setForgotStep(2);
    } catch {
      setForgotErr("Email não encontrado. Verifique e tente novamente.");
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setForgotErr(null);
    if (forgotCode.trim().length !== 6) { setForgotErr("O código tem 6 dígitos."); return; }
    setForgotLoading(true);
    try {
      await verifyOtp(forgotEmail.trim(), forgotCode.trim());
      setForgotOpen(false);
      navigate("/nova-senha");
    } catch {
      setForgotErr("Código inválido ou expirado. Tente novamente.");
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setFieldError(true);
      setError("Preencha todos os campos.");
      return;
    }

    setFieldError(false);
    setLoading(true);
    try {
      await signInWithEmail(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Email ou senha incorretos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      {/* Topographic background */}
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
        <div className={styles.brand}>
          <img src="/favicon.svg" alt="" className={styles.brandMark} />
          <span>Trip<b>Flow</b></span>
        </div>
        <h1 className={styles.title}>Comece sua jornada</h1>
        <p className={styles.subtitle}>Roteiro, gastos e fotos do grupo — tudo num só lugar.</p>

        {/* Google */}
        <button className={styles.googleBtn} onClick={signInWithGoogle} type="button">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908C16.658 14.075 17.64 11.767 17.64 9.2z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continuar com Google
        </button>

        <div className={styles.divider}><span>Ou continue com</span></div>

        {/* Campos agrupados */}
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={`${styles.inputCard} ${fieldError ? styles.inputCardError : ""}`}>
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
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPass(v => !v)}
                aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPass ? (
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
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.forgotRow}>
            <button type="button" className={styles.forgotBtn} onClick={openForgot}>
              Esqueceu a senha?
            </button>
          </div>

          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? "Aguarde..." : "Continuar"}
          </button>
        </form>

        <p className={styles.footer}>
          Não tem conta?{" "}
          <button className={styles.linkBtn} onClick={() => navigate("/cadastro")}>
            Criar uma conta
          </button>
        </p>
      </div>

      {/* Modal esqueceu a senha */}
      {forgotOpen && (
        <div className={styles.overlay} onClick={() => setForgotOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            {forgotStep === 1 ? (
              <>
                <h2 className={styles.modalTitle}>Recuperar senha</h2>
                <p className={styles.modalDesc}>
                  Digite seu email e enviaremos um código de verificação.
                </p>
                <form onSubmit={handleSendCode} className={styles.modalForm}>
                  <div className={styles.inputCard}>
                    <div className={styles.inputRow}>
                      <input
                        className={styles.input}
                        type="email"
                        placeholder="Seu email"
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                  {forgotErr && <p className={styles.error}>{forgotErr}</p>}
                  <button className={styles.submitBtn} type="submit" disabled={forgotLoading}>
                    {forgotLoading ? "Enviando..." : "Enviar código"}
                  </button>
                  <button type="button" className={styles.modalClose} onClick={() => setForgotOpen(false)}>
                    Cancelar
                  </button>
                </form>
              </>
            ) : (
              <>
                <h2 className={styles.modalTitle}>Digite o código</h2>
                <p className={styles.modalDesc}>
                  Enviamos um código de 6 dígitos para <strong>{forgotEmail}</strong>.
                </p>
                <form onSubmit={handleVerifyCode} className={styles.modalForm}>
                  <div className={styles.inputCard}>
                    <div className={styles.inputRow}>
                      <input
                        className={styles.input}
                        type="text"
                        inputMode="numeric"
                        placeholder="000000"
                        maxLength={6}
                        value={forgotCode}
                        onChange={e => setForgotCode(e.target.value.replace(/\D/g, ""))}
                        autoFocus
                        style={{ letterSpacing: "0.3em", textAlign: "center", fontSize: "1.3rem" }}
                      />
                    </div>
                  </div>
                  {forgotErr && <p className={styles.error}>{forgotErr}</p>}
                  <button className={styles.submitBtn} type="submit" disabled={forgotLoading}>
                    {forgotLoading ? "Verificando..." : "Confirmar código"}
                  </button>
                  <button type="button" className={styles.modalClose} onClick={() => setForgotStep(1)}>
                    Voltar
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
