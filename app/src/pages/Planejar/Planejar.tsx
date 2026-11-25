import { useEffect, useMemo, useState } from "react";
import {
  fetchAttractions, fetchSummaries, distanceKm, CATEGORY_LABEL,
  type Attraction, type Category, type GeoResult,
} from "../../lib/places";
import { buildTierPlan, buildCustomPlan, mapsLink, type Tier, type Slot } from "../../lib/planner";
import { PlaceSearch } from "../../components/PlaceSearch";
import { Icon, type IconName } from "../../components/Icon";
import { PlanMap, DAY_COLORS } from "./PlanMap";
import styles from "./Planejar.module.css";

type Step = "hospedagem" | "estilo" | "roteiro";

const TIERS: { id: Tier; title: string; desc: string }[] = [
  { id: "barato",        title: "Econômico",     desc: "Praias, parques e museus. Comida boa e barata. Transporte público." },
  { id: "medio",         title: "Equilibrado",   desc: "Atrações pagas, restaurantes legais e um bar à noite. Carro de aplicativo." },
  { id: "caro",          title: "Premium",       desc: "O melhor da cidade: restaurantes top e balada. Sem economizar." },
  { id: "personalizado", title: "Personalizado", desc: "Você escolhe cada passeio, restaurante e balada." },
];

const COST_LABEL = ["Grátis", "$", "$$", "$$$"];

const CATEGORY_ICON: Record<Category, IconName> = {
  passeio: "pin",
  restaurante: "fork",
  bar: "glass",
  balada: "music",
  cafe: "coffee",
};

const SLOT_LABEL: Record<Slot, string> = {
  passeio: "Passeio",
  almoco: "Almoço",
  jantar: "Jantar",
  noite: "Noite",
};

const FILTERS: (Category | "todos")[] = ["todos", "passeio", "restaurante", "bar", "balada", "cafe"];

function PlaceImage({ place }: { place: Attraction }) {
  const [failed, setFailed] = useState(false);
  if (!place.image || failed) {
    return (
      <div className={styles.fallback} data-cat={place.category}>
        <Icon name={CATEGORY_ICON[place.category]} size={28} />
      </div>
    );
  }
  return <img src={place.image} alt="" loading="lazy" onError={() => setFailed(true)} />;
}

function PlaceDetails({ place, from }: { place: Attraction; from: GeoResult }) {
  return (
    <div className={styles.details}>
      <span className={styles.meta}>
        {place.description || CATEGORY_LABEL[place.category]} · {COST_LABEL[place.cost]} · {distanceKm(from, place).toFixed(1)} km
      </span>
      {place.summary && <p className={styles.summary}>{place.summary}</p>}
      {place.address && <span className={styles.info}>{place.address}</span>}
      {place.hours && <span className={styles.info}>Horário: {place.hours}</span>}
      <div className={styles.links}>
        {place.website && <a href={place.website} target="_blank" rel="noreferrer">Site</a>}
        {place.instagram && (
          <a
            href={place.instagram.startsWith("http") ? place.instagram : `https://instagram.com/${place.instagram.replace("@", "")}`}
            target="_blank"
            rel="noreferrer"
          >
            Instagram
          </a>
        )}
        {place.phone && <a href={`tel:${place.phone}`}>Ligar</a>}
        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name} ${place.lat},${place.lng}`)}`} target="_blank" rel="noreferrer">
          Ver no Maps
        </a>
      </div>
    </div>
  );
}

interface Props {
  destino: GeoResult;
}

