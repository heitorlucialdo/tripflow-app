import { useRef, useState } from "react";
import { Icon } from "../Icon";
import { generateItinerary, type PlaceCandidate } from "../../lib/api";
import { fetchAttractions } from "../../lib/places";
import { getSpeechCtor, transcriptOf, type SpeechRecognizer } from "../../lib/media";
import type { Trip, TripTier } from "../../lib/trip-context";
import styles from "./EstiloRoteiro.module.css";

const TIERS: { id: TripTier; title: string; desc: string; price: string }[] = [
  { id: "economico",     title: "Econômico",     desc: "Praias, mirantes e comida boa e barata",    price: "$" },
  { id: "medio",         title: "Médio",         desc: "Mistura de grátis e pago, um bar à noite",  price: "$$" },
  { id: "premium",       title: "Premium",       desc: "Experiências, restaurantes e baladas top",  price: "$$$" },
  { id: "personalizado", title: "Personalizado", desc: "Você fala o que quer e a IA monta",          price: "IA" },
];

// Os lugares reais da região vão como sugestão para a IA não inventar endereço
const candidateCache = new Map<string, PlaceCandidate[]>();

async function loadCandidates(trip: Trip, onProgress: (p: number) => void): Promise<PlaceCandidate[]> {
  if (trip.destination_lat === null || trip.destination_lng === null) return [];
  const key = `${trip.destination_lat},${trip.destination_lng}`;
  const cached = candidateCache.get(key);
  if (cached) return cached;
  const center = { lat: trip.destination_lat, lng: trip.destination_lng };
  try {
    const found = await fetchAttractions(center, center, (done, total) => onProgress(done / total));
    const list = [...found]
      .sort((a, b) => b.score - a.score)
      .slice(0, 100)
      .map(a => ({ name: a.name, category: a.category, cost: a.cost, lat: a.lat, lng: a.lng, address: a.address, image: a.image || undefined }));
    candidateCache.set(key, list);
    return list;
  } catch {
    return [];
  }
}

export { loadCandidates };

interface Props {
  trip: Trip;
  onDone: () => void;
  replacing?: boolean;
}

export function EstiloRoteiro({ trip, onDone, replacing = false }: Props) {
  const [tier, setTier]         = useState<TripTier>(trip.tier ?? "medio");
  const [notes, setNotes]       = useState("");
  const [phase, setPhase]       = useState<"idle" | "places" | "ai">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError]       = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognizer | null>(null);
  const Speech = getSpeechCtor();

  function toggleMic() {
    if (!Speech) return;
    if (listening) { recRef.current?.stop(); return; }
    const rec = new Speech();
    rec.lang = "pt-BR";
    rec.interimResults = false;
    rec.onresult = e => setNotes(prev => `${prev} ${transcriptOf(e)}`.trim());
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  async function generate() {
    setError(null);
    setPhase("places"); setProgress(0);
    const candidates = await loadCandidates(trip, setProgress);
    setPhase("ai");
    try {
      await generateItinerary(trip.id, { tier, notes: notes.trim() || undefined, candidates });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não consegui montar o roteiro agora.");
    } finally {
      setPhase("idle");
    }
  }

  const busy = phase !== "idle";
  const needsNotes = tier === "personalizado" && !notes.trim();

  return (
    <div className={styles.wrap}>
      <div className={styles.tiers} role="radiogroup" aria-label="Estilo do roteiro">
        {TIERS.map(t => (
          <button
            key={t.id}
            role="radio"
            aria-checked={tier === t.id}
            className={`${styles.tier} ${tier === t.id ? styles.tierOn : ""}`}
            onClick={() => setTier(t.id)}
            disabled={busy}
          >
            <span className={styles.price}>{t.price}</span>
            <strong>{t.title}</strong>
            <span>{t.desc}</span>
          </button>
        ))}
      </div>

      <label className={styles.notesLabel}>
        {tier === "personalizado" ? "Conte o que o grupo quer fazer" : "Algum pedido? (opcional)"}
        <div className={styles.notesRow}>
          <textarea
            className={styles.notes}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            maxLength={500}
            rows={3}
            disabled={busy}
            placeholder="Ex.: ver o pôr do sol na praia, um dia de trilha, frutos do mar, balada no sábado"
          />
          {Speech && (
            <button type="button" className={`${styles.mic} ${listening ? styles.live : ""}`} onClick={toggleMic}
              disabled={busy} aria-label={listening ? "Parar de ouvir" : "Falar o pedido"}>
              <Icon name="mic" size={20} />
            </button>
          )}
        </div>
      </label>

      {busy && (
        <div className={styles.progress} aria-live="polite">
          <div style={{ width: `${phase === "places" ? 10 + progress * 50 : 75}%` }} />
          <span>{phase === "places" ? "Procurando lugares reais na região..." : "A IA está montando os dias..."}</span>
        </div>
      )}
      {error && <p className={styles.error}>{error}</p>}
      {replacing && !busy && <p className={styles.warn}>O roteiro atual e os votos dele serão substituídos.</p>}

      <button className={styles.cta} onClick={generate} disabled={busy || needsNotes}>
        <Icon name="sparkle" size={18} /> {busy ? "Montando..." : replacing ? "Gerar novo roteiro" : "Montar roteiro com IA"}
      </button>
    </div>
  );
}
