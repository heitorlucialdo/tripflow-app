import { useEffect, useState } from "react";
import { reverseGeocode, distanceKm, type GeoResult } from "../../lib/places";
import { PlaceSearch } from "../../components/PlaceSearch";
import { Icon } from "../../components/Icon";
import { ConvidarAmigos } from "../../components/ConvidarAmigos/ConvidarAmigos";
import { EstiloRoteiro } from "../../components/EstiloRoteiro/EstiloRoteiro";
import { useTrip } from "../../hooks/useTrip";
import { toDayString, type Trip } from "../../lib/trip-context";
import styles from "./NovaViagem.module.css";

type Step = "rota" | "dias" | "amigos" | "estilo";
const STEPS: { id: Step; label: string }[] = [
  { id: "rota",   label: "Rota" },
  { id: "dias",   label: "Dias" },
  { id: "amigos", label: "Amigos" },
  { id: "estilo", label: "Roteiro" },
];

type GeoState = "idle" | "locating" | "denied" | "error";

const HOURS = [4, 6, 8, 10, 12];

function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return toDayString(new Date(y, m - 1, d + n));
}

interface Props {
  onClose?: () => void;
  onDone: () => void;
}

export function NovaViagem({ onClose, onDone }: Props) {
  const { createTrip } = useTrip();
  const [step, setStep]               = useState<Step>("rota");
  const [origin, setOrigin]           = useState<GeoResult | null>(null);
  const [destination, setDestination] = useState<GeoResult | null>(null);
  const [editOrigin, setEditOrigin]   = useState(false);
  const [geo, setGeo]                 = useState<GeoState>("idle");
  const [start, setStart]             = useState(() => addDays(toDayString(new Date()), 30));
  const [nights, setNights]           = useState(4);
  const [hours, setHours]             = useState(8);
  const [lodging, setLodging]         = useState<GeoResult | null>(null);
  const [trip, setTrip]               = useState<Trip | null>(null);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);

  function locate() {
    if (!("geolocation" in navigator)) { setGeo("error"); return; }
    setGeo("locating");
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          setOrigin(await reverseGeocode(pos.coords.latitude, pos.coords.longitude));
          setGeo("idle");
          setEditOrigin(false);
        } catch { setGeo("error"); }
      },
      err => setGeo(err.code === err.PERMISSION_DENIED ? "denied" : "error"),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 },
    );
  }

  useEffect(() => { locate(); }, []);

  async function create() {
    if (!origin || !destination) return;
    setSaving(true); setError(null);
    try {
      const t = await createTrip({
        name: `${destination.name} com a galera`,
        origin: origin.name,
        destination: destination.name,
        start_date: start,
        end_date: addDays(start, nights),
        origin_lat: origin.lat,
        origin_lng: origin.lng,
        destination_lat: destination.lat,
        destination_lng: destination.lng,
        lodging: lodging?.label ?? null,
        hours_per_day: hours,
      });
      setTrip(t);
      setStep("amigos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a viagem.");
    } finally {
      setSaving(false);
    }
  }

  const stepIndex = STEPS.findIndex(s => s.id === step);
  const km = origin && destination ? Math.round(distanceKm(origin, destination)) : null;
  const showOriginSearch = !origin || editOrigin;

  return (
    <div className={styles.screen}>
      <div className={styles.glow} aria-hidden />

      <header className={styles.top}>
        <span className={styles.brand}>TripFlow</span>
        {onClose && !trip && (
          <button className={styles.close} onClick={onClose} aria-label="Fechar">
            <Icon name="close" size={18} />
          </button>
        )}
      </header>

      <ol className={styles.steps} aria-label="Etapas">
        {STEPS.map((s, i) => (
          <li key={s.id} data-state={i < stepIndex ? "done" : i === stepIndex ? "on" : "off"}>
            <span>{i + 1}</span>{s.label}
          </li>
        ))}
      </ol>

      {step === "rota" && (
        <>
          <div className={styles.head}>
            <h1 className={styles.title}>Para onde<br /><em>vamos?</em></h1>
            <p className={styles.sub}>De onde vocês saem e para onde a galera vai. Depois é só chamar os amigos.</p>
          </div>

          <button className={styles.inviteTeaser} onClick={() => document.getElementById("destino")?.focus()} type="button">
            <span className={styles.inviteIcons}><Icon name="users" size={18} /></span>
            <span><strong>Viagem com amigos</strong><small>Você convida o grupo logo depois de escolher a rota</small></span>
          </button>

          <section className={styles.card}>
            <div className={styles.stepHead}><span className={styles.dot} data-done={!!origin} /><span className={styles.stepLabel}>Saindo de</span></div>
            {origin && !editOrigin && (
              <div className={styles.picked}>
                <div><strong>{origin.name}</strong><span>{origin.label.split(",").slice(1, 3).join(",")}</span></div>
                <button className={styles.change} onClick={() => setEditOrigin(true)}>Trocar</button>
              </div>
            )}
            {showOriginSearch && (
              <>
                <button className={styles.locate} onClick={locate} disabled={geo === "locating"}>
                  <Icon name="locate" size={18} /> {geo === "locating" ? "Localizando..." : "Usar minha localização"}
                </button>
                {geo === "denied" && <p className={styles.hint}>Sem permissão de localização. Digite sua cidade abaixo.</p>}
                {geo === "error" && <p className={styles.hint}>Não conseguimos te localizar. Digite sua cidade abaixo.</p>}
                <PlaceSearch placeholder="Sua cidade (ex.: Cuiabá)" onPick={r => { setOrigin(r); setEditOrigin(false); }} />
              </>
            )}

            <div className={styles.connector} aria-hidden>
              <Icon name="plane" size={16} />
              {km !== null && <span>{km.toLocaleString("pt-BR")} km</span>}
            </div>

            <div className={styles.stepHead}><span className={styles.dot} data-done={!!destination} /><span className={styles.stepLabel}>Indo para</span></div>
            {destination ? (
              <div className={styles.picked}>
                <div><strong>{destination.name}</strong><span>{destination.label.split(",").slice(1, 3).join(",")}</span></div>
                <button className={styles.change} onClick={() => setDestination(null)}>Trocar</button>
              </div>
            ) : (
              <PlaceSearch placeholder="Destino (ex.: Porto Seguro)" autoFocus={!!origin} onPick={setDestination} />
            )}
          </section>

          <button className={styles.cta} disabled={!origin || !destination} onClick={() => setStep("dias")}>Continuar</button>
        </>
      )}

      {step === "dias" && destination && (
        <>
          <div className={styles.head}>
            <h1 className={styles.title}>Quantos <em>dias?</em></h1>
            <p className={styles.sub}>E quanto tempo por dia a galera quer passear.</p>
          </div>

          <section className={styles.card}>
            <label className={styles.field}>
              <span className={styles.stepLabel}>Data de ida</span>
              <input className={styles.input} type="date" value={start} min={toDayString(new Date())} onChange={e => setStart(e.target.value)} />
            </label>

            <div className={styles.field}>
              <span className={styles.stepLabel}>Dias de viagem</span>
              <div className={styles.stepper}>
                <button onClick={() => setNights(n => Math.max(0, n - 1))} aria-label="Menos um dia">−</button>
                <strong>{nights + 1} {nights === 0 ? "dia" : "dias"}</strong>
                <button onClick={() => setNights(n => Math.min(20, n + 1))} aria-label="Mais um dia">+</button>
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.stepLabel}>Tempo de passeio por dia</span>
              <div className={styles.chips} role="radiogroup">
                {HOURS.map(h => (
                  <button key={h} role="radio" aria-checked={hours === h} className={hours === h ? styles.chipOn : styles.chip} onClick={() => setHours(h)}>
                    {h}h
                  </button>
                ))}
              </div>
              <small className={styles.help}>
                {hours <= 4 ? "Ritmo tranquilo, sobra tempo para descansar." : hours >= 10 ? "Ritmo intenso, do nascer do sol até a noite." : "Ritmo equilibrado."}
              </small>
            </div>

            <div className={styles.field}>
              <span className={styles.stepLabel}>Onde vão ficar (opcional)</span>
              {lodging ? (
                <div className={styles.picked}>
                  <div><strong>{lodging.name}</strong><span>{lodging.label.split(",").slice(1, 3).join(",")}</span></div>
                  <button className={styles.change} onClick={() => setLodging(null)}>Trocar</button>
                </div>
              ) : (
                <PlaceSearch placeholder="Bairro, rua ou hotel" context={destination.name} onPick={setLodging} />
              )}
            </div>
          </section>

          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.row}>
            <button className={styles.back} onClick={() => setStep("rota")}>Voltar</button>
            <button className={styles.cta} onClick={create} disabled={saving || !start}>{saving ? "Criando..." : "Criar viagem"}</button>
          </div>
        </>
      )}

      {step === "amigos" && trip && (
        <>
          <div className={styles.head}>
            <h1 className={styles.title}>Chama a <em>galera</em></h1>
            <p className={styles.sub}>Manda o link no grupo. Quem entrar já vota nos passeios.</p>
          </div>
          <section className={styles.card}><ConvidarAmigos trip={trip} canInvite /></section>
          <button className={styles.cta} onClick={() => setStep("estilo")}>Continuar para o roteiro</button>
        </>
      )}

      {step === "estilo" && trip && (
        <>
          <div className={styles.head}>
            <h1 className={styles.title}>Qual o <em>estilo?</em></h1>
            <p className={styles.sub}>A IA monta todos os dias. Depois dá para trocar qualquer passeio por texto, áudio ou foto.</p>
          </div>
          <EstiloRoteiro trip={trip} onDone={onDone} />
          <button className={styles.skip} onClick={onDone}>Pular, monto depois</button>
        </>
      )}
    </div>
  );
}