export function Planejar({ destino }: Props) {
  const [step, setStep] = useState<Step>("hospedagem");
  const [hospedagem, setHospedagem] = useState<GeoResult | null>(null);
  const [numDays, setNumDays] = useState(3);
  const [loading, setLoading] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState("");

  const [places, setPlaces] = useState<Attraction[]>([]);
  const [tier, setTier] = useState<Tier | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Category | "todos">("todos");
  const [activeDay, setActiveDay] = useState<number | null>(null);

  async function chooseLodging(r: GeoResult) {
    setHospedagem(r);
    setError("");
    setLoading({ done: 0, total: 1 });
    try {
      const found = await fetchAttractions(r, destino, (done, total) => setLoading({ done, total }));
      if (!found.length) {
        setError("Não encontramos lugares nessa região. Tente um endereço mais central.");
        return;
      }
      setPlaces(found);
      setStep("estilo");
    } catch {
      setError("Não conseguimos buscar os lugares agora. Tente de novo.");
    } finally {
      setLoading(null);
    }
  }

  function chooseTier(t: Tier) {
    setTier(t);
    setActiveDay(null);
    if (t !== "personalizado") setStep("roteiro");
  }

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const plan = useMemo(() => {
    if (!hospedagem || !tier) return [];
    if (tier === "personalizado") return buildCustomPlan(places.filter((p) => picked.has(p.id)), hospedagem, numDays);
    return buildTierPlan(places, hospedagem, tier, numDays);
  }, [hospedagem, tier, places, picked, numDays]);

  // Busca o resumo da Wikipédia só dos passeios que entraram no roteiro
  useEffect(() => {
    if (step !== "roteiro") return;
    const missing = plan
      .flatMap((d) => d.stops.map((s) => s.place))
      .filter((p) => p.wikiTitle && !p.summary)
      .map((p) => p.wikiTitle as string);
    if (!missing.length) return;
    let cancelled = false;
    fetchSummaries(missing).then((map) => {
      if (cancelled) return;
      setPlaces((prev) => prev.map((p) => (p.wikiTitle && map[p.wikiTitle] ? { ...p, summary: map[p.wikiTitle] } : p)));
    }).catch(() => { /* resumo é opcional */ });
    return () => { cancelled = true; };
  }, [step, plan]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: places.length };
    for (const p of places) c[p.category] = (c[p.category] ?? 0) + 1;
    return c;
  }, [places]);

  const visible = useMemo(() => {
    if (!hospedagem) return [];
    return places
      .filter((p) => filter === "todos" || p.category === filter)
      .sort((a, b) => b.score - a.score || distanceKm(hospedagem, a) - distanceKm(hospedagem, b));
  }, [places, filter, hospedagem]);

  const total = plan.reduce((s, d) => s + d.cost, 0);

  function restart() {
    setStep("hospedagem");
    setHospedagem(null);
    setPlaces([]);
    setTier(null);
    setPicked(new Set());
  }

  return (
    <section className={styles.wrap}>
      <h2 className="section-title">Planejar {destino.name}</h2>

      <ol className={styles.steps}>
        {(["hospedagem", "estilo", "roteiro"] as Step[]).map((s, i) => (
          <li key={s} className={step === s ? styles.stepOn : undefined}>{i + 1}. {s}</li>
        ))}
      </ol>

      {hospedagem && (
        <div className={styles.summaryBar}>
          <span><b>Hospedagem:</b> {hospedagem.label.split(",").slice(0, 3).join(",")}</span>
          <button className={styles.link} onClick={restart}>Trocar</button>
        </div>
      )}

      {step === "hospedagem" && (
        <div className={styles.card}>
          <label className={styles.label}>Onde você vai ficar em {destino.name}?</label>
          <p className={styles.mutedLeft}>Rua e bairro, ou o nome do hotel. Os passeios são calculados a partir daqui.</p>
          {!loading && (
            <PlaceSearch
              placeholder="Ex.: Rua das Flores, Centro ou Hotel X"
              context={destino.label}
              autoFocus
              onPick={chooseLodging}
            />
          )}
          <label className={styles.label}>
            Quantos dias de passeio?
            <input
              type="number"
              min={1}
              max={14}
              className={styles.inputSmall}
              value={numDays}
              onChange={(e) => setNumDays(Math.min(14, Math.max(1, Number(e.target.value) || 1)))}
            />
          </label>
          {loading && (
            <div className={styles.progress}>
              <div style={{ width: `${Math.round((loading.done / Math.max(1, loading.total)) * 100)}%` }} />
              <span>Buscando passeios, restaurantes, bares e baladas perto de você...</span>
            </div>
          )}
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {step === "estilo" && hospedagem && (
        <>
          <p className={styles.muted}>
            Encontramos {counts.passeio ?? 0} passeios, {counts.restaurante ?? 0} restaurantes, {(counts.bar ?? 0) + (counts.balada ?? 0)} bares e baladas e {counts.cafe ?? 0} cafés. Como quer viajar?
          </p>
          <div className={styles.tiers}>
            {TIERS.map((t) => (
              <button
                key={t.id}
                className={`${styles.tier} ${tier === t.id ? styles.tierOn : ""}`}
                onClick={() => chooseTier(t.id)}
              >
                <strong>{t.title}</strong>
                <span>{t.desc}</span>
              </button>
            ))}
          </div>

          {tier === "personalizado" && (
            <>
              <div className={styles.chips} role="group" aria-label="Filtrar por categoria">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    className={`${styles.chip} ${filter === f ? styles.chipOn : ""}`}
                    onClick={() => setFilter(f)}
                    aria-pressed={filter === f}
                  >
                    {f === "todos" ? "Todos" : CATEGORY_LABEL[f]} <small>{counts[f] ?? 0}</small>
                  </button>
                ))}
              </div>
              <div className={styles.grid}>
                {visible.map((p) => (
                  <article key={p.id} className={`${styles.place} ${picked.has(p.id) ? styles.placeOn : ""}`}>
                    <button className={styles.placeHit} onClick={() => toggle(p.id)} aria-pressed={picked.has(p.id)}>
                      <PlaceImage place={p} />
                      <span className={styles.badge}>{picked.has(p.id) ? "Adicionado" : "+ Adicionar"}</span>
                      <strong>{p.name}</strong>
                    </button>
                    <PlaceDetails place={p} from={hospedagem} />
                  </article>
                ))}
              </div>
              <button className={`${styles.primary} ${styles.sticky}`} disabled={!picked.size} onClick={() => setStep("roteiro")}>
                Montar roteiro com {picked.size} {picked.size === 1 ? "lugar" : "lugares"}
              </button>
            </>
          )}
        </>
      )}

      {step === "roteiro" && hospedagem && (
        <>
          <div className={styles.totals}>
            <span>{TIERS.find((t) => t.id === tier)?.title} · {plan.length} {plan.length === 1 ? "dia" : "dias"}</span>
            <strong>~ R$ {total.toLocaleString("pt-BR")}</strong>
            <small>por pessoa, estimado (entradas, refeições e deslocamento)</small>
          </div>

          <div className="mapa-legend" role="group" aria-label="Filtrar por dia">
            <button className={`mapa-legend-item ${activeDay === null ? "is-active" : ""}`} onClick={() => setActiveDay(null)}>Todos</button>
            {plan.map((_, d) => (
              <button
                key={d}
                className={`mapa-legend-item ${activeDay === d ? "is-active" : ""}`}
                onClick={() => setActiveDay(activeDay === d ? null : d)}
              >
                <span className="mapa-legend-dot" style={{ background: DAY_COLORS[d % DAY_COLORS.length] }} />
                Dia {d + 1}
              </button>
            ))}
          </div>

          <PlanMap lodging={hospedagem} days={plan} activeDay={activeDay} />

          {plan.map((day, d) => (
            <article key={d} className={styles.day}>
              <header>
                <h3 style={{ color: DAY_COLORS[d % DAY_COLORS.length] }}>Dia {d + 1}</h3>
                <small>{day.km.toFixed(1)} km · ~R$ {day.cost}</small>
              </header>
              {day.stops.map((s, i) => (
                <div key={s.place.id} className={styles.stop}>
                  <div className={styles.stopImg}>
                    <PlaceImage place={s.place} />
                  </div>
                  <div className={styles.stopBody}>
                    <span className={styles.slot} data-slot={s.slot}>{i + 1} · {SLOT_LABEL[s.slot]}</span>
                    <strong>{s.place.name}</strong>
                    <PlaceDetails place={s.place} from={hospedagem} />
                  </div>
                </div>
              ))}
              <a className={styles.primary} href={mapsLink(hospedagem, day.stops)} target="_blank" rel="noreferrer">
                Abrir rota do dia no Google Maps
              </a>
            </article>
          ))}

          <button className={styles.link} onClick={() => setStep("estilo")}>Trocar estilo</button>
          <p className={styles.muted}>
            Dados: OpenStreetMap, Wikipédia e Wikimedia Commons. Preços são estimativas.
          </p>
        </>
      )}
    </section>
  );
}
