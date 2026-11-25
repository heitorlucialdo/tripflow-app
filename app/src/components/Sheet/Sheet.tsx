import { useEffect, type ReactNode } from "react";
import { Icon } from "../Icon";
import styles from "./Sheet.module.css";

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Sheet({ title, onClose, children }: Props) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-label={title}>
        <div className={styles.handle} />
        <div className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar">
            <Icon name="close" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) return <img src={url} className={styles.avatar} alt="" />;
  const initials = name.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
  return <div className={styles.avatarFallback} aria-hidden="true">{initials}</div>;
}
