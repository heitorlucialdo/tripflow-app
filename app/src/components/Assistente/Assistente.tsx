import { useEffect, useRef, useState } from "react";
import { Sheet } from "../Sheet/Sheet";
import sheet from "../Sheet/Sheet.module.css";
import styles from "./Assistente.module.css";
import { useTrip } from "../../hooks/useTrip";
import { useAuth } from "../../hooks/useAuth";
import { useTripRows } from "../../hooks/useTripRows";
import { supabase } from "../../lib/supabase";
import { formatDay, type Trip } from "../../lib/trip-context";
import { sendChat, suggestItinerary, ApiError, type ChatMessage, type SuggestedDay } from "../../lib/api";
import type { ItineraryItem } from "../RoteiroViagem/RoteiroViagem";

type Mode = "chat" | "roteiro";

const TOOL_LABEL: Record<string, string> = {
  registrar_gasto:        "Registrou um gasto",
  resumo_gastos:          "Consultou os gastos",
  ver_roteiro:            "Consultou o roteiro",
  adicionar_item_roteiro: "Adicionou ao roteiro",
};

const INTERESTS = ["Praia", "Natureza", "Cultura", "Gastronomia", "Vida noturna", "Compras", "Aventura", "Com crianças"];

const STARTERS = [
  "Quanto cada um deve até agora?",
  "O que temos no roteiro de amanhã?",
  "Sugira um restaurante perto do nosso hotel",
];

// O chat mostra texto puro; alguns modelos insistem em Markdown mesmo pedindo que não.
function plainText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/^\s*[*-]\s+/gm, "• ")
    .replace(/^#{1,6}\s+/gm, "");
}

function unavailableMessage(err: unknown): string {
  if (err instanceof ApiError && err.status === 503) return "A IA não está configurada no servidor ainda.";
  return err instanceof Error ? err.message : "Algo deu errado. Tente de novo.";
}

