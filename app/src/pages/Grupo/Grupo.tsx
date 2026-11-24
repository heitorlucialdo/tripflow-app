import { useEffect, useState } from "react";
import styles from "./Grupo.module.css";

interface Props {
  onClose?: () => void;
}

export function Grupo({ onClose }: Props) {
  const [codigoEntrar, setCodigoEntrar] = useState("");
  const [copiado,      setCopiado]      = useState(false);

  // Código demo da viagem atual — virá do Supabase na próxima fase
  const CODIGO_VIAGEM = "TRIP-VDA2026";

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  function copiarCodigo() {
    navigator.clipboard.writeText(CODIGO_VIAGEM);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function handleEntrar(e: React.FormEvent) {
    e.preventDefault();
    // TODO: chamar backend para validar código e entrar na viagem
    alert(`Entrando na viagem com código: ${codigoEntrar}`);
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className={styles.sheet}>
        <div className={styles.handle} />

        <h1 className={styles.title}>Grupo da Viagem</h1>

        {/* Card da viagem atual */}
        <div className={styles.tripCard}>
          <div className={styles.tripInfo}>
            <span className={styles.tripName}>Viagem dos Amigos</span>
            <span className={styles.tripRoute}>Cuiabá → Rio de Janeiro</span>
            <span className={styles.tripDates}>16 – 22 Fev 2026</span>
          </div>
        </div>

        {/* Membros — vazio até convidar alguém */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Membros</h2>
            <button className={styles.addBtn}>+ Adicionar</button>
          </div>
          <div className={styles.emptyMembers}>
            <span className={styles.emptyIcon}>👥</span>
            <p className={styles.emptyText}>Nenhum membro ainda. Compartilhe o código abaixo para convidar alguém.</p>
          </div>
        </section>

        {/* Código da viagem */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Código da viagem</h2>
          <p className={styles.hint}>Compartilhe este código com quem você quer convidar</p>
          <div className={styles.codigoBox}>
            <span className={styles.codigoText}>{CODIGO_VIAGEM}</span>
            <button className={styles.copyBtn} onClick={copiarCodigo}>
              {copiado ? "Copiado!" : "Copiar"}
            </button>
          </div>
        </section>

        {/* Entrar em outra viagem */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Entrar em uma viagem</h2>
          <p className={styles.hint}>Cole o código que alguém compartilhou com você</p>
          <form className={styles.entrarForm} onSubmit={handleEntrar}>
            <div className={styles.inputWrap}>
              <input
                className={styles.input}
                value={codigoEntrar}
                onChange={e => setCodigoEntrar(e.target.value.toUpperCase())}
                placeholder="Ex: TRIP-A3K9"
              />
            </div>
            <button className={styles.entrarBtn} type="submit" disabled={!codigoEntrar.trim()}>
              Entrar
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
