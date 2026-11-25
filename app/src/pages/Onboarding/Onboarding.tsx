import { useEffect, useState } from "react";
import { reverseGeocode, distanceKm, type GeoResult } from "../../lib/places";
import { PlaceSearch } from "../../components/PlaceSearch";
import { Icon } from "../../components/Icon";
import type { TripRoute } from "../../hooks/useTripRoute";
import styles from "./Onboarding.module.css";

interface Props {
  initial?: TripRoute | null;
  onDone: (r: TripRoute) => void;
}

type GeoState = "idle" | "locating" | "denied" | "error";

export function Onboarding({ initial, onDone }: Props) {
  const [origin, setOrigin] = useState<GeoResult | null>(initial?.origin ?? null);
  const [destination, setDestination] = useState<GeoResult | null>(initial?.destination ?? null);
  const [geo, setGeo] = useState<GeoState>("idle");
  const [editOrigin, setEditOrigin] = useState(false);

  function locate() {
    if (!("geolocation" in navigator)) {
      setGeo("error");
      return;
    }
    setGeo("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          setOrigin(await reverseGeocode(pos.coords.latitude, pos.coords.longitude));
          setGeo("idle");
          setEditOrigin(false);
        } catch {
          setGeo("error");
        }
      },
      (err) => setGeo(err.code === err.PERMISSION_DENIED ? "denied" : "error"),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 },
    );
  }

  useEffect(() => {
    if (!initial) locate();
    // só no primeiro acesso
  }, []);

  const showOriginSearch = !origin || editOrigin;
  const km = origin && destination ? Math.round(distanceKm(origin, destination)) : null;

  return (
    <div className={styles.screen}>
      <div className={styles.glow} />
      <header className={styles.head}>
        <span className={styles.brand}>TripFlow</span>
        <h1 className={styles.title}>Para onde<br /><em>vamos?</em></h1>
        <p className={styles.sub}>Conte de onde você sai e para onde quer ir. A gente monta o resto.</p>
      </header>

      <section className={styles.card}>
        <div className={styles.stepHead}>
          <span className={styles.dot} data-done={!!origin} />
          <span className={styles.stepLabel}>Saindo de</span>
        </div>

        {origin && !editOrigin && (
          <div className={styles.picked}>
            <div>
              <strong>{origin.name}</strong>
              <span>{origin.label.split(",").slice(1, 3).join(",")}</span>
            </div>
            <button className={styles.change} onClick={() => setEditOrigin(true)}>Trocar</button>
          </div>
        )}

        {showOriginSearch && (
          <>
            <button className={styles.locate} onClick={locate} disabled={geo === "locating"}>
              <Icon name="locate" size={18} />
              {geo === "locating" ? "Localizando..." : "Usar minha localização"}
            </button>
            {geo === "denied" && <p className={styles.hint}>Sem permissão de localização. Digite sua cidade abaixo.</p>}
            {geo === "error" && <p className={styles.hint}>Não conseguimos te localizar. Digite sua cidade abaixo.</p>}
            <PlaceSearch placeholder="Sua cidade (ex.: Cuiabá)" onPick={(r) => { setOrigin(r); setEditOrigin(false); }} />
          </>
        )}

        <div className={styles.connector} aria-hidden>
          <Icon name="plane" size={16} />
          {km !== null && <span>{km.toLocaleString("pt-BR")} km</span>}
        </div>

        <div className={styles.stepHead}>
          <span className={styles.dot} data-done={!!destination} />
          <span className={styles.stepLabel}>Indo para</span>
        </div>

        {destination ? (
          <div className={styles.picked}>
            <div>
              <strong>{destination.name}</strong>
              <span>{destination.label.split(",").slice(1, 3).join(",")}</span>
            </div>
            <button className={styles.change} onClick={() => setDestination(null)}>Trocar</button>
          </div>
        ) : (
          <PlaceSearch placeholder="Destino no Brasil (ex.: Rio de Janeiro)" autoFocus={!!origin} onPick={setDestination} />
        )}
      </section>

      <button
        className={styles.cta}
        disabled={!origin || !destination}
        onClick={() => origin && destination && onDone({ origin, destination })}
      >
        Começar a planejar
      </button>
    </div>
  );
}
