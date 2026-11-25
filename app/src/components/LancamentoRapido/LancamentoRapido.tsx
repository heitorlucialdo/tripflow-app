import { useRef, useState } from "react";
import { Icon } from "../Icon";
import { parseExpense, type ExpenseDraft } from "../../lib/api";
import { getSpeechCtor, imageToDataUrl, type SpeechRecognizer } from "../../lib/media";
import styles from "./LancamentoRapido.module.css";

interface Props {
  tripId: string;
  onDraft: (draft: ExpenseDraft) => void;
}

export function LancamentoRapido({ tripId, onDraft }: Props) {
  const [text, setText]           = useState("");
  const [busy, setBusy]           = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recRef  = useRef<SpeechRecognizer | null>(null);
  const SpeechCtor = getSpeechCtor();

  async function send(input: { text?: string; image?: string }) {
    setBusy(true); setError(null);
    try {
      onDraft(await parseExpense(tripId, input));
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não consegui interpretar.");
    } finally {
      setBusy(false);
    }
  }

  function toggleMic() {
    if (!SpeechCtor) return;
    if (listening) { recRef.current?.stop(); return; }
    const rec = new SpeechCtor();
    rec.lang = "pt-BR";
    rec.interimResults = false;
    rec.onresult = e => {
      const said = Array.from(e.results).map(r => r[0].transcript).join(" ").trim();
      if (said) { setText(said); send({ text: said }); }
    };
    rec.onerror = () => setError("Não consegui ouvir. Tente de novo ou digite.");
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const image = await imageToDataUrl(file);
      await send({ image, text: text.trim() || undefined });
    } catch {
      setError("Não consegui abrir essa foto.");
    }
  }

  return (
    <div className={styles.box}>
      <div className={styles.header}>
        <Icon name="sparkle" size={18} />
        <span>Lançamento rápido</span>
      </div>
      <form
        className={styles.row}
        onSubmit={e => { e.preventDefault(); if (text.trim()) send({ text: text.trim() }); }}
      >
        <input
          className={styles.input}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={'Ex.: "paguei 240 no jantar, menos o Paulo"'}
          maxLength={1000}
          disabled={busy}
          aria-label="Descreva o gasto"
        />
        {SpeechCtor && (
          <button type="button" className={`${styles.iconBtn} ${listening ? styles.live : ""}`}
            onClick={toggleMic} disabled={busy} aria-label={listening ? "Parar de ouvir" : "Falar o gasto"}>
            <Icon name="mic" size={20} />
          </button>
        )}
        <button type="button" className={styles.iconBtn} onClick={() => fileRef.current?.click()}
          disabled={busy} aria-label="Fotografar a nota">
          <Icon name="camera" size={20} />
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      </form>
      <p className={styles.hint}>
        {busy ? "Lendo o gasto..." : listening ? "Ouvindo..." : "Escreva, fale ou fotografe a nota. Você confere antes de salvar."}
      </p>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
