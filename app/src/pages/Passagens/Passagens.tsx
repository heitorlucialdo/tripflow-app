import { useState } from "react";
import { searchFlights, ApiError, type FlightSearchResult } from "../../lib/api";
import { useTrip } from "../../hooks/useTrip";
import { brl } from "../../lib/saldos";
import { DESTINOS, destinoLabel, resolverAeroporto, cidadesParecidas } from "../../lib/aeroportos";
import styles from "./Passagens.module.css";

function formatMinutes(total: number | null) {
  if (total === null) return "";
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

// A SerpApi devolve horário local do aeroporto como "YYYY-MM-DD HH:MM".
function timeOf(local: string) {
  return local.slice(11, 16);
}

function dayOf(local: string) {
  const [, m, d] = local.slice(0, 10).split("-");
  return d && m ? `${d}/${m}` : "";
}

const LEVEL_TEXT = {
  low:     "Preço abaixo do normal para esta rota",
  typical: "Preço dentro do normal para esta rota",
  high:    "Preço acima do normal para esta rota",
} as const;

function ajuda(text: string, found: { codes: string[] } | null): string {
  if (found) return found.codes.join(" · ");
  if (!text.trim()) return "";
  const parecidas = cidadesParecidas(text);
  return parecidas.length > 1 ? `Escolha: ${parecidas.join(", ")}` : "Cidade não encontrada";
}

function googleFlightsLink(origin: string, destination: string, date: string, returnDate: string) {
  const q = `Voos de ${origin} para ${destination} em ${date}${returnDate ? ` voltando em ${returnDate}` : " somente ida"}`;
  return `https://www.google.com/travel/flights?hl=pt-BR&curr=BRL&q=${encodeURIComponent(q)}`;
}

export function Passagens() {
  const { activeTrip, members } = useTrip();
  const today = new Date().toISOString().slice(0, 10);
  const tripStart = activeTrip && activeTrip.start_date >= today ? activeTrip.start_date : "";

  // Já abre com as cidades da viagem quando elas estão na lista de aeroportos.
  const [origin,      setOrigin]      = useState(() => resolverAeroporto(activeTrip?.origin ?? "")?.label ?? "");
  const [destination, setDestination] = useState(() => resolverAeroporto(activeTrip?.destination ?? "")?.label ?? "");
  const [date,        setDate]        = useState(tripStart);
  const [returnDate,  setReturnDate]  = useState(tripStart && activeTrip ? activeTrip.end_date : "");
  const [passengers,  setPassengers]  = useState(Math.min(Math.max(members.length, 1), 9));
  const [result,      setResult]      = useState<FlightSearchResult | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  // O Google Voos soma o preço de todos os passageiros da busca.
  const [searchedPax, setSearchedPax] = useState(1);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setUnavailable(false);
    if (!from) { setError("Não reconheci a origem. Escolha uma cidade da lista ou digite o código do aeroporto (ex.: CGB)."); return; }
    if (!to)   { setError("Não reconheci o destino. Escolha uma cidade da lista ou digite o código do aeroporto (ex.: GIG)."); return; }
    if (from.codes.join() === to.codes.join()) { setError("Origem e destino são o mesmo lugar."); return; }
    setLoading(true);
    try {
      setResult(await searchFlights({
        origin: from.codes.join(","),
        destination: to.codes.join(","),
        date,
        returnDate: returnDate || undefined,
        passengers,
      }));
      setSearchedPax(passengers);
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) setUnavailable(true);
      else setError(err instanceof Error ? err.message : "Erro ao buscar voos.");
    } finally {
      setLoading(false);
    }
  }

  const from = resolverAeroporto(origin);
  const to   = resolverAeroporto(destination);
  const fallbackLink = from && to && date
    ? googleFlightsLink(from.codes[0], to.codes[0], date, returnDate)
    : null;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Buscar passagens</h1>
      <p className={styles.subtitle}>
        {activeTrip ? `Para ${activeTrip.name} · ` : ""}Digite a cidade ou o código do aeroporto
      </p>

      <form className={styles.form} onSubmit={handleSearch}>
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="voo-origem">Origem</label>
            <div className={styles.inputWrap}>
              <input
                id="voo-origem"
                className={styles.input}
                placeholder="Cuiabá ou CGB"
                list="voo-cidades"
                autoComplete="off"
                value={origin}
                onChange={e => setOrigin(e.target.value)}
                aria-describedby="voo-origem-ajuda"
                required
              />
            </div>
            <span id="voo-origem-ajuda" className={from || !origin ? styles.hint : styles.hintBad}>
              {ajuda(origin, from)}
            </span>
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
            <label className={styles.label} htmlFor="voo-destino">Destino</label>
            <div className={styles.inputWrap}>
              <input
                id="voo-destino"
                className={styles.input}
                placeholder="Rio de Janeiro ou GIG"
                list="voo-cidades"
                autoComplete="off"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                aria-describedby="voo-destino-ajuda"
                required
              />
            </div>
            <span id="voo-destino-ajuda" className={to || !destination ? styles.hint : styles.hintBad}>
              {ajuda(destination, to)}
            </span>
          </div>
        </div>

        <datalist id="voo-cidades">
          {DESTINOS.map(d => <option key={d.city} value={destinoLabel(d)} />)}
        </datalist>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="voo-ida">Ida</label>
            <div className={styles.inputWrap}>
              <input id="voo-ida" className={styles.input} type="date" min={today} value={date}
                onChange={e => setDate(e.target.value)} required />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="voo-volta">Volta (opcional)</label>
            <div className={styles.inputWrap}>
              <input id="voo-volta" className={styles.input} type="date" min={date || today} value={returnDate}
                onChange={e => setReturnDate(e.target.value)} />
            </div>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="voo-pax">Passageiros</label>
          <div className={styles.selectWrap}>
            <select id="voo-pax" className={styles.input} value={passengers} onChange={e => setPassengers(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                <option key={n} value={n}>{n} {n === 1 ? "adulto" : "adultos"}</option>
              ))}
            </select>
          </div>
        </div>

        <button className={styles.searchBtn} type="submit" disabled={loading}>
          {loading ? "Buscando..." : "Buscar voos"}
        </button>
      </form>

      {unavailable && (
        <div className={styles.notice} role="status">
          <p>A busca dentro do app ainda não está ativada neste servidor.</p>
          {fallbackLink && (
            <a className={styles.link} href={fallbackLink} target="_blank" rel="noopener noreferrer">
              Pesquisar esta rota no Google Voos
            </a>
          )}
        </div>
      )}

      {error && <p className={styles.error} role="alert">{error}</p>}

      {result && (
        <div className={styles.results}>
          {result.insights.level && (
            <div className={`${styles.insight} ${styles[`insight_${result.insights.level}`]}`}>
              <strong>{LEVEL_TEXT[result.insights.level]}</strong>
              {result.insights.typicalRange && (
                <span>Normalmente entre {brl(result.insights.typicalRange[0])} e {brl(result.insights.typicalRange[1])}{searchedPax > 1 ? " no total" : ""}</span>
              )}
            </div>
          )}

          {result.options.length === 0 ? (
            <p className={styles.count}>Nenhum voo encontrado para essa rota e data.</p>
          ) : (
            <p className={styles.count}>
              {result.options.length} opç{result.options.length > 1 ? "ões" : "ão"} · {returnDate ? "ida e volta" : "só ida"} · {searchedPax > 1 ? `preço total para ${searchedPax} adultos` : "preço por pessoa"}
            </p>
          )}

          {result.options.map(o => (
            <div key={o.id} className={styles.card}>
              {o.best && <span className={styles.badge}>Melhor opção</span>}
              <div className={styles.cardTop}>
                <div className={styles.airport}>
                  <span className={styles.time}>{timeOf(o.departure.time)}</span>
                  <span className={styles.iata}>{o.departure.airport}</span>
                  <span className={styles.dateSmall}>{dayOf(o.departure.time)}</span>
                </div>

                <div className={styles.middle}>
                  <span className={styles.duration}>{formatMinutes(o.totalMinutes)}</span>
                  <div className={styles.line}>
                    <span className={styles.dot} />
                    <span className={styles.dashes} />
                    {o.stops > 0 && <span className={styles.stopDot} />}
                    <span className={styles.dashes} />
                    <span className={styles.dot} />
                  </div>
                  <span className={styles.stops}>
                    {o.stops === 0 ? "Direto" : `${o.stops} escala${o.stops > 1 ? "s" : ""}`}
                  </span>
                </div>

                <div className={styles.airport}>
                  <span className={styles.time}>{timeOf(o.arrival.time)}</span>
                  <span className={styles.iata}>{o.arrival.airport}</span>
                  <span className={styles.dateSmall}>{dayOf(o.arrival.time)}</span>
                </div>
              </div>

              <div className={styles.cardBottom}>
                <span className={styles.carrier}>
                  {o.airline}{o.flightNumbers.length > 0 && ` · ${o.flightNumbers.join(", ")}`}
                </span>
                <div className={styles.priceArea}>
                  <span className={styles.price}>{o.price !== null ? brl(o.price) : "Sem preço"}</span>
                  <span className={styles.perPerson}>
                    {searchedPax > 1 && o.price !== null ? `${brl(o.price / searchedPax)} por pessoa` : "por pessoa"}
                  </span>
                </div>
              </div>
            </div>
          ))}

          <p className={styles.source}>
            Preços do Google Voos às {new Date(result.fetchedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.
            O valor final é confirmado no site da companhia.
          </p>
          {(result.googleFlightsUrl || fallbackLink) && (
            <a className={styles.link} href={result.googleFlightsUrl ?? fallbackLink ?? "#"} target="_blank" rel="noopener noreferrer">
              Ver e comprar no Google Voos
            </a>
          )}
        </div>
      )}
    </div>
  );
}
