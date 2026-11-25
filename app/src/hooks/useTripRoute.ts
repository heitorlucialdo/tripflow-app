import { useState } from "react";
import type { GeoResult } from "../lib/places";

export interface TripRoute {
  origin: GeoResult;
  destination: GeoResult;
}

// Rascunho pessoal do usuário antes de existir uma trip no Supabase; não é dado de grupo
const KEY = "tripflow-route";

function load(): TripRoute | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TripRoute) : null;
  } catch {
    return null;
  }
}

export function useTripRoute() {
  const [route, setRouteState] = useState<TripRoute | null>(load);

  function setRoute(r: TripRoute | null) {
    setRouteState(r);
    try {
      if (r) localStorage.setItem(KEY, JSON.stringify(r));
      else localStorage.removeItem(KEY);
    } catch { /* armazenamento indisponível: segue só em memória */ }
  }

  return { route, setRoute };
}
