import { useState } from "react";
import { searchFlights, type FlightOffer } from "../../lib/api";
import styles from "./Passagens.module.css";

function formatDuration(iso: string) {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  const h = match?.[1] ?? "0";
  const m = match?.[2] ?? "0";
  return `${h}h ${m}m`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function Passagens() {
  const [origin,      setOrigin]      = useState("");
  const [destination, setDestination] = useState("");
  const [date,        setDate]        = useState("");
  const [passengers,  setPassengers]  = useState(1);
  const [results,     setResults]     = useState<FlightOffer[] | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResults(null);
    setLoading(true);
    try {
      const offers = await searchFlights({ origin, destination, date, passengers });
      setResults(offers);
      if (offers.length === 0) setError("Nenhum voo encontrado para essa rota e data.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar voos.");
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Buscar Passagens</h1>
      <p className={styles.subtitle}>Use códigos IATA — ex: GRU, GIG, FLN, BSB</p>

      <form className={styles.form} onSubmit={handleSearch}>
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Origem</label>
            <div className={styles.inputWrap}>
              <input
                className={styles.input}
                placeholder="GRU"
                maxLength={3}
                value={origin}
                onChange={e => setOrigin(e.target.value.toUpperCase())}
                required
              />
            </div>
          </div>
          <button
            type="button"
            className={styles.swapBtn}
            aria-label="Inverter origem e destino"
            onClick={() => { setOrigin(destination); setDestination(origin); }}
          >
            ⇄
          </button>
          <div className={styles.field}>
            <label className={styles.label}>Destino</label>
            <div className={styles.inputWrap}>
              <input
                className={styles.input}
                placeholder="FLN"
                maxLength={3}
                value={destination}
                onChange={e => setDestination(e.target.value.toUpperCase())}
                required
              />
            </div>
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Data de ida</label>
            <div className={styles.inputWrap}>
              <input
                className={styles.input}
                type="date"
                min={today}
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Passageiros</label>
            <div className={styles.selectWrap}>
              <select
                className={styles.input}
                value={passengers}
                onChange={e => setPassengers(Number(e.target.value))}
              >
                {[1,2,3,4,5,6,7,8,9].map(n => (
                  <option key={n} value={n}>{n} {n === 1 ? "adulto" : "adultos"}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <button className={styles.searchBtn} type="submit" disabled={loading}>
          {loading ? "Buscando..." : "Buscar voos"}
        </button>
      </form>

      {error && <p className={styles.error}>{error}</p>}

      {results && results.length > 0 && (
        <div className={styles.results}>
          <p className={styles.count}>{results.length} voo{results.length > 1 ? "s" : ""} encontrado{results.length > 1 ? "s" : ""}</p>
          {results.map(offer => {
            const leg = offer.itineraries[0];
            const first = leg.segments[0];
            const last  = leg.segments[leg.segments.length - 1];
            const stops = leg.segments.length - 1;

            return (
              <div key={offer.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div className={styles.airport}>
                    <span className={styles.time}>{formatTime(first.departure.at)}</span>
                    <span className={styles.iata}>{first.departure.iataCode}</span>
                    <span className={styles.dateSmall}>{formatDate(first.departure.at)}</span>
                  </div>

                  <div className={styles.middle}>
                    <span className={styles.duration}>{formatDuration(leg.duration)}</span>
                    <div className={styles.line}>
                      <span className={styles.dot} />
                      <span className={styles.dashes} />
                      {stops > 0 && <span className={styles.stopDot} />}
                      <span className={styles.dashes} />
                      <span className={styles.dot} />
                    </div>
                    <span className={styles.stops}>
                      {stops === 0 ? "Direto" : `${stops} escala${stops > 1 ? "s" : ""}`}
                    </span>
                  </div>

                  <div className={styles.airport}>
                    <span className={styles.time}>{formatTime(last.arrival.at)}</span>
                    <span className={styles.iata}>{last.arrival.iataCode}</span>
                    <span className={styles.dateSmall}>{formatDate(last.arrival.at)}</span>
                  </div>
                </div>

                <div className={styles.cardBottom}>
                  <span className={styles.carrier}>
                    {first.carrierCode} {first.number}
                    {stops > 0 && ` · ${stops} escala${stops > 1 ? "s" : ""}`}
                  </span>
                  <div className={styles.priceArea}>
                    <span className={styles.price}>
                      R$ {Number(offer.price.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                    <span className={styles.perPerson}>por pessoa</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
