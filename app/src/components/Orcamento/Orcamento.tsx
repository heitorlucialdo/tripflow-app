import { useState } from "react";
import { Icon } from "../Icon";
import { useTrip } from "../../hooks/useTrip";
import { useTripRows } from "../../hooks/useTripRows";
import { supabase } from "../../lib/supabase";
import { formatDay, type Trip } from "../../lib/trip-context";
import styles from "./Orcamento.module.css";

const CATEGORIES = ["Hospedagem", "Transporte", "Passeios", "Alimentação", "Outros"] as const;
type Category = typeof CATEGORIES[number];

interface BudgetItem {
  id: string;
  category: Category;
  title: string;
  amount: number | string;
  split: "group" | "person";
  status: "idea" | "booked";
  url: string | null;
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// IDs de afiliado são opcionais; sem eles os links funcionam normalmente,
// só não geram comissão.
const BOOKING_AID = import.meta.env.VITE_AFFILIATE_BOOKING_AID as string | undefined;
const GYG_PARTNER = import.meta.env.VITE_AFFILIATE_GYG_PARTNER_ID as string | undefined;

function searchLinks(trip: Trip, people: number) {
  const booking = new URL("https://www.booking.com/searchresults.pt-br.html");
  booking.searchParams.set("ss", trip.destination);
  booking.searchParams.set("checkin", trip.start_date);
  booking.searchParams.set("checkout", trip.end_date);
  booking.searchParams.set("group_adults", String(Math.max(1, people)));
  booking.searchParams.set("no_rooms", "1");
  if (BOOKING_AID) booking.searchParams.set("aid", BOOKING_AID);

  const flights = new URL("https://www.google.com/travel/flights");
  flights.searchParams.set("q", `Voos de ${trip.origin} para ${trip.destination} em ${trip.start_date} volta ${trip.end_date}`);
  flights.searchParams.set("hl", "pt-BR");
  flights.searchParams.set("curr", "BRL");

  const tours = new URL("https://www.getyourguide.com.br/s/");
  tours.searchParams.set("q", trip.destination);
  tours.searchParams.set("date_from", trip.start_date);
  tours.searchParams.set("date_to", trip.end_date);
  if (GYG_PARTNER) tours.searchParams.set("partner_id", GYG_PARTNER);

  return [
    { label: "Hospedagem", hint: "Booking", href: booking.toString(), affiliate: Boolean(BOOKING_AID) },
    { label: "Passagens",  hint: "Google Voos", href: flights.toString(), affiliate: false },
    { label: "Passeios",   hint: "GetYourGuide", href: tours.toString(), affiliate: Boolean(GYG_PARTNER) },
  ];
}

export function Orcamento({ trip }: { trip: Trip }) {
  const { members } = useTrip();
  const people = Math.max(1, members.length);
  const { rows, loading } = useTripRows<BudgetItem>("budget_items", trip.id, [{ column: "created_at" }]);

  const [adding, setAdding]     = useState(false);
  const [title, setTitle]       = useState("");
  const [category, setCategory] = useState<Category>("Hospedagem");
  const [amount, setAmount]     = useState("");
  const [split, setSplit]       = useState<"group" | "person">("group");
  const [url, setUrl]           = useState("");
  const [error, setError]       = useState<string | null>(null);

  const perPerson = (i: BudgetItem) => i.split === "group" ? Number(i.amount) / people : Number(i.amount);
  const totalPerPerson  = rows.reduce((s, i) => s + perPerson(i), 0);
  const bookedPerPerson = rows.filter(i => i.status === "booked").reduce((s, i) => s + perPerson(i), 0);
  const byCategory = CATEGORIES
    .map(c => ({ c, value: rows.filter(i => i.category === c).reduce((s, i) => s + perPerson(i), 0) }))
    .filter(x => x.value > 0);

  const amountNum = parseFloat(amount.replace(",", "."));
  const urlValid = !url.trim() || /^https?:\/\/\S+$/i.test(url.trim());

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !(amountNum >= 0) || !urlValid) return;
    setError(null);
    const { error: err } = await supabase.from("budget_items").insert({
      trip_id: trip.id,
      title: title.trim(),
      category,
      amount: Math.round(amountNum * 100) / 100,
      split,
      url: url.trim() || null,
    });
    if (err) { setError("Não foi possível adicionar."); return; }
    setTitle(""); setAmount(""); setUrl(""); setAdding(false);
  }

  async function toggleBooked(item: BudgetItem) {
    const { error: err } = await supabase.from("budget_items")
      .update({ status: item.status === "booked" ? "idea" : "booked" }).eq("id", item.id);
    if (err) setError("Não foi possível atualizar.");
  }

  async function remove(item: BudgetItem) {
    const { error: err } = await supabase.from("budget_items").delete().eq("id", item.id);
    if (err) setError("Não foi possível remover.");
  }

  return (
    <section className={styles.section}>
      <h2 className="section-title">Quanto vai custar</h2>

      <div className={styles.hero}>
        <span className={styles.heroLabel}>Estimativa por pessoa</span>
        <span className={styles.heroValue}>{brl(totalPerPerson)}</span>
        <span className={styles.heroMeta}>
          {people} {people === 1 ? "pessoa" : "pessoas"} · {formatDay(trip.start_date)} a {formatDay(trip.end_date)}
          {bookedPerPerson > 0 && ` · ${brl(bookedPerPerson)} já reservado`}
        </span>
        {totalPerPerson > 0 && (
          <div className={styles.bar} aria-hidden="true">
            <span style={{ width: `${Math.min(100, (bookedPerPerson / totalPerPerson) * 100)}%` }} />
          </div>
        )}
      </div>

      {byCategory.length > 0 && (
        <ul className={styles.cats}>
          {byCategory.map(({ c, value }) => (
            <li key={c}><span>{c}</span><strong>{brl(value)}</strong></li>
          ))}
        </ul>
      )}

      <h3 className={styles.subTitle}>Itens</h3>
      {loading && <p className={styles.empty}>Carregando...</p>}
      {!loading && rows.length === 0 && (
        <p className={styles.empty}>Adicione hospedagem, transporte e passeios para o grupo saber quanto cada um vai gastar.</p>
      )}

      <ul className={styles.list}>
        {rows.map(i => (
          <li key={i.id} className={styles.item}>
            <div className={styles.itemText}>
              <span className={styles.itemTitle}>{i.title}</span>
              <span className={styles.itemMeta}>
                {i.category} · {i.split === "group" ? `${brl(Number(i.amount))} no total` : "por pessoa"} · {brl(perPerson(i))} cada
              </span>
            </div>
            <div className={styles.itemActions}>
              {i.url && (
                <a className={styles.iconBtn} href={i.url} target="_blank" rel="noopener noreferrer" aria-label="Abrir link">
                  <Icon name="link" size={16} />
                </a>
              )}
              <button className={`${styles.status} ${i.status === "booked" ? styles.booked : ""}`} onClick={() => toggleBooked(i)}>
                {i.status === "booked" ? "Reservado" : "Ideia"}
              </button>
              <button className={styles.iconBtn} onClick={() => remove(i)} aria-label="Remover">
                <Icon name="trash" size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {adding ? (
        <form className={styles.form} onSubmit={add}>
          <input className={styles.input} value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Ex.: Casa no Airbnb, ônibus, show" maxLength={100} autoFocus required />
          <div className={styles.row}>
            <select className={styles.input} value={category} onChange={e => setCategory(e.target.value as Category)} aria-label="Categoria">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <input className={styles.input} type="number" min="0" step="0.01" inputMode="decimal"
              value={amount} onChange={e => setAmount(e.target.value)} placeholder="Valor (R$)" required />
          </div>
          <div className={styles.toggle} role="radiogroup" aria-label="Como dividir">
            <button type="button" role="radio" aria-checked={split === "group"}
              className={split === "group" ? styles.toggleOn : ""} onClick={() => setSplit("group")}>
              Total do grupo
            </button>
            <button type="button" role="radio" aria-checked={split === "person"}
              className={split === "person" ? styles.toggleOn : ""} onClick={() => setSplit("person")}>
              Valor por pessoa
            </button>
          </div>
          <input className={styles.input} value={url} onChange={e => setUrl(e.target.value)}
            placeholder="Link (opcional)" inputMode="url" />
          {!urlValid && <p className={styles.error}>O link precisa começar com https://</p>}
          <div className={styles.row}>
            <button type="button" className={styles.secondaryBtn} onClick={() => setAdding(false)}>Cancelar</button>
            <button type="submit" className={styles.primaryBtn} disabled={!title.trim() || !(amountNum >= 0) || !urlValid}>Adicionar</button>
          </div>
        </form>
      ) : (
        <button className={styles.addBtn} onClick={() => setAdding(true)}>
          <Icon name="plus" size={18} /> Adicionar item
        </button>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <h3 className={styles.subTitle}>Buscar e reservar</h3>
      <p className={styles.empty}>Busca já preenchida com destino, datas e o tamanho do grupo.</p>
      <div className={styles.links}>
        {searchLinks(trip, people).map(l => (
          <a key={l.label} className={styles.linkCard} href={l.href} target="_blank"
            rel={l.affiliate ? "sponsored noopener noreferrer" : "noopener noreferrer"}>
            <strong>{l.label}</strong>
            <span>{l.hint}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
