import styles from "./GloboIcone.module.css";

export function GloboIcone() {
  return (
    <div className={styles.container}>
      <svg viewBox="0 0 120 120" width="120" height="120" style={{ position: "absolute" }}>

        {/* CAMADA 1 — arco traseiro (tracejado, fica atrás do globo) */}
        <ellipse cx="60" cy="60" rx="44" ry="13"
          fill="none" stroke="#1e6fa8" strokeWidth="1"
          strokeDasharray="4 3" opacity="0.4"/>

        {/* CAMADA 2 — globo wireframe com fill cobrindo o arco traseiro */}
        <circle cx="60" cy="60" r="38" fill="#060c17"/>
        <circle cx="60" cy="60" r="38" fill="none" stroke="#1e6fa8" strokeWidth="1.2" opacity="0.8"/>
        <ellipse cx="60" cy="60" rx="38" ry="11" fill="none" stroke="#1e6fa8" strokeWidth="0.8" opacity="0.5"/>
        <ellipse cx="60" cy="44" rx="28" ry="7"  fill="none" stroke="#1e6fa8" strokeWidth="0.7" opacity="0.35"/>
        <ellipse cx="60" cy="76" rx="28" ry="7"  fill="none" stroke="#1e6fa8" strokeWidth="0.7" opacity="0.35"/>
        <ellipse cx="60" cy="60" rx="10" ry="38" fill="none" stroke="#1e6fa8" strokeWidth="0.8" opacity="0.5"/>
        <ellipse cx="60" cy="60" rx="10" ry="38" fill="none" stroke="#1e6fa8" strokeWidth="0.7" opacity="0.35"
          transform="rotate(60 60 60)"/>

        {/* CAMADA 3 — arco frontal (metade inferior, na frente do globo) */}
        <path d="M 16 60 A 44 13 0 0 1 104 60"
          fill="none" stroke="#4fc3f7" strokeWidth="1.2" opacity="0.7"/>
      </svg>

      {/* CAMADA 4 — avião como elemento HTML para offset-path */}
      <div className={styles.aviao}>
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path fill="#4fc3f7"
            d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/>
        </svg>
      </div>
    </div>
  );
}
