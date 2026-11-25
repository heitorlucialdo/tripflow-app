import { createContext } from "react";

export interface Trip {
  id: string;
  name: string;
  origin: string;
  destination: string;
  start_date: string;
  end_date: string;
  created_by: string;
}

export interface TripMember {
  user_id: string;
  role: "admin" | "member";
  name: string;
  nickname: string | null;
  avatar_url: string | null;
  pix_key: string | null;
}

export interface NewTrip {
  name: string;
  origin: string;
  destination: string;
  start_date: string;
  end_date: string;
}

export interface TripContextValue {
  trips: Trip[];
  activeTrip: Trip | null;
  members: TripMember[];
  isAdmin: boolean;
  loading: boolean;
  // true só quando a pessoa escolheu ver a viagem de exemplo
  demoMode: boolean;
  selectTrip: (id: string | null) => void;
  createTrip: (input: NewTrip) => Promise<Trip>;
  reloadTrips: () => Promise<void>;
}

export const TripContext = createContext<TripContextValue | null>(null);

export function memberLabel(m: Pick<TripMember, "name" | "nickname">): string {
  return m.nickname?.trim() || m.name.split(" ")[0] || "Viajante";
}

// Datas do banco chegam como "YYYY-MM-DD"; montar a data local evita o
// deslocamento de um dia que new Date("YYYY-MM-DD") causa no fuso do Brasil.
export function parseDay(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toDayString(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

export function tripDays(trip: Pick<Trip, "start_date" | "end_date">): string[] {
  const days: string[] = [];
  const end = parseDay(trip.end_date);
  for (let cur = parseDay(trip.start_date); cur <= end; cur.setDate(cur.getDate() + 1)) {
    days.push(toDayString(cur));
  }
  return days;
}

export function formatDay(day: string, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" }): string {
  return parseDay(day).toLocaleDateString("pt-BR", opts);
}

// Valor guardado como viagem ativa quando a pessoa abre a demo de propósito.
export const DEMO_TRIP_ID = "demo";

// Guarda o convite enquanto a pessoa faz login em outra tela.
export const PENDING_INVITE_KEY = "tripflow-pending-invite";
