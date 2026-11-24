import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { ALL_CHECKLIST_ITEMS } from "../data";
import { useChecklist } from "../hooks/useChecklist";
import { useAuth } from "../hooks/useAuth";

function fireConfetti() {
  const colors = ["#FFD700", "#0077B6", "#fff", "#ff6b35", "#4caf50"];

  // rajada do lado esquerdo
  confetti({
    particleCount: 80,
    angle: 60,
    spread: 70,
    origin: { x: 0, y: 0.7 },
    colors,
  });
  // rajada do lado direito
  confetti({
    particleCount: 80,
    angle: 120,
    spread: 70,
    origin: { x: 1, y: 0.7 },
    colors,
  });
  // chuva do topo
  setTimeout(() => {
    confetti({
      particleCount: 120,
      spread: 100,
      origin: { x: 0.5, y: 0 },
      colors,
      gravity: 0.8,
    });
  }, 300);
}

export function Checklist() {
  const { user } = useAuth();
  const { checked, toggle, reset } = useChecklist(user?.id ?? "anonymous");
  const total = ALL_CHECKLIST_ITEMS.length;
  const done = checked.length;
  const pct = total > 0 ? (done / total) * 100 : 0;
  const isComplete = done === total && total > 0;

  // Dispara confete quando completar tudo — só uma vez por sessão
  const firedRef = useRef(false);
  useEffect(() => {
    if (isComplete && !firedRef.current) {
      firedRef.current = true;
      fireConfetti();
    }
    if (!isComplete) firedRef.current = false;
  }, [isComplete]);

  return (
    <section className="checklist-section">
      <h2 className="section-title">Checklist da galera</h2>

      <div className="progress-wrap">
        <div className="progress-label">
          {isComplete
            ? "Missão cumprida! Vocês fizeram tudo!"
            : `${done} de ${total} feitos`}
        </div>
        <div className="progress-bar-bg">
          <div
            className={`progress-bar-fill${isComplete ? " complete" : ""}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {isComplete && (
        <div className="checklist-complete-banner">
          Rio conquistado! Vocês visitaram todos os {total} lugares!
        </div>
      )}

      <div className="checklist-list">
        {ALL_CHECKLIST_ITEMS.map((item) => {
          const isDone = checked.includes(item.name);
          return (
            <div
              key={item.name}
              className={`checklist-item${isDone ? " done" : ""}`}
              onClick={() => toggle(item.name)}
              role="checkbox"
              aria-checked={isDone}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") toggle(item.name);
              }}
            >
              <div className="check-box">{isDone ? "✓" : ""}</div>
              <span className="item-name">{item.name}</span>
              <span className="item-day">{item.day}</span>
            </div>
          );
        })}
      </div>

      <button className="reset-btn" onClick={reset}>
        Resetar tudo
      </button>
    </section>
  );
}
