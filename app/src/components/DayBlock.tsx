import { useEffect, useRef, useState } from "react";
import type { DayData } from "../data";
import { PlaceCard } from "./PlaceCard";

interface Props {
  day: DayData;
  index: number;
  onPlaceClick: (name: string) => void;
}

export function DayBlock({ day, index, onPlaceClick }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const accentColor = index % 2 === 0 ? "var(--gold)" : "var(--blue)";
  const isEmpty = day.places.length === 0;

  return (
    <div
      ref={ref}
      className={`day-block${visible ? " visible" : ""}`}
    >
      <div className="day-header" style={{ borderColor: accentColor }}>
        <div className="day-num" style={{ color: accentColor }}>
          D{day.num}
        </div>
        <div>
          <div className="day-info-title">
            {day.weekday} — {day.date}&nbsp;&nbsp;
            <span style={{ color: accentColor, fontSize: ".7em" }}>{day.title}</span>
          </div>
          <div className="day-info-sub">{day.sub}</div>
        </div>
      </div>

      {isEmpty ? (
        <p className="day-msg">
          {day.num === "0"
            ? "✈ Dia de viagem — chegada prevista à noite."
            : "🏠 Dia de retorno — até a próxima, Rio!"}
        </p>
      ) : (
        <div className="places-grid">
          {day.places.map((name) => (
            <PlaceCard
              key={name}
              name={name}
              weekday={day.weekday}
              onClick={() => onPlaceClick(name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
