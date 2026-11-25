import { useState, type FormEvent } from "react";
import { geocode, type GeoResult } from "../lib/places";
import styles from "./PlaceSearch.module.css";

interface Props {
  placeholder: string;
  // Texto somado à busca para dar contexto (ex.: a cidade de destino ao buscar a rua do hotel)
  context?: string;
  autoFocus?: boolean;
  onPick: (r: GeoResult) => void;
}

export function PlaceSearch({ placeholder, context, autoFocus, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<GeoResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function search(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await geocode(context ? `${query}, ${context}` : query);
      setOptions(res);
      if (!res.length) setError("Não encontramos esse lugar no Brasil. Tente escrever de outro jeito.");
    } catch {
      setError("Sem conexão com o serviço de mapas. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  function pick(r: GeoResult) {
    setOptions([]);
    setQuery("");
    onPick(r);
  }

  return (
    <form className={styles.form} onSubmit={search}>
      <div className={styles.row}>
        <input
          className={styles.input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          enterKeyHint="search"
        />
        <button className={styles.go} disabled={busy}>{busy ? "..." : "Buscar"}</button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      {options.map((o) => (
        <button type="button" key={`${o.lat},${o.lng}`} className={styles.option} onClick={() => pick(o)}>
          <strong>{o.name}</strong>
          <span>{o.label}</span>
        </button>
      ))}
    </form>
  );
}
