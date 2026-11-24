import { useState } from "react";
import { parseDay } from "../../lib/trip-context";
import styles from "./CompartilharLocalizacao.module.css";

interface Props {
  tripEnd: string;
  ready: boolean;
  sharing: boolean;
  shareUntil: Date | null;
  othersCount: number;
  error: string | null;
  onStart: (until: Date) => void;
  onStop: () => void;
}

const HOUR = 3_600_000;

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 0, 0);
  return d;
}

export function CompartilharLocalizacao({ tripEnd, ready, sharing, shareUntil, othersCount, error, onStart, onStop }: Props) {
  const [choosing, setChoosing] = useState(false);

  // O banco aceita no máximo 24 h por vez; depois da viagem não faz sentido.
  const tripOver = new Date() > new Date(parseDay(tripEnd).getTime() + 24 * HOUR);

  function pick(ms: number | "hoje") {
    const until = ms === "hoje" ? endOfToday() : new Date(Date.now() + ms);
    setChoosing(false);
    onStart(until);
  }

  const others = othersCount === 0
    ? "Ninguém do grupo está compartilhando agora."
    : `${othersCount} pessoa${othersCount > 1 ? "s" : ""} do grupo no mapa.`;

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.title}>Localização do grupo</span>
        <span className={styles.meta}>{others}</span>
      </div>

      {sharing && shareUntil ? (
        <div className={styles.row}>
          <span className={styles.live} role="status">
            <span className={styles.dot} aria-hidden="true" />
            Compartilhando até {shareUntil.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button className={styles.stopBtn} onClick={onStop}>Parar</button>
        </div>
      ) : choosing ? (
        <div className={styles.choices} role="group" aria-label="Por quanto tempo compartilhar">
          <button onClick={() => pick(HOUR)}>1 hora</button>
          <button onClick={() => pick(4 * HOUR)}>4 horas</button>
          <button onClick={() => pick("hoje")}>Até o fim do dia</button>
          <button className={styles.cancel} onClick={() => setChoosing(false)}>Cancelar</button>
        </div>
      ) : (
        <button className={styles.startBtn} onClick={() => setChoosing(true)} disabled={!ready || tripOver}>
          {tripOver ? "A viagem já terminou" : "Compartilhar minha localização"}
        </button>
      )}

      {error && <p className={styles.error} role="alert">{error}</p>}
      <p className={styles.privacy}>
        Só os membros desta viagem veem. A posição sai do seu aparelho criptografada e para de ser compartilhada sozinha no fim do prazo.
      </p>
    </div>
  );
}
