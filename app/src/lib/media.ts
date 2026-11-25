// A Web Speech API não está nos tipos padrão do TypeScript.
interface SpeechResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}
export interface SpeechRecognizer {
  lang: string;
  interimResults: boolean;
  continuous?: boolean;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
export type SpeechCtor = new () => SpeechRecognizer;

export function getSpeechCtor(): SpeechCtor | null {
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function transcriptOf(e: SpeechResultEvent): string {
  return Array.from(e.results).map(r => r[0]?.transcript ?? "").join(" ").trim();
}

const MAX_SIDE = 1600;

// Reduz a foto antes de enviar: menos dados móveis e leitura igual para a IA.
export function imageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error("canvas")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("imagem")); };
    img.src = url;
  });
}
