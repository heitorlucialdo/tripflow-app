import { useEffect, useState } from "react";
import styles from "./SplashScreen.module.css";

type Fase = "subindo" | "centro" | "saindo" | "saiu";

interface Props {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: Props) {
  const [fase, setFase] = useState<Fase>("subindo");

  useEffect(() => {
    const t1 = setTimeout(() => setFase("centro"), 1200);
    const t2 = setTimeout(() => setFase("saindo"), 3200);
    const t3 = setTimeout(() => setFase("saiu"),   4200);
    const t4 = setTimeout(() => onFinish(),        4800);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [onFinish]);

  return (
    <div className={`${styles.wrapper} ${fase === "saiu" ? styles.fadeOut : ""}`}>
      <div className={`${styles.aviaoContainer} ${styles[fase]}`}>
        <svg viewBox="0 0 24 24" fill="#1e6fa8" width="72" height="72">
          <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/>
        </svg>
        <div className={`${styles.rastro} ${styles[`rastro_${fase}` as keyof typeof styles]}`} />
      </div>
    </div>
  );
}
