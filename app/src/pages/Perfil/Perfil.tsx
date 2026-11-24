import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useProfile } from "../../hooks/useProfile";
import { supabase } from "../../lib/supabase";
import styles from "./Perfil.module.css";

interface Props {
  onClose: () => void;
}

type Section = "perfil" | "conta";

export function Perfil({ onClose }: Props) {
  const { user, signOut, updatePassword } = useAuth();
  const { saveProfile } = useProfile();
  const fileRef = useRef<HTMLInputElement>(null);

  const [section, setSection]           = useState<Section>("perfil");
  const [saving,  setSaving]            = useState(false);
  const [saved,   setSaved]             = useState(false);
  const [error,   setError]             = useState<string | null>(null);
  const [uploading, setUploading]       = useState(false);

  // Campos de perfil
  const [name,           setName]           = useState(user?.user_metadata?.full_name ?? "");
  const [nickname,       setNickname]       = useState(user?.user_metadata?.nickname ?? "");
  const [phone,          setPhone]          = useState(user?.user_metadata?.phone ?? "");
  const [cpf,            setCpf]            = useState(user?.user_metadata?.cpf ?? "");
  const [emergencyEmail, setEmergencyEmail] = useState(user?.user_metadata?.emergency_email ?? "");
  const [avatarUrl,      setAvatarUrl]      = useState<string>(
    (user?.user_metadata?.avatar_url as string) ?? ""
  );

  // Campos de conta
  const [newEmail,    setNewEmail]    = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const email    = user?.email ?? "";
  const initials = name
    ? name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()
    : email[0]?.toUpperCase() ?? "?";

  // ─── Upload de foto ────────────────────────────────────────
  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    setError(null);

    const ext  = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadErr) { setError("Erro ao enviar foto."); setUploading(false); return; }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = data.publicUrl + `?t=${Date.now()}`;

    // Salva nos dois lugares para ficar disponível para outros usuários
    await supabase.auth.updateUser({ data: { avatar_url: url } });
    await saveProfile({ avatar_url: url });
    setAvatarUrl(url);
    setUploading(false);
  }

  // ─── Salvar perfil ─────────────────────────────────────────
  async function handleSavePerfil(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSaving(true);

    // Salva no auth metadata (nome e avatar)
    const { error: authErr } = await supabase.auth.updateUser({
      data: { full_name: name, nickname, phone, emergency_email: emergencyEmail },
    });

    // Salva campos extras na tabela profiles
    const dbErr = await saveProfile({
      name,
      nickname,
      phone,
      cpf,
      emergency_email: emergencyEmail,
    });

    setSaving(false);
    if (authErr || dbErr) { setError("Erro ao salvar. Tente novamente."); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // ─── Salvar conta ──────────────────────────────────────────
  async function handleSaveConta(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword && newPassword !== confirmPass) {
      setError("As senhas não coincidem.");
      return;
    }

    setSaving(true);

    const updates: { email?: string; password?: string } = {};
    if (newEmail)    updates.email    = newEmail;
    if (newPassword) updates.password = newPassword;

    if (Object.keys(updates).length === 0) { setSaving(false); return; }

    const { error } = await supabase.auth.updateUser(updates);
    setSaving(false);
    if (error) { setError(error.message); return; }

    setSaved(true);
    setNewEmail(""); setNewPassword(""); setConfirmPass("");
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleSignOut() {
    await signOut();
    onClose();
  }

  function formatCpf(v: string) {
    return v.replace(/\D/g, "")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
      .slice(0, 14);
  }

  function formatPhone(v: string) {
    return v.replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d{4})$/, "$1-$2")
      .slice(0, 15);
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.sheet}>
        <div className={styles.handle} />

        {/* Avatar + nome */}
        <div className={styles.avatarArea}>
          <button
            className={styles.avatarBtn}
            onClick={() => fileRef.current?.click()}
            aria-label="Trocar foto de perfil"
          >
            {avatarUrl
              ? <img src={avatarUrl} className={styles.avatar} alt="foto" />
              : <div className={styles.avatarFallback}>{initials}</div>
            }
            <span className={styles.avatarOverlay}>
              {uploading ? "..." : "📷"}
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className={styles.fileInput}
            onChange={handlePhotoChange}
          />
          <div className={styles.userInfo}>
            <span className={styles.userName}>{name || nickname || "Viajante"}</span>
            <span className={styles.userEmail}>{email}</span>
            {nickname && <span className={styles.userNickname}>@{nickname}</span>}
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${section === "perfil" ? styles.tabActive : ""}`}
            onClick={() => setSection("perfil")}
          >Perfil</button>
          <button
            className={`${styles.tab} ${section === "conta" ? styles.tabActive : ""}`}
            onClick={() => setSection("conta")}
          >Conta</button>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        {/* ── Seção Perfil ── */}
        {section === "perfil" && (
          <form id="form-perfil" className={styles.form} onSubmit={handleSavePerfil}>
            <div className={styles.scrollArea}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Nome completo</label>
                <div className={styles.inputWrap}>
                  <input className={styles.input} value={name}
                    onChange={e => setName(e.target.value)} placeholder="Seu nome" />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Apelido <span className={styles.labelHint}>(visível para o grupo)</span></label>
                <div className={styles.inputWrap}>
                  <input className={styles.input} value={nickname}
                    onChange={e => setNickname(e.target.value.toLowerCase().replace(/\s/g, ""))}
                    placeholder="ex: rafa, marquinhos" />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Celular <span className={styles.labelHint}>(emergência)</span></label>
                <div className={styles.inputWrap}>
                  <input className={styles.input} value={phone} inputMode="tel"
                    onChange={e => setPhone(formatPhone(e.target.value))}
                    placeholder="(00) 00000-0000" />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Email de emergência</label>
                <div className={styles.inputWrap}>
                  <input className={styles.input} value={emergencyEmail} type="email"
                    onChange={e => setEmergencyEmail(e.target.value)}
                    placeholder="contato@exemplo.com" />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>CPF</label>
                <div className={styles.inputWrap}>
                  <input className={styles.input} value={cpf} inputMode="numeric"
                    onChange={e => setCpf(formatCpf(e.target.value))}
                    placeholder="000.000.000-00" />
                </div>
                <p className={styles.fieldHint}>Usado apenas internamente, não é exibido para outros usuários</p>
              </div>

              <button type="button" className={styles.signOutBtn} onClick={handleSignOut}>
                Sair da conta
              </button>
            </div>

            <div className={styles.stickyFooter}>
              <button className={styles.saveBtn} type="submit" disabled={saving}>
                {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar perfil"}
              </button>
            </div>
          </form>
        )}

        {/* ── Seção Conta ── */}
        {section === "conta" && (
          <form id="form-conta" className={styles.form} onSubmit={handleSaveConta}>
            <div className={styles.scrollArea}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Email atual</label>
                <div className={styles.inputWrap}>
                  <input className={styles.input} value={email} disabled />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Novo email</label>
                <div className={styles.inputWrap}>
                  <input className={styles.input} value={newEmail} type="email"
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="novo@email.com" />
                </div>
              </div>

              <div className={styles.divider} />

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Nova senha</label>
                <div className={styles.inputWrap}>
                  <input className={styles.input} value={newPassword} type="password"
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres" />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Confirmar nova senha</label>
                <div className={styles.inputWrap}>
                  <input className={styles.input} value={confirmPass} type="password"
                    onChange={e => setConfirmPass(e.target.value)}
                    placeholder="Repita a senha" />
                </div>
              </div>

              <button type="button" className={styles.signOutBtn} onClick={handleSignOut}>
                Sair da conta
              </button>
            </div>

            <div className={styles.stickyFooter}>
              <button className={styles.saveBtn} type="submit" disabled={saving}>
                {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar alterações"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
