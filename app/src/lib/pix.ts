// Pix "copia e cola" estático (BR Code / EMV-MPM), conforme o Manual do BR Code do Banco Central.
// Não passa por nenhum intermediário: o valor vai direto para a chave de quem recebe.

function field(id: string, value: string): string {
  return id + value.length.toString().padStart(2, "0") + value;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// O BR Code só aceita ASCII nos campos de nome e cidade.
function ascii(text: string, max: number): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .toUpperCase()
    .slice(0, max) || "NA";
}

export type PixKeyType = "cpf" | "cnpj" | "phone" | "email" | "random";

export function detectPixKeyType(raw: string): PixKeyType | null {
  const key = raw.trim();
  if (!key) return null;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)) return "email";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) return "random";
  if (key.startsWith("+") || /[()]/.test(key)) return "phone";
  const digits = key.replace(/\D/g, "");
  if (digits.length === 14) return "cnpj";
  // 11 dígitos tanto pode ser CPF quanto celular com DDD: decide pelo dígito verificador.
  if (digits.length === 11) return isValidCpf(digits) ? "cpf" : "phone";
  if (digits.length === 10) return "phone";
  return null;
}

function isValidCpf(digits: string): boolean {
  if (/^(\d)\1{10}$/.test(digits)) return false;
  const nums = digits.split("").map(Number);
  for (const len of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += nums[i] * (len + 1 - i);
    const check = ((sum * 10) % 11) % 10;
    if (check !== nums[len]) return false;
  }
  return true;
}

// Telefone precisa ir como +55DDDNUMERO; CPF/CNPJ só com dígitos.
export function normalizePixKey(raw: string): string | null {
  const type = detectPixKeyType(raw);
  const key = raw.trim();
  switch (type) {
    case "email":  return key.toLowerCase();
    case "random": return key.toLowerCase();
    case "cpf":
    case "cnpj":   return key.replace(/\D/g, "");
    case "phone": {
      const digits = key.replace(/\D/g, "");
      if (key.startsWith("+")) return "+" + digits;
      return digits.length === 10 || digits.length === 11 ? "+55" + digits : null;
    }
    default: return null;
  }
}

interface PixParams {
  key: string;
  receiverName: string;
  amount: number;
  description?: string;
  city?: string;
}

export function buildPixPayload({ key, receiverName, amount, description, city = "BRASIL" }: PixParams): string | null {
  const normalized = normalizePixKey(key);
  if (!normalized || !(amount > 0)) return null;

  const info = description ? ascii(description, 40) : "";
  const account =
    field("00", "br.gov.bcb.pix") +
    field("01", normalized) +
    (info ? field("02", info) : "");

  const body =
    field("00", "01") +
    field("26", account) +
    field("52", "0000") +
    field("53", "986") +
    field("54", amount.toFixed(2)) +
    field("58", "BR") +
    field("59", ascii(receiverName, 25)) +
    field("60", ascii(city, 15)) +
    field("62", field("05", "***")) +
    "6304";

  return body + crc16(body);
}
