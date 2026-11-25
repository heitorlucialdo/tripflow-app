import { z } from "zod";

const SERPAPI_URL = "https://serpapi.com/search.json";

export const flightsConfigured = Boolean(process.env.SERPAPI_KEY);

export class FlightProviderError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const airportSchema = z.object({
  id:   z.string(),
  name: z.string().optional(),
  time: z.string().optional(),
});

const segmentSchema = z.object({
  departure_airport: airportSchema,
  arrival_airport:   airportSchema,
  duration:          z.number().optional(),
  airline:           z.string().optional(),
  airline_logo:      z.string().optional(),
  flight_number:     z.string().optional(),
});

const optionSchema = z.object({
  flights:        z.array(segmentSchema).min(1),
  layovers:       z.array(z.object({ id: z.string().optional(), duration: z.number().optional() })).optional(),
  total_duration: z.number().optional(),
  price:          z.number().optional(),
});

const responseSchema = z.object({
  best_flights:  z.array(optionSchema).optional(),
  other_flights: z.array(optionSchema).optional(),
  price_insights: z.object({
    lowest_price:        z.number().optional(),
    price_level:         z.string().optional(),
    typical_price_range: z.array(z.number()).optional(),
  }).optional(),
  search_metadata: z.object({ google_flights_url: z.string().optional() }).optional(),
  error: z.string().optional(),
});

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

function mapOption(o: z.infer<typeof optionSchema>, best: boolean, index: number): FlightOption {
  const first = o.flights[0];
  const last  = o.flights[o.flights.length - 1];
  const airlines = [...new Set(o.flights.map(f => f.airline).filter(Boolean))];
  return {
    id: `${best ? "b" : "o"}${index}`,
    best,
    price: o.price ?? null,
    totalMinutes: o.total_duration ?? null,
    stops: o.flights.length - 1,
    airline: airlines.join(" + ") || "Companhia não informada",
    airlineLogo: first.airline_logo ?? null,
    flightNumbers: o.flights.map(f => f.flight_number).filter((n): n is string => Boolean(n)),
    departure: { airport: first.departure_airport.id, time: first.departure_airport.time ?? "" },
    arrival:   { airport: last.arrival_airport.id,   time: last.arrival_airport.time ?? "" },
  };
}

export async function searchFlights(params: FlightSearchParams): Promise<FlightSearchResult> {
  const key = process.env.SERPAPI_KEY;
  if (!key) throw new FlightProviderError("Busca de voos não configurada.", 503);

  const url = new URL(SERPAPI_URL);
  url.searchParams.set("engine", "google_flights");
  url.searchParams.set("departure_id", params.origin);
  url.searchParams.set("arrival_id", params.destination);
  url.searchParams.set("outbound_date", params.date);
  if (params.returnDate) url.searchParams.set("return_date", params.returnDate);
  url.searchParams.set("type", params.returnDate ? "1" : "2");
  url.searchParams.set("adults", String(params.passengers));
  url.searchParams.set("currency", "BRL");
  url.searchParams.set("hl", "pt-br");
  url.searchParams.set("gl", "br");
  url.searchParams.set("api_key", key);

  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (res.status === 401) throw new FlightProviderError("Chave da SerpApi inválida.", 502);
  if (res.status === 429) throw new FlightProviderError("Limite mensal de buscas atingido. Tente mais tarde.", 429);

  const parsed = responseSchema.safeParse(await res.json());
  if (!parsed.success) throw new FlightProviderError("Resposta inesperada do provedor de voos.", 502);

  const data = parsed.data;
  // A SerpApi devolve 200 com "error" quando não há resultados para a rota.
  if (data.error && !data.best_flights && !data.other_flights) {
    if (/no results/i.test(data.error)) {
      return { options: [], insights: { lowestPrice: null, level: null, typicalRange: null }, googleFlightsUrl: null, fetchedAt: new Date().toISOString() };
    }
    throw new FlightProviderError("Não foi possível buscar voos agora.", 502);
  }

  const level = data.price_insights?.price_level;
  const range = data.price_insights?.typical_price_range;

  return {
    options: [
      ...(data.best_flights ?? []).map((o, i) => mapOption(o, true, i)),
      ...(data.other_flights ?? []).map((o, i) => mapOption(o, false, i)),
    ].slice(0, 20),
    insights: {
      lowestPrice: data.price_insights?.lowest_price ?? null,
      level: level === "low" || level === "typical" || level === "high" ? level : null,
      typicalRange: range && range.length === 2 ? [range[0], range[1]] : null,
    },
    googleFlightsUrl: data.search_metadata?.google_flights_url ?? null,
    fetchedAt: new Date().toISOString(),
  };
}
