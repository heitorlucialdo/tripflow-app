import { useEffect, useRef, useState } from "react";
import type { DayData } from "../data";
import { PlaceCard } from "./PlaceCard";
import { Icon } from "./Icon";

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

  const accent = index % 2 === 0 ? "var(--sky)" : "var(--sunset)";
  const isEmpty = day.places.length === 0;

  return (
    <div
      ref={ref}
      className={`day-block${visible ? " visible" : ""}`}
      style={{ ["--accent" as string]: accent }}
    >
      <div className="day-header">
        <div className="day-num">
          <span className="day-num-label">DIA</span>
          {day.num}
        </div>
        <div className="day-info">
          <div className="day-info-kicker">{day.weekday} · {day.date}</div>
          <div className="day-info-title">{day.title}</div>
          <div className="day-info-sub">{day.sub}</div>
        </div>
      </div>

      {isEmpty ? (
        <p className="day-msg">
          <Icon name="plane" size={18} />
          {day.num === "0"
            ? "Dia de viagem — chegada prevista à noite."
            : "Dia de retorno — até a próxima!"}
        </p>
      ) : (
        <div className="places-grid">
          {day.places.map((name, i) => (
            <PlaceCard
              key={name}
              name={name}
              order={i + 1}
              onClick={() => onPlaceClick(name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
