import { useEffect, useRef, useState } from "react";
import { Sheet } from "../Sheet/Sheet";
import { Icon } from "../Icon";
import { applyItineraryOps, editItinerary, type ItineraryOp, type PlaceCandidate } from "../../lib/api";
import { getSpeechCtor, imageToDataUrl, transcriptOf, type SpeechRecognizer } from "../../lib/media";
import { formatDay, tripDays, type Trip } from "../../lib/trip-context";
import { loadCandidates } from "../EstiloRoteiro/EstiloRoteiro";
import styles from "./AssistenteRoteiro.module.css";

interface Msg {
  id: number;
  from: "user" | "ai";
  text: string;
  image?: string;
  ops?: ItineraryOp[];
  applied?: boolean;
}

const OP_LABEL: Record<ItineraryOp["type"], string> = { adicionar: "Adicionar", trocar: "Trocar", remover: "Remover" };

const SUGGESTIONS = [
  "Coloca um pôr do sol na praia no dia 2",
  "Troca o jantar do primeiro dia por algo mais barato",
  "Adiciona uma balada no sábado",
];

export function AssistenteRoteiro({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const [msgs, setMsgs]         = useState<Msg[]>([
    { id: 0, from: "ai", text: `Me diz o que mudar no roteiro de ${trip.destination}. Pode escrever, mandar áudio ou foto de um lugar, cardápio ou anúncio de passeio.` },
  ]);
  const [text, setText]         = useState("");
  const [image, setImage]       = useState<string | null>(null);
  const [busy, setBusy]         = useState(false);
  const [listening, setListening] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const recRef  = useRef<SpeechRecognizer | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const Speech  = getSpeechCtor();
  const days    = tripDays(trip);
  const candidatesRef = useRef<Promise<PlaceCandidate[]> | null>(null);

  // Busca lugares reais em segundo plano; a conversa não espera mais que 3 s por eles
  useEffect(() => { candidatesRef.current = loadCandidates(trip, () => {}); }, [trip]);

  const push = (m: Omit<Msg, "id">) => {
    setMsgs(prev => [...prev, { ...m, id: prev.length }]);
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }));
  };

  async function send(input: string) {
    const body = input.trim();
    if ((!body && !image) || busy) return;
    push({ from: "user", text: body || "Encaixa isso no roteiro", image: image ?? undefined });
    const img = image;
    setText(""); setImage(null); setBusy(true);
    try {
      const candidates = await Promise.race([
        candidatesRef.current ?? Promise.resolve([]),
        new Promise<PlaceCandidate[]>(r => setTimeout(() => r([]), 3000)),
      ]);
      const res = await editItinerary(trip.id, { text: body || undefined, image: img ?? undefined, candidates });
      push({ from: "ai", text: res.reply || (res.ops.length ? "Olha a proposta:" : "Não encontrei o que mudar."), ops: res.ops });
    } catch (err) {
      push({ from: "ai", text: err instanceof Error ? err.message : "Não consegui responder agora." });
    } finally {
      setBusy(false);
    }
  }

  async function apply(m: Msg) {
    if (!m.ops?.length) return;
    setBusy(true);
    try {
      await applyItineraryOps(trip.id, m.ops);
      setMsgs(prev => prev.map(x => (x.id === m.id ? { ...x, applied: true } : x)));
      push({ from: "ai", text: "Pronto, roteiro atualizado para todo o grupo." });
    } catch (err) {
      push({ from: "ai", text: err instanceof Error ? err.message : "Não consegui aplicar." });
    } finally {
      setBusy(false);
    }
  }

  function toggleMic() {
    if (!Speech) return;
    if (listening) { recRef.current?.stop(); return; }
    const rec = new Speech();
    rec.lang = "pt-BR";
    rec.interimResults = false;
    rec.onresult = e => { const said = transcriptOf(e); if (said) send(said); };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try { setImage(await imageToDataUrl(file)); } catch { push({ from: "ai", text: "Não consegui abrir essa foto." }); }
  }

  const dayLabel = (d: string) => `Dia ${days.indexOf(d) + 1} · ${formatDay(d)}`;

  return (
    <Sheet title="Ajustar roteiro com IA" onClose={onClose}>
      <div className={styles.chat} ref={listRef}>
        {msgs.map(m => (
          <div key={m.id} className={m.from === "user" ? styles.user : styles.ai}>
            {m.image && <img src={m.image} alt="Foto enviada" className={styles.photo} />}
            <p>{m.text}</p>
            {m.ops && m.ops.length > 0 && (
              <div className={styles.ops}>
                {m.ops.map((op, i) => (
                  <div key={i} className={styles.op} data-type={op.type}>
                    <span className={styles.opType}>{OP_LABEL[op.type]}</span>
                    <strong>{op.item.title}</strong>
                    <small>{dayLabel(op.item.day)}{op.item.startTime ? ` · ${op.item.startTime}` : ""}</small>
                  </div>
                ))}
                <button className={styles.apply} onClick={() => apply(m)} disabled={busy || m.applied}>
                  {m.applied ? "Aplicado" : "Aplicar no roteiro"}
                </button>
              </div>
            )}
          </div>
        ))}
        {busy && <div className={styles.ai}><p className={styles.typing}><span /><span /><span /></p></div>}
      </div>

      {msgs.length === 1 && (
        <div className={styles.suggestions}>
          {SUGGESTIONS.map(s => <button key={s} onClick={() => send(s)} disabled={busy}>{s}</button>)}
        </div>
      )}

      {image && (
        <div className={styles.preview}>
          <img src={image} alt="Foto para enviar" />
          <button onClick={() => setImage(null)} aria-label="Remover foto"><Icon name="close" size={14} /></button>
        </div>
      )}

      <form className={styles.bar} onSubmit={e => { e.preventDefault(); send(text); }}>
        <button type="button" className={styles.icon} onClick={() => fileRef.current?.click()} disabled={busy} aria-label="Enviar foto">
          <Icon name="camera" size={20} />
        </button>
        <input className={styles.input} value={text} onChange={e => setText(e.target.value)} maxLength={1000} disabled={busy}
          placeholder={listening ? "Ouvindo..." : "Ex.: quero um passeio de barco"} aria-label="Mensagem para a IA" />
        {Speech && !text.trim() && !image ? (
          <button type="button" className={`${styles.icon} ${listening ? styles.live : ""}`} onClick={toggleMic} disabled={busy}
            aria-label={listening ? "Parar de ouvir" : "Falar"}>
            <Icon name="mic" size={20} />
          </button>
        ) : (
          <button type="submit" className={styles.send} disabled={busy || (!text.trim() && !image)} aria-label="Enviar">
            <Icon name="up" size={20} />
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      </form>
    </Sheet>
  );
}
