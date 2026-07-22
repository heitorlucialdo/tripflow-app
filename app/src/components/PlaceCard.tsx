import { useState } from "react";
import { PLACES } from "../data";

interface Props {
  name: string;
  weekday: string;
  onClick: () => void;
}

export function PlaceCard({ name, weekday, onClick }: Props) {
  const info = PLACES[name];
  const [imgFailed, setImgFailed] = useState(false);
  const firstImg = info?.imgs[0];

  return (
    <div
      className="place-card"
      role="button"
      tabIndex={0}
      aria-label={`Ver detalhes de ${name}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
    >
      {firstImg && !imgFailed ? (
        <img
          className="place-img"
          src={firstImg}
          alt={name}
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div
          className="place-img-placeholder"
          style={{ background: info?.gradient ?? "#1a1a2e" }}
        >
          {name}
        </div>
      )}

      <div className="place-name">{name}</div>
      <div className="place-tag">{weekday}</div>
    </div>
  );
}
