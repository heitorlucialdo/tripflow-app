import { COST_PRICE, distanceKm, type Attraction, type Category, type GeoResult } from "./places";

export type Tier = "barato" | "medio" | "caro" | "personalizado";

export type Slot = "passeio" | "almoco" | "jantar" | "noite";

export interface PlanStop {
  place: Attraction;
  slot: Slot;
}

export interface PlanDay {
  stops: PlanStop[];
  km: number;
  cost: number;
}

interface Rule {
  sights: number;        // passeios por dia
  maxSight: number;      // custo máximo dos passeios
  food: number[];        // faixas de preço aceitas nos restaurantes
  night: Category[];     // o que entra à noite
  kmPrice: number;       // R$ por km de deslocamento
}

const RULES: Record<Exclude<Tier, "personalizado">, Rule> = {
  barato: { sights: 3, maxSight: 1, food: [1],    night: [],                kmPrice: 0.8 },
  medio:  { sights: 3, maxSight: 2, food: [2, 1], night: ["bar"],           kmPrice: 2.5 },
  caro:   { sights: 3, maxSight: 3, food: [3, 2], night: ["balada", "bar"], kmPrice: 6 },
};

type Point = { lat: number; lng: number };

// Vizinho mais próximo partindo da hospedagem: não é a rota ótima, mas evita zigue-zague pela cidade
function orderByProximity(start: Point, places: Attraction[]): Attraction[] {
  const left = [...places];
  const out: Attraction[] = [];
  let cur: Point = start;
  while (left.length) {
    let best = 0;
    for (let i = 1; i < left.length; i++) {
      if (distanceKm(cur, left[i]) < distanceKm(cur, left[best])) best = i;
    }
    cur = left[best];
    out.push(left.splice(best, 1)[0]);
  }
  return out;
}

// Melhor lugar perto de um ponto: relevância pesa, mas distância acima de ~3 km derruba a nota
function nearestGood(from: Point, pool: Attraction[], used: Set<string>, preferCost?: number): Attraction | undefined {
  let best: Attraction | undefined;
  let bestScore = -Infinity;
  for (const p of pool) {
    if (used.has(p.id)) continue;
    const s = p.score - distanceKm(from, p) * 1.5 + (p.cost === preferCost ? 3 : 0);
    if (s > bestScore) {
      best = p;
      bestScore = s;
    }
  }
  return best;
}

function dayTotals(lodging: Point, stops: PlanStop[], kmPrice: number): { km: number; cost: number } {
  let km = 0;
  let prev: Point = lodging;
  for (const s of stops) {
    km += distanceKm(prev, s.place);
    prev = s.place;
  }
  km += distanceKm(prev, lodging);
  const entries = stops.reduce((sum, s) => sum + COST_PRICE[s.place.cost], 0);
  return { km, cost: Math.round(entries + km * kmPrice) };
}

export function buildTierPlan(places: Attraction[], lodging: GeoResult, tier: Exclude<Tier, "personalizado">, days: number): PlanDay[] {
  const rule = RULES[tier];
  const sights = places
    .filter((p) => p.category === "passeio" && p.cost <= rule.maxSight)
    .sort((a, b) =>
      tier === "caro"
        ? b.cost - a.cost || b.score - a.score
        : b.score - a.score - (distanceKm(lodging, b) - distanceKm(lodging, a)) * 0.5,
    )
    .slice(0, rule.sights * days);

  const food = places.filter((p) => p.category === "restaurante" && rule.food.includes(p.cost));
  const night = places.filter((p) => rule.night.includes(p.category));
  const ordered = orderByProximity(lodging, sights);
  const used = new Set<string>();
  const result: PlanDay[] = [];

  for (let d = 0; d < days; d++) {
    const daySights = ordered.slice(d * rule.sights, (d + 1) * rule.sights);
    if (!daySights.length) break;
    const stops: PlanStop[] = [];
    daySights.forEach((s, i) => {
      stops.push({ place: s, slot: "passeio" });
      // almoço depois do primeiro passeio, perto dele
      if (i === 0) {
        const lunch = nearestGood(s, food, used, rule.food[0]);
        if (lunch) { used.add(lunch.id); stops.push({ place: lunch, slot: "almoco" }); }
      }
    });
    const last = daySights[daySights.length - 1];
    const dinner = nearestGood(last, food, used, rule.food[0]);
    if (dinner) { used.add(dinner.id); stops.push({ place: dinner, slot: "jantar" }); }
    if (night.length) {
      const out = nearestGood(dinner ?? last, night, used);
      if (out) { used.add(out.id); stops.push({ place: out, slot: "noite" }); }
    }
    result.push({ stops, ...dayTotals(lodging, stops, rule.kmPrice) });
  }
  return result;
}

const SLOT_FOR: Record<Category, Slot> = {
  passeio: "passeio",
  cafe: "passeio",
  restaurante: "almoco",
  bar: "noite",
  balada: "noite",
};

export function buildCustomPlan(chosen: Attraction[], lodging: GeoResult, days: number): PlanDay[] {
  const ordered = orderByProximity(lodging, chosen);
  const perDay = Math.max(1, Math.ceil(ordered.length / days));
  const result: PlanDay[] = [];
  for (let i = 0; i < ordered.length; i += perDay) {
    // noite sempre por último no dia
    const stops = ordered
      .slice(i, i + perDay)
      .map((p) => ({ place: p, slot: SLOT_FOR[p.category] }))
      .sort((a, b) => Number(a.slot === "noite") - Number(b.slot === "noite"));
    result.push({ stops, ...dayTotals(lodging, stops, RULES.medio.kmPrice) });
  }
  return result;
}

export function mapsLink(lodging: GeoResult, stops: PlanStop[]): string {
  const p = (x: Point) => `${x.lat},${x.lng}`;
  const params = new URLSearchParams({
    api: "1",
    origin: p(lodging),
    destination: p(lodging),
    // Google Maps aceita no máximo 9 paradas intermediárias pela URL
    waypoints: stops.slice(0, 9).map((s) => p(s.place)).join("|"),
    travelmode: "driving",
  });
  return "https://www.google.com/maps/dir/?" + params.toString();
}
