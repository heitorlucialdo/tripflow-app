// AES-256-GCM com a chave da viagem (trip_secrets, só membros leem).
// Cada coordenada vira "iv.cifra" em base64, com IV aleatório por mensagem.

function toBase64(bytes: Uint8Array): string {
  let s = "";
  bytes.forEach(b => { s += String.fromCharCode(b); });
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(s.length));
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export async function importTripKey(base64Key: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", fromBase64(base64Key), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptCoord(key: CryptoKey, value: number): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(value.toFixed(6));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return `${toBase64(iv)}.${toBase64(new Uint8Array(cipher))}`;
}

export async function decryptCoord(key: CryptoKey, payload: string): Promise<number | null> {
  const [iv, cipher] = payload.split(".");
  if (!iv || !cipher) return null;
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(iv) }, key, fromBase64(cipher));
    const n = Number(new TextDecoder().decode(plain));
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}
