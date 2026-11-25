import { supabase } from "./supabase";

const BASE = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3001";

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface FlightOption {
  id: string;
  best: boolean;
  price: number | null;
  totalMinutes: number | null;
  stops: number;
  airline: string;
  airlineLogo: string | null;
  flightNumbers: string[];
  departure: { airport: string; time: string };
  arrival:   { airport: string; time: string };
}

export interface FlightSearchResult {
  options: FlightOption[];
  insights: {
    lowestPrice: number | null;
    level: "low" | "typical" | "high" | null;
    typicalRange: [number, number] | null;
  };
  googleFlightsUrl: string | null;
  fetchedAt: string;
}

export interface FlightSearchParams {
  origin: string;
  destination: string;
  date: string;
  returnDate?: string;
  passengers: number;
}

// Erro com o status HTTP, para a tela diferenciar "não configurado" (503) de falha.
export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}, fallback = "Erro de conexão."): Promise<T> {
  const headers = { ...(await authHeaders()), ...(init.body ? { "Content-Type": "application/json" } : {}) };
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers: { ...headers, ...init.headers } });
  } catch {
    throw new ApiError("Sem conexão com o servidor.", 0);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new ApiError(err.error ?? fallback, res.status);
  }
  return await res.json() as T;
}

export async function searchFlights(params: FlightSearchParams): Promise<FlightSearchResult> {
  const qs = new URLSearchParams({
    origin:      params.origin.toUpperCase(),
    destination: params.destination.toUpperCase(),
    date:        params.date,
    passengers:  String(params.passengers),
  });
  if (params.returnDate) qs.set("return_date", params.returnDate);
  const data = await request<{ data: FlightSearchResult }>(`/flights/search?${qs}`, {}, "Erro ao buscar voos.");
  return data.data;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatEvent {
  text?: string;
  tool?: string;
  result?: string;
  error?: string;
}

// O backend responde em SSE: cada evento "data: {...}" traz o uso de uma
// ferramenta ou o texto final.
export async function sendChat(tripId: string, messages: ChatMessage[], onEvent: (e: ChatEvent) => void): Promise<void> {
  const headers = await authHeaders();
  let res: Response;
  try {
    res = await fetch(`${BASE}/ai/chat`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ trip_id: tripId, messages }),
    });
  } catch {
    throw new ApiError("Sem conexão com o servidor.", 0);
  }
  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new ApiError(err.error ?? "O assistente não respondeu.", res.status);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const ev of events) {
      const line = ev.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;
      try { onEvent(JSON.parse(payload) as ChatEvent); } catch { /* evento parcial ou inválido */ }
    }
  }
}

export interface SuggestedItem {
  title: string;
  start_time: string | null;
  notes: string | null;
}

export interface SuggestedDay {
  day: string;
  items: SuggestedItem[];
}

export async function suggestItinerary(
  tripId: string,
  opts: { interests: string[]; pace: "leve" | "moderado" | "intenso"; notes?: string },
): Promise<SuggestedDay[]> {
  const data = await request<{ data: { days: SuggestedDay[] } }>(
    "/ai/suggest",
    { method: "POST", body: JSON.stringify({ trip_id: tripId, ...opts }) },
    "Não consegui gerar sugestões agora.",
  );
  return data.data.days;
}

export interface ExpenseDraft {
  descricao: string;
  valor: number;
  categoria: string;
  pago_por: string;
  participantes: string[];
  data: string;
}

export async function parseExpense(tripId: string, input: { text?: string; image?: string }): Promise<ExpenseDraft> {
  const headers = await authHeaders();
  let res: Response;
  try {
    res = await fetch(`${BASE}/ai/parse-expense`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ trip_id: tripId, ...input }),
    });
  } catch {
    throw new Error("Sem conexão com o servidor. Lance o gasto manualmente.");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? "Não consegui interpretar. Lance o gasto manualmente.");
  }

  const data = await res.json() as { data: ExpenseDraft };
  return data.data;
}

export type ItemCategory = "passeio" | "restaurante" | "bar" | "balada" | "cafe" | "transporte";

export interface PlaceCandidate {
  name: string;
  category: ItemCategory;
  cost: number;
  lat: number;
  lng: number;
  address?: string;
  image?: string;
}

export interface ItemDraft {
  day: string;
  title: string;
  startTime: string | null;
  category: ItemCategory;
  costLevel: number;
  durationMin: number;
  notes: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  imageUrl: string | null;
}

export interface ItineraryOp {
  type: "adicionar" | "trocar" | "remover";
  item_id: string | null;
  item: ItemDraft;
}

export async function generateItinerary(
  tripId: string,
  opts: { tier: "economico" | "medio" | "premium" | "personalizado"; notes?: string; candidates: PlaceCandidate[] },
): Promise<number> {
  const data = await request<{ data: { count: number } }>(
    "/ai/itinerary/generate",
    { method: "POST", body: JSON.stringify({ trip_id: tripId, ...opts }) },
    "Não consegui montar o roteiro agora.",
  );
  return data.data.count;
}

export async function editItinerary(
  tripId: string,
  input: { text?: string; image?: string; candidates: PlaceCandidate[] },
): Promise<{ reply: string; ops: ItineraryOp[] }> {
  const data = await request<{ data: { reply: string; ops: ItineraryOp[] } }>(
    "/ai/itinerary/edit",
    { method: "POST", body: JSON.stringify({ trip_id: tripId, ...input }) },
    "A IA não respondeu agora.",
  );
  return data.data;
}

export async function applyItineraryOps(tripId: string, ops: ItineraryOp[]): Promise<void> {
  await request<{ data: { ok: boolean } }>(
    "/ai/itinerary/apply",
    { method: "POST", body: JSON.stringify({ trip_id: tripId, ops }) },
    "Não consegui aplicar as mudanças.",
  );
}
