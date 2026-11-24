import { useMemo, useState } from "react";
import { Icon } from "../Icon";
import { useTripRows } from "../../hooks/useTripRows";
import { supabase } from "../../lib/supabase";
import { formatDay, tripDays, toDayString, type Trip } from "../../lib/trip-context";
import styles from "./RoteiroViagem.module.css";

export interface ItineraryItem {
  id: string;
  day: string;
  position: number;
  title: string;
  start_time: string | null;
  notes: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
}

interface Place {
  display_name: string;
  lat: string;
  lon: string;
}

function sortItems(items: ItineraryItem[]): ItineraryItem[] {
  return [...items].sort((a, b) => a.position - b.position || (a.start_time ?? "").localeCompare(b.start_time ?? ""));
}

// Busca gratuita do OpenStreetMap; só roda quando a pessoa toca em "Buscar",
// para respeitar o limite de 1 consulta por segundo do serviço.
async function searchPlaces(query: string): Promise<Place[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&accept-language=pt-BR&q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("busca");
  return await res.json() as Place[];
}

export function RoteiroViagem({ trip }: { trip: Trip }) {
  const days = useMemo(() => tripDays(trip), [trip]);
  const today = toDayString(new Date());
  const [day, setDay] = useState(days.includes(today) ? today : days[0]);
  const { rows, loading } = useTripRows<ItineraryItem>("itinerary_items", trip.id, [
    { column: "day" }, { column: "position" },
  ]);

  const [adding, setAdding]     = useState(false);
  const [title, setTitle]       = useState("");
  const [time, setTime]         = useState("");
  const [notes, setNotes]       = useState("");
  const [place, setPlace]       = useState<Place | null>(null);
  const [results, setResults]   = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const items = sortItems(rows.filter(r => r.day === day));
  const countByDay = (d: string) => rows.filter(r => r.day === d).length;

  function resetForm() {
    setTitle(""); setTime(""); setNotes(""); setPlace(null); setResults([]); setAdding(false);
  }

  async function search() {
    if (!title.trim()) return;
    setSearching(true); setError(null);
    try {
      const found = await searchPlaces(`${title.trim()}, ${trip.destination}`);
      setResults(found);
      if (found.length === 0) setError("Nenhum lugar encontrado. Você pode salvar só com o nome.");
    } catch {
      setError("Busca indisponível agora. Você pode salvar só com o nome.");
    } finally {
      setSearching(false);
    }
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setError(null);
    const nextPos = items.reduce((m, i) => Math.max(m, i.position), -1) + 1;
    const { error: err } = await supabase.from("itinerary_items").insert({
      trip_id: trip.id,
      day,
      position: nextPos,
      title: title.trim(),
      start_time: time || null,
      notes: notes.trim() || null,
      address: place?.display_name ?? null,
      lat: place ? Number(place.lat) : null,
      lng: place ? Number(place.lon) : null,
    });
    if (err) { setError("Não foi possível adicionar."); return; }
    resetForm();
  }

  async function move(item: ItineraryItem, dir: -1 | 1) {
    const idx = items.findIndex(i => i.id === item.id);
    const other = items[idx + dir];
    if (!other) return;
    // Reatribui posições sequenciais para não depender de valores repetidos.
    const reordered = [...items];
    reordered[idx] = other;
    reordered[idx + dir] = item;
    const changes = reordered
      .map((it, pos) => ({ it, pos }))
      .filter(({ it, pos }) => it.position !== pos);
    const results2 = await Promise.all(changes.map(({ it, pos }) =>
      supabase.from("itinerary_items").update({ position: pos }).eq("id", it.id),
    ));
    if (results2.some(r => r.error)) setError("Não foi possível reordenar.");
  }

  async function changeDay(item: ItineraryItem, newDay: string) {
    const target = rows.filter(r => r.day === newDay);
    const pos = target.reduce((m, i) => Math.max(m, i.position), -1) + 1;
    const { error: err } = await supabase.from("itinerary_items").update({ day: newDay, position: pos }).eq("id", item.id);
    if (err) setError("Não foi possível mover.");
  }

  async function remove(item: ItineraryItem) {
    const { error: err } = await supabase.from("itinerary_items").delete().eq("id", item.id);
    if (err) setError("Não foi possível remover.");
  }

  return (
    <section className={styles.section}>
      <h2 className="section-title">O roteiro</h2>

      <div className={styles.days} role="tablist" aria-label="Dias da viagem">
        {days.map((d, i) => (
          <button
            key={d}
            role="tab"
            aria-selected={d === day}
            className={`${styles.day} ${d === day ? styles.dayActive : ""}`}
            onClick={() => setDay(d)}
          >
            <span className={styles.dayNum}>Dia {i + 1}</span>
            <span className={styles.dayDate}>{formatDay(d, { weekday: "short", day: "2-digit", month: "2-digit" })}</span>
            {countByDay(d) > 0 && <span className={styles.dayCount}>{countByDay(d)}</span>}
          </button>
        ))}
      </div>

      {loading && <p className={styles.empty}>Carregando roteiro...</p>}
      {!loading && items.length === 0 && !adding && (
        <p className={styles.empty}>Nada planejado para este dia ainda. Qualquer pessoa do grupo pode adicionar.</p>
      )}

      <ol className={styles.list}>
        {items.map((item, idx) => (
          <li key={item.id} className={styles.item}>
            <div className={styles.itemMain}>
              <span className={styles.time}>{item.start_time ? item.start_time.slice(0, 5) : "--:--"}</span>
              <div className={styles.itemText}>
                <span className={styles.itemTitle}>{item.title}</span>
                {item.address && <span className={styles.itemMeta}>{item.address}</span>}
                {item.notes && <span className={styles.itemNotes}>{item.notes}</span>}
              </div>
            </div>
            <div className={styles.itemActions}>
              {item.lat !== null && item.lng !== null && (
                <a className={styles.iconBtn} aria-label="Abrir no mapa" target="_blank" rel="noopener noreferrer"
                  href={`https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`}>
                  <Icon name="pin" size={16} />
                </a>
              )}
              <button className={styles.iconBtn} onClick={() => move(item, -1)} disabled={idx === 0} aria-label="Subir">
                <Icon name="up" size={16} />
              </button>
              <button className={styles.iconBtn} onClick={() => move(item, 1)} disabled={idx === items.length - 1} aria-label="Descer">
                <Icon name="down" size={16} />
              </button>
              <select className={styles.daySelect} value={item.day} onChange={e => changeDay(item, e.target.value)} aria-label="Mover para outro dia">
                {days.map((d, i) => <option key={d} value={d}>Dia {i + 1}</option>)}
              </select>
              <button className={styles.iconBtn} onClick={() => remove(item)} aria-label="Remover">
                <Icon name="trash" size={16} />
              </button>
            </div>
          </li>
        ))}
      </ol>

      {adding ? (
        <form className={styles.form} onSubmit={addItem}>
          <div className={styles.row}>
            <input className={styles.input} value={title} onChange={e => { setTitle(e.target.value); setPlace(null); }}
              placeholder="Lugar ou atividade" maxLength={120} autoFocus required />
            <button type="button" className={styles.secondaryBtn} onClick={search} disabled={!title.trim() || searching}>
              {searching ? "..." : "Buscar"}
            </button>
          </div>

          {results.length > 0 && !place && (
            <ul className={styles.results}>
              {results.map(r => (
                <li key={`${r.lat},${r.lon}`}>
                  <button type="button" className={styles.result} onClick={() => { setPlace(r); setResults([]); }}>
                    {r.display_name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {place && <p className={styles.picked}><Icon name="pin" size={14} /> {place.display_name}</p>}

          <div className={styles.row}>
            <input className={styles.input} type="time" value={time} onChange={e => setTime(e.target.value)} aria-label="Horário" style={{ maxWidth: 130 }} />
            <input className={styles.input} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observação (opcional)" maxLength={200} />
          </div>
          <div className={styles.row}>
            <button type="button" className={styles.secondaryBtn} onClick={resetForm}>Cancelar</button>
            <button type="submit" className={styles.primaryBtn} disabled={!title.trim()}>Adicionar ao dia</button>
          </div>
        </form>
      ) : (
        <button className={styles.addBtn} onClick={() => setAdding(true)}>
          <Icon name="plus" size={18} /> Adicionar ao roteiro
        </button>
      )}

      {error && <p className={styles.error}>{error}</p>}
      <p className={styles.credit}>Busca de lugares: © OpenStreetMap</p>
    </section>
  );
}
