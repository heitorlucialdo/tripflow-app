import { useEffect } from "react";
import styles from "./MenuLateral.module.css";
import { useAuth } from "../../hooks/useAuth";

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenPerfil: () => void;
  onOpenGrupo: () => void;
  onOpenComoVai: () => void;
}

export function MenuLateral({ open, onClose, onOpenPerfil, onOpenGrupo, onOpenComoVai }: Props) {
  const { user } = useAuth();

  const avatar   = user?.user_metadata?.avatar_url as string | undefined;
  const name     = user?.user_metadata?.full_name as string | undefined;
  const email    = user?.email ?? "";
  const initials = name
    ? name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()
    : email[0]?.toUpperCase() ?? "?";

  // Trava o scroll do fundo enquanto o menu estiver aberto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  function handle(fn: () => void) {
    fn();
    onClose();
  }

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <aside className={styles.drawer}>
        {/* Cabeçalho com info do usuário */}
        <div className={styles.header}>
          {avatar
            ? <img src={avatar} className={styles.avatar} alt="perfil" />
            : <div className={styles.avatarFallback}>{initials}</div>
          }
          <div className={styles.userInfo}>
            <span className={styles.userName}>{name || "Viajante"}</span>
            <span className={styles.userEmail}>{email}</span>
          </div>
        </div>

        <div className={styles.divider} />

        {/* Itens do menu */}
        <nav className={styles.nav}>
          <button className={styles.item} onClick={() => handle(onOpenComoVai)}>
            <span className={styles.itemIcon}>✈️</span>
            <div className={styles.itemText}>
              <span className={styles.itemLabel}>Como Vai</span>
              <span className={styles.itemDesc}>Resumo da sua viagem</span>
            </div>
            <span className={styles.chevron}>›</span>
          </button>

          <button className={styles.item} onClick={() => handle(onOpenGrupo)}>
            <span className={styles.itemIcon}>👥</span>
            <div className={styles.itemText}>
              <span className={styles.itemLabel}>Grupo da Viagem</span>
              <span className={styles.itemDesc}>Membros e convites</span>
            </div>
            <span className={styles.chevron}>›</span>
          </button>

          <button className={styles.item} onClick={() => handle(onOpenPerfil)}>
            <span className={styles.itemIcon}>👤</span>
            <div className={styles.itemText}>
              <span className={styles.itemLabel}>Meu Perfil</span>
              <span className={styles.itemDesc}>Dados da conta</span>
            </div>
            <span className={styles.chevron}>›</span>
          </button>
        </nav>

        <div className={styles.divider} />

        <div className={styles.version}>TripFlow · versão demo</div>
      </aside>
    </>
  );
}
