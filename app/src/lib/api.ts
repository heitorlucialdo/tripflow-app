import { supabase } from "./supabase";

const BASE = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3001";

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface FlightSegment {
  departure: { iataCode: string; at: string };
  arrival:   { iataCode: string; at: string };
  carrierCode: string;
  number: string;
  numberOfStops: number;
}

export interface FlightOffer {
  id: string;
  price: { total: string; currency: string };
  itineraries: {
    duration: string;
    segments: FlightSegment[];
  }[];
  numberOfBookableSeats: number;
}

export interface FlightSearchParams {
  origin: string;
  destination: string;
  date: string;
  passengers: number;
}

export async function searchFlights(params: FlightSearchParams): Promise<FlightOffer[]> {
  const headers = await authHeaders();
  const qs = new URLSearchParams({
    origin:      params.origin.toUpperCase(),
    destination: params.destination.toUpperCase(),
    date:        params.date,
    passengers:  String(params.passengers),
  });

  const res = await fetch(`${BASE}/flights/search?${qs}`, { headers });
  if (!res.ok) {
    const err = await res.json() as { error?: string };
    throw new Error(err.error ?? "Erro ao buscar voos.");
  }

  const data = await res.json() as { data: FlightOffer[] };
  return data.data;
}
