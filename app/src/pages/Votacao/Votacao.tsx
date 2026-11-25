import { useMemo, useState } from "react";
import { Icon } from "../../components/Icon";
import { Avatar } from "../../components/Sheet/Sheet";
import { CATEGORY_INFO, costLabel, type ItineraryItem } from "../../components/RoteiroViagem/RoteiroViagem";
import { useAuth } from "../../hooks/useAuth";
import { useTrip } from "../../hooks/useTrip";
import { useTripRows } from "../../hooks/useTripRows";
import { supabase } from "../../lib/supabase";
import { formatDay, memberLabel, toDayString, tripDays, type Trip, type TripMember } from "../../lib/trip-context";
import styles from "./Votacao.module.css";

type Choice = "vou" | "nao_vou" | "outro";

interface Vote {
  item_id: string;
  user_id: string;
  choice: Choice;
  alt_item_id: string | null;
}

const CHOICES: { id: Choice; label: string }[] = [
  { id: "vou",     label: "Vou" },
  { id: "nao_vou", label: "Não vou" },
  { id: "outro",   label: "Vou em outro" },
];

export function Votacao({ trip, onOpenRoteiro }: { trip: Trip; onOpenRoteiro: () => void }) {
  const { user } = useAuth();
  const { members } = useTrip();
  const days = useMemo(() => tripDays(trip), [trip]);
  const today = toDayString(new Date());
  const [day, setDay] = useState(days.includes(today) ? today : days[0]);
  const [error, setError] = useState<string | null>(null);

  const { rows: items, loading } = useTripRows<ItineraryItem>("itinerary_items", trip.id, [{ column: "day" }, { column: "position" }]);
  const { rows: votes } = useTripRows<Vote>("itinerary_votes", trip.id);

  const dayItems = items
    .filter(i => i.day === day)
    .sort((a, b) => (a.start_time ?? "99").localeCompare(b.start_time ?? "99") || a.position - b.position);
  const [main, ...others] = dayItems;

  async function vote(item: ItineraryItem, choice: Choice, alt: string | null = null) {
    if (!user) return;
    setError(null);
    const mine = votes.find(v => v.item_id === item.id && v.user_id === user.id);
    // Tocar de novo na mesma opção tira o voto
    const { error: err } = mine && mine.choice === choice && mine.alt_item_id === alt
      ? await supabase.from("itinerary_votes").delete().eq("item_id", item.id).eq("user_id", user.id)
      : await supabase.from("itinerary_votes").upsert(
          { item_id: item.id, user_id: user.id, trip_id: trip.id, choice, alt_item_id: alt },
          { onConflict: "item_id,user_id" },
        );
    if (err) setError("Não foi possível registrar seu voto.");
  }

  return (
    <section className={styles.wrap}>
      <header className={styles.head}>
        <span className={styles.kicker}>Votação do grupo</span>
        <h1 className={styles.title}>O que vamos <em>fazer?</em></h1>
        <p className={styles.sub}>Cada um marca se vai. O primeiro passeio do dia fica em destaque.</p>
      </header>

      <div className={styles.days} role="tablist" aria-label="Dias">
        {days.map((d, i) => {
          const count = items.filter(x => x.day === d).length;
          return (
            <button key={d} role="tab" aria-selected={d === day} className={d === day ? styles.dayOn : styles.day} onClick={() => setDay(d)}>
              <b>Dia {i + 1}</b>
              <small>{formatDay(d, { weekday: "short", day: "2-digit" })}</small>
              {count > 0 && <i>{count}</i>}
            </button>
          );
        })}
      </div>

      {loading && <p className={styles.empty}>Carregando...</p>}
      {!loading && !main && (
        <div className={styles.emptyCard}>
          <p>Nenhum passeio neste dia ainda.</p>
          <button className={styles.cta} onClick={onOpenRoteiro}>Ver roteiro</button>
        </div>
      )}

      {main && (
        <VoteCard item={main} featured members={members} votes={votes} userId={user?.id} alternatives={others} onVote={vote} />
      )}

      {others.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>Outros passeios do dia</h2>
          <div className={styles.list}>
            {others.map(it => (
              <VoteCard key={it.id} item={it} members={members} votes={votes} userId={user?.id}
                alternatives={dayItems.filter(x => x.id !== it.id)} onVote={vote} />
            ))}
          </div>
        </>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </section>
  );
}

interface CardProps {
  item: ItineraryItem;
  featured?: boolean;
  members: TripMember[];
  votes: Vote[];
  userId?: string;
  alternatives: ItineraryItem[];
  onVote: (item: ItineraryItem, choice: Choice, alt?: string | null) => void;
}

function VoteCard({ item, featured = false, members, votes, userId, alternatives, onVote }: CardProps) {
  const [picking, setPicking] = useState(false);
  const itemVotes = votes.filter(v => v.item_id === item.id);
  const mine = itemVotes.find(v => v.user_id === userId);
  const memberOf = (id: string) => members.find(m => m.user_id === id);
  const pending = members.filter(m => !itemVotes.some(v => v.user_id === m.user_id));
  const info = CATEGORY_INFO[item.category] ?? CATEGORY_INFO.passeio;
  const going = itemVotes.filter(v => v.choice === "vou").length;

  function choose(c: Choice) {
    if (c === "outro" && alternatives.length > 0) { setPicking(p => !p); return; }
    setPicking(false);
    onVote(item, c);
  }

  return (
    <article className={featured ? styles.featured : styles.card}>
      <div className={styles.media}>
        {item.image_url
          ? <img src={item.image_url} alt="" loading="lazy" />
          : <span className={styles.mediaFallback} data-cat={item.category}><Icon name={info.icon} size={featured ? 40 : 24} /></span>}
        <span className={styles.time}>{item.start_time ? item.start_time.slice(0, 5) : "--:--"}</span>
        {featured && <span className={styles.first}>Primeiro do dia</span>}
      </div>

      <div className={styles.body}>
        <span className={styles.tags}><b data-cat={item.category}>{info.label}</b> · {costLabel(item.cost_level)}</span>
        <h3 className={styles.itemTitle}>{item.title}</h3>
        {featured && item.notes && <p className={styles.notes}>{item.notes}</p>}

        <div className={styles.choices} role="group" aria-label={`Votar em ${item.title}`}>
          {CHOICES.map(c => {
            const count = itemVotes.filter(v => v.choice === c.id).length;
            const on = mine?.choice === c.id;
            return (
              <button key={c.id} className={styles.choice} data-choice={c.id} data-on={on} onClick={() => choose(c.id)} aria-pressed={on}>
                <span>{c.label}</span>
                {count > 0 && <i>{count}</i>}
              </button>
            );
          })}
        </div>

        {picking && (
          <div className={styles.altList}>
            <small>Qual você prefere?</small>
            {alternatives.map(a => (
              <button key={a.id} data-on={mine?.choice === "outro" && mine.alt_item_id === a.id}
                onClick={() => { setPicking(false); onVote(item, "outro", a.id); }}>
                {a.start_time?.slice(0, 5) ?? "--:--"} · {a.title}
              </button>
            ))}
          </div>
        )}

        {itemVotes.length > 0 && (
          <div className={styles.voters}>
            {CHOICES.map(c => {
              const list = itemVotes.filter(v => v.choice === c.id);
              if (!list.length) return null;
              return (
                <div key={c.id} className={styles.voterRow} data-choice={c.id}>
                  <span className={styles.voterLabel}>{c.label}</span>
                  <div className={styles.voterAvatars}>
                    {list.map(v => {
                      const m = memberOf(v.user_id);
                      const alt = v.alt_item_id ? alternatives.find(a => a.id === v.alt_item_id) : null;
                      return (
                        <span key={v.user_id} className={styles.voter} title={alt ? `${m ? memberLabel(m) : "Alguém"} → ${alt.title}` : m ? memberLabel(m) : "Alguém"}>
                          <Avatar name={m?.name ?? "?"} url={m?.avatar_url ?? null} />
                          {featured && <small>{m ? memberLabel(m) : "?"}{alt ? ` → ${alt.title}` : ""}</small>}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {featured && (
          <p className={styles.summary}>
            {going} de {members.length} confirmados
            {pending.length > 0 && ` · falta ${pending.map(memberLabel).join(", ")}`}
          </p>
        )}
      </div>
    </article>
  );
}