export function Assistente({ onClose, onOpenViagens }: { onClose: () => void; onOpenViagens: () => void }) {
  const { activeTrip } = useTrip();
  const [mode, setMode] = useState<Mode>("chat");

  if (!activeTrip) {
    return (
      <Sheet title="Assistente" onClose={onClose}>
        <div className={sheet.section}>
          <p className={sheet.hint}>
            O assistente trabalha com os dados reais do grupo: gastos, saldos e roteiro.
            Crie uma viagem ou entre numa pelo convite para usar.
          </p>
          <button className={sheet.primaryBtn} onClick={() => { onClose(); onOpenViagens(); }}>
            Minhas viagens
          </button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title="Assistente" onClose={onClose}>
      <div className={styles.tabs} role="tablist" aria-label="Modo do assistente">
        <button role="tab" aria-selected={mode === "chat"} className={mode === "chat" ? styles.tabActive : styles.tab}
          onClick={() => setMode("chat")}>Conversar</button>
        <button role="tab" aria-selected={mode === "roteiro"} className={mode === "roteiro" ? styles.tabActive : styles.tab}
          onClick={() => setMode("roteiro")}>Montar roteiro</button>
      </div>
      {mode === "chat" ? <Chat trip={activeTrip} /> : <SugerirRoteiro trip={activeTrip} />}
    </Sheet>
  );
}

// ─── Conversa ─────────────────────────────────────────────────────────────────

interface Bubble extends ChatMessage {
  actions?: string[];
}

function Chat({ trip }: { trip: Trip }) {
  const [messages, setMessages] = useState<Bubble[]>([]);
  const [input, setInput]       = useState("");
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages, busy]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setError(null);
    setInput("");
    const history: Bubble[] = [...messages, { role: "user", content }];
    setMessages(history);
    setBusy(true);

    const actions: string[] = [];
    let reply = "";
    try {
      // Só as 20 últimas mensagens vão para o servidor; o resto fica só na tela.
      await sendChat(trip.id, history.slice(-20).map(({ role, content: c }) => ({ role, content: c })), ev => {
        if (ev.tool) actions.push(TOOL_LABEL[ev.tool] ?? ev.tool);
        if (ev.text) reply = ev.text;
        if (ev.error) throw new Error(ev.error);
      });
      setMessages([...history, { role: "assistant", content: reply || "Sem resposta.", actions }]);
    } catch (err) {
      setError(unavailableMessage(err));
      setMessages(history);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.chat}>
      <div className={styles.log} aria-live="polite">
        {messages.length === 0 && (
          <div className={styles.empty}>
            <p className={sheet.hint}>Pergunte sobre gastos, saldos, roteiro ou o destino. Exemplos:</p>
            {STARTERS.map(s => (
              <button key={s} className={styles.starter} onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? styles.userMsg : styles.botMsg}>
            {m.actions && m.actions.length > 0 && (
              <span className={styles.actions}>{[...new Set(m.actions)].join(" · ")}</span>
            )}
            <p>{m.role === "assistant" ? plainText(m.content) : m.content}</p>
          </div>
        ))}
        {busy && <div className={styles.botMsg}><p className={styles.typing}>Pensando...</p></div>}
        <div ref={endRef} />
      </div>

      {error && <p className={sheet.error} role="alert">{error}</p>}

      <form className={styles.composer} onSubmit={e => { e.preventDefault(); send(input); }}>
        <label htmlFor="assistente-input" className={styles.srOnly}>Mensagem para o assistente</label>
        <input
          id="assistente-input"
          className={sheet.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ex.: paguei 120 no almoço, divide com todo mundo"
          maxLength={2000}
          autoComplete="off"
        />
        <button className={sheet.primaryBtn} type="submit" disabled={busy || !input.trim()}>Enviar</button>
      </form>
    </div>
  );
}

// ─── Sugestão de roteiro com aprovação item a item ────────────────────────────

function SugerirRoteiro({ trip }: { trip: Trip }) {
  const { user } = useAuth();
  const { rows: existing } = useTripRows<ItineraryItem>("itinerary_items", trip.id, [{ column: "day" }, { column: "position" }]);
  const [interests, setInterests] = useState<string[]>([]);
  const [pace, setPace]           = useState<"leve" | "moderado" | "intenso">("moderado");
  const [notes, setNotes]         = useState("");
  const [days, setDays]           = useState<SuggestedDay[] | null>(null);
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [done, setDone]           = useState<number | null>(null);

  const keyOf = (day: string, i: number) => `${day}#${i}`;
  const total = selected.size;

  async function generate() {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const result = await suggestItinerary(trip.id, { interests, pace, notes: notes.trim() || undefined });
      setDays(result);
      setSelected(new Set(result.flatMap(d => d.items.map((_, i) => keyOf(d.day, i)))));
      if (result.length === 0) setError("A IA não trouxe sugestões para essas datas. Tente mudar os interesses.");
    } catch (err) {
      setError(unavailableMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function toggle(key: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function accept() {
    if (!days || !user) return;
    const nextPosition: Record<string, number> = {};
    for (const r of existing) nextPosition[r.day] = Math.max(nextPosition[r.day] ?? 0, r.position + 1);

    const rows = days.flatMap(d => d.items
      .map((item, i) => ({ item, key: keyOf(d.day, i) }))
      .filter(({ key }) => selected.has(key))
      .map(({ item }) => ({
        trip_id: trip.id,
        day: d.day,
        position: (nextPosition[d.day] = (nextPosition[d.day] ?? 0) + 1) - 1,
        title: item.title,
        start_time: item.start_time,
        notes: item.notes,
        created_by: user.id,
      })));
    if (rows.length === 0) return;

    setBusy(true);
    const { error: err } = await supabase.from("itinerary_items").insert(rows);
    setBusy(false);
    if (err) { setError("Não foi possível salvar no roteiro."); return; }
    setDone(rows.length);
    setDays(null);
  }

  if (days && days.length > 0) {
    return (
      <div className={sheet.section}>
        <p className={sheet.hint}>
          Sugestões da IA. Confira se o lugar está aberto e os preços antes de ir.
          Desmarque o que não quiser.
        </p>
        {days.map(d => (
          <div key={d.day} className={styles.dayGroup}>
            <h2 className={sheet.sectionTitle}>{formatDay(d.day, { weekday: "short", day: "2-digit", month: "2-digit" })}</h2>
            {d.items.map((item, i) => {
              const key = keyOf(d.day, i);
              return (
                <label key={key} className={styles.suggestion}>
                  <input type="checkbox" checked={selected.has(key)} onChange={() => toggle(key)} />
                  <span>
                    <span className={sheet.itemName}>{item.start_time ? `${item.start_time} · ` : ""}{item.title}</span>
                    {item.notes && <span className={sheet.itemMeta}>{item.notes}</span>}
                  </span>
                </label>
              );
            })}
          </div>
        ))}
        {error && <p className={sheet.error} role="alert">{error}</p>}
        <div className={sheet.actions}>
          <button className={sheet.secondaryBtn} onClick={() => setDays(null)} disabled={busy}>Descartar</button>
          <button className={sheet.primaryBtn} onClick={accept} disabled={busy || total === 0}>
            {busy ? "Salvando..." : `Adicionar ${total} ao roteiro`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={sheet.section}>
      {done !== null && <p className={styles.success} role="status">{done} atividade{done > 1 ? "s" : ""} no roteiro. O grupo já está vendo.</p>}
      <p className={sheet.hint}>
        A IA sugere atividades para {trip.destination}, dia a dia. Nada entra no roteiro sem você aprovar.
      </p>

      <span className={sheet.label}>Interesses do grupo</span>
      <div className={styles.chips}>
        {INTERESTS.map(i => (
          <button key={i} type="button" aria-pressed={interests.includes(i)}
            className={interests.includes(i) ? styles.chipActive : styles.chip}
            onClick={() => setInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}>
            {i}
          </button>
        ))}
      </div>

      <label className={sheet.label} htmlFor="sugestao-ritmo">Ritmo</label>
      <select id="sugestao-ritmo" className={sheet.input} value={pace} onChange={e => setPace(e.target.value as typeof pace)}>
        <option value="leve">Leve: até 2 atividades por dia</option>
        <option value="moderado">Moderado: até 3 por dia</option>
        <option value="intenso">Intenso: até 5 por dia</option>
      </select>

      <label className={sheet.label} htmlFor="sugestao-obs">Algo mais? (opcional)</label>
      <input id="sugestao-obs" className={sheet.input} value={notes} maxLength={300}
        onChange={e => setNotes(e.target.value)} placeholder="Ex.: sem trilhas longas, um vegetariano no grupo" />

      {error && <p className={sheet.error} role="alert">{error}</p>}
      <button className={sheet.primaryBtn} onClick={generate} disabled={busy}>
        {busy ? "Gerando sugestões..." : "Gerar sugestões"}
      </button>
    </div>
  );
}
