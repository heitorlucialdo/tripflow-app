import { useEffect, useMemo, useState } from "react";
import styles from "./SplashScreen.module.css";

interface Props {
  onFinish: () => void;
}

const ROUTE = "M 30 190 C 90 60, 230 40, 330 70";
const WORD = "TripFlow";

function makeStars(count: number) {
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: count }, () => ({
    x: rand() * 100,
    y: rand() * 100,
    size: rand() * 1.8 + 0.4,
    delay: rand() * 3,
  }));
}

export function SplashScreen({ onFinish }: Props) {
  const [leaving, setLeaving] = useState(false);
  const stars = useMemo(() => makeStars(70), []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const leaveAt = reduce ? 900 : 3300;
    const t1 = setTimeout(() => setLeaving(true), leaveAt);
    const t2 = setTimeout(onFinish, leaveAt + 650);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onFinish]);

  function skip() {
    if (leaving) return;
    setLeaving(true);
    setTimeout(onFinish, 450);
  }

  return (
    <div
      className={`${styles.wrapper} ${leaving ? styles.leaving : ""}`}
      onClick={skip}
      role="presentation"
    >
      <div className={styles.aurora} />
      <div className={styles.stars}>
        {stars.map((s, i) => (
          <span
            key={i}
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>

      <div className={styles.stage}>
        <svg viewBox="0 0 360 240" className={styles.route}>
          <defs>
            <linearGradient id="splash-trail" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#3dd9ff" stopOpacity="0" />
              <stop offset="60%" stopColor="#3dd9ff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ff8a5b" />
            </linearGradient>
            <radialGradient id="splash-glow">
              <stop offset="0%" stopColor="#ffc861" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ff8a5b" stopOpacity="0" />
            </radialGradient>
          </defs>

          <path d={ROUTE} className={styles.routeGhost} />
          <path d={ROUTE} className={styles.routeLine} stroke="url(#splash-trail)" pathLength={1} />

          <circle cx="30" cy="190" r="4" className={styles.origin} />
          <circle cx="330" cy="70" r="26" fill="url(#splash-glow)" className={styles.burst} />
          <circle cx="330" cy="70" r="4.5" className={styles.dest} />

          <g className={styles.plane}>
            <path
              d="M 11 0 Q 11 -1.7 2.5 -1.7 L -2.5 -9.5 L -5.2 -9.5 L -2.2 -1.7 L -7.6 -1.5 L -9.6 -4.6 L -11.2 -4.6 L -10.2 0 L -11.2 4.6 L -9.6 4.6 L -7.6 1.5 L -2.2 1.7 L -5.2 9.5 L -2.5 9.5 L 2.5 1.7 Q 11 1.7 11 0 Z"
              fill="#ffffff"
            />
            <animateMotion
              dur="1.75s"
              begin="0.25s"
              fill="freeze"
              rotate="auto"
              path={ROUTE}
              keyPoints="0;1"
              keyTimes="0;1"
              calcMode="spline"
              keySplines="0.45 0 0.2 1"
            />
          </g>
        </svg>

        <h1 className={styles.word} aria-label={WORD}>
          {WORD.split("").map((ch, i) => (
            <span key={i} style={{ animationDelay: `${1.75 + i * 0.055}s` }} aria-hidden="true">
              {ch}
            </span>
          ))}
        </h1>

        <p className={styles.tagline}>sua viagem, em fluxo</p>

        <div className={styles.pass}>
          <span>ORIGEM</span>
          <i />
          <span className={styles.passStatus}>EMBARQUE LIBERADO</span>
          <i />
          <span>DESTINO</span>
        </div>
      </div>

      <span className={styles.skip}>toque para pular</span>
    </div>
  );
}
