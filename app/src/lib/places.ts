export interface GeoResult {
  label: string;
  name: string;
  lat: number;
  lng: number;
}

export type Category = "passeio" | "restaurante" | "bar" | "balada" | "cafe";

export interface Attraction {
  id: string;
  name: string;
  category: Category;
  description: string;
  summary: string;
  image: string;
  lat: number;
  lng: number;
  cost: CostLevel;
  address?: string;
  hours?: string;
  website?: string;
  phone?: string;
  cuisine?: string;
  instagram?: string;
  wikiTitle?: string;
  // Quanto de informação o lugar tem cadastrada; usado como sinal de relevância
  score: number;
}

// 0 grátis · 1 barato · 2 médio · 3 caro
export type CostLevel = 0 | 1 | 2 | 3;

export const COST_PRICE: Record<CostLevel, number> = { 0: 0, 1: 40, 2: 120, 3: 250 };

export const CATEGORY_LABEL: Record<Category, string> = {
  passeio: "Passeio",
  restaurante: "Restaurante",
  bar: "Bar",
  balada: "Balada",
  cafe: "Café",
};

interface NominatimItem {
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
}

function shortName(d: NominatimItem): string {
  const a = d.address ?? {};
  return d.name || a.city || a.town || a.village || a.municipality || d.display_name.split(",")[0];
}

export async function geocode(query: string): Promise<GeoResult[]> {
  const params = new URLSearchParams({
    format: "jsonv2",
    limit: "6",
    countrycodes: "br",
    addressdetails: "1",
    "accept-language": "pt-BR",
    q: query,
  });
  const res = await fetch("https://nominatim.openstreetmap.org/search?" + params.toString());
  if (!res.ok) throw new Error("Falha ao buscar endereço");
  const data = (await res.json()) as NominatimItem[];
  return data.map((d) => ({ label: d.display_name, name: shortName(d), lat: Number(d.lat), lng: Number(d.lon) }));
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeoResult> {
  const params = new URLSearchParams({
    format: "jsonv2",
    zoom: "10",
    addressdetails: "1",
    "accept-language": "pt-BR",
    lat: String(lat),
    lon: String(lng),
  });
  const res = await fetch("https://nominatim.openstreetmap.org/reverse?" + params.toString());
  if (!res.ok) throw new Error("Falha ao identificar sua cidade");
  const d = (await res.json()) as NominatimItem;
  return { label: d.display_name, name: shortName(d), lat, lng };
}

// ── Wikipédia: pontos turísticos com foto ──

interface WikiPage {
  pageid: number;
  title: string;
  description?: string;
  thumbnail?: { source: string };
  coordinates?: { lat: number; lon: number }[];
  pageprops?: { wikibase_item?: string };
}

// Geosearch traz tudo que tem coordenada (bairros, TVs, escolas); só entra o que é claramente ponto turístico
const IS_ATTRACTION =
  /(praia|museu|igreja|catedral|basílica|convento|mosteiro|forte|fortaleza|farol|parque|praça|mirante|teatro|monumento|palácio|mercado|elevador|centro histórico|largo|lagoa|lago|ilha|jardim|aquário|zoológico|cachoeira|ponto turístico|atração|centro cultural|memorial|solar|capela|santuário|estátua|cristo|morro|pedra|orla|feira|reserva|trilha|galeria|arena|estádio|planetário|terreiro|sítio histórico|patrimônio|ladeira|casarão|casa de|pelourinho|bondinho|teleférico|cânion|gruta|chapada|dique|rio )/i;
// Vale para o começo da descrição ("bairro de Salvador"), não para o meio ("praia no bairro da Barra")
const NOT_ATTRACTION =
  /^(bairro|emissora|clube|empresa|escola|colégio|hospital|rodovia|avenida|rua|estação|distrito|subprefeitura|cemitério|universidade|faculdade|jornal|organização|entidade|academia|município|time|partido|instituição|sede|edifício|prédio)/i;
const GONE = /(demolid|extint|desativad|antig[oa] )/i;

async function wikiApi(params: Record<string, string>): Promise<Record<string, WikiPage>> {
  const qs = new URLSearchParams({ action: "query", format: "json", origin: "*", ...params });
  const res = await fetch("https://pt.wikipedia.org/w/api.php?" + qs.toString());
  if (!res.ok) throw new Error("Falha ao buscar passeios");
  const data = (await res.json()) as { query?: { pages?: Record<string, WikiPage> } };
  return data.query?.pages ?? {};
}

async function wikiGeosearch(lat: number, lng: number): Promise<WikiPage[]> {
  const pages = await wikiApi({
    generator: "geosearch",
    ggscoord: `${lat}|${lng}`,
    ggsradius: "10000",
    ggslimit: "500",
    prop: "coordinates|description|pageprops",
    ppprop: "wikibase_item",
    colimit: "max",
  });
  const kept = Object.values(pages).filter((p) => {
    const text = `${p.title} ${p.description ?? ""}`;
    return IS_ATTRACTION.test(text) && !NOT_ATTRACTION.test((p.description ?? "").trim()) && !GONE.test(p.description ?? "");
  });

  // pageimages devolve no máximo 50 fotos por chamada, por isso as fotos vêm depois do filtro
  for (let i = 0; i < kept.length; i += 50) {
    const batch = kept.slice(i, i + 50);
    const imgs = await wikiApi({
      pageids: batch.map((p) => p.pageid).join("|"),
      prop: "pageimages",
      piprop: "thumbnail",
      pithumbsize: "640",
      pilimit: "max",
    }).catch(() => ({} as Record<string, WikiPage>));
    for (const p of batch) p.thumbnail = imgs[String(p.pageid)]?.thumbnail;
  }
  return kept;
}

// Resumo só é buscado para os lugares que entram no roteiro: a API limita extracts a 20 por chamada
export async function fetchSummaries(titles: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (let i = 0; i < titles.length; i += 20) {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      prop: "extracts",
      exintro: "1",
      explaintext: "1",
      exsentences: "3",
      exlimit: "max",
      redirects: "1",
      titles: titles.slice(i, i + 20).join("|"),
    });
    const res = await fetch("https://pt.wikipedia.org/w/api.php?" + params.toString());
    if (!res.ok) continue;
    const data = (await res.json()) as { query?: { pages?: Record<string, { title: string; extract?: string }> } };
    for (const p of Object.values(data.query?.pages ?? {})) if (p.extract) out[p.title] = p.extract;
  }
  return out;
}

// ── OpenStreetMap: restaurantes, bares, baladas, cafés e atrações fora da Wikipédia ──

interface OsmElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  tags: Record<string, string>;
}

interface NominatimPoi {
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  name: string;
  category: string;
  type: string;
  extratags?: Record<string, string> | null;
  address?: Record<string, string>;
}

// Frases especiais do Nominatim ("[restaurant]") retornam POIs da categoria dentro da viewbox
const POI_PHRASES = [
  "restaurant", "fast food", "bar", "nightclub", "cafe", "ice cream",
  "attraction", "museum", "aquarium", "zoo", "theme park", "park", "viewpoint", "beach", "gallery",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function nominatimPois(
  lat: number,
  lng: number,
  radiusKm: number,
  onProgress?: (done: number, total: number) => void,
): Promise<OsmElement[]> {
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  const viewbox = [lng - dLng, lat + dLat, lng + dLng, lat - dLat].join(",");
  const out: OsmElement[] = [];

  for (let i = 0; i < POI_PHRASES.length; i++) {
    // Política de uso do Nominatim: no máximo 1 requisição por segundo
    if (i > 0) await sleep(1100);
    onProgress?.(i, POI_PHRASES.length);
    const params = new URLSearchParams({
      format: "jsonv2",
      limit: "50",
      bounded: "1",
      viewbox,
      extratags: "1",
      addressdetails: "1",
      "accept-language": "pt-BR",
      q: `[${POI_PHRASES[i]}]`,
    });
    try {
      const res = await fetch("https://nominatim.openstreetmap.org/search?" + params.toString());
      if (!res.ok) continue;
      for (const p of (await res.json()) as NominatimPoi[]) {
        if (!p.name) continue;
        const a = p.address ?? {};
        out.push({
          type: p.osm_type,
          id: p.osm_id,
          lat: Number(p.lat),
          lon: Number(p.lon),
          tags: {
            ...(p.extratags ?? {}),
            name: p.name,
            [p.category]: p.type,
            ...(a.road ? { "addr:street": a.road } : {}),
            ...(a.house_number ? { "addr:housenumber": a.house_number } : {}),
            ...(a.suburb ? { "addr:suburb": a.suburb } : {}),
          },
        });
      }
    } catch {
      continue;
    }
  }
  onProgress?.(POI_PHRASES.length, POI_PHRASES.length);
  return out;
}

function osmCategory(t: Record<string, string>): Category {
  if (t.amenity === "nightclub" || t.amenity === "events_venue") return "balada";
  if (t.amenity === "bar" || t.amenity === "pub" || t.amenity === "biergarten") return "bar";
  if (t.amenity === "cafe" || t.amenity === "ice_cream") return "cafe";
  if (t.amenity) return "restaurante";
  return "passeio";
}

const UPSCALE = /(japanese|sushi|steak_house|french|italian|seafood|fine_dining|wine|mediterranean|peruvian|portuguese|churrascaria)/;

function osmCost(t: Record<string, string>, cat: Category): CostLevel {
  if (cat === "passeio") {
    if (t.natural === "beach" || t.tourism === "viewpoint" || t.leisure === "park" || t.leisure === "nature_reserve") return 0;
    if (t.fee === "no") return 0;
    if (t.tourism === "zoo" || t.tourism === "aquarium" || t.tourism === "theme_park" || t.leisure === "water_park") return 2;
    return 1;
  }
  if (t.amenity === "fast_food" || t.amenity === "food_court" || t.amenity === "ice_cream") return 1;
  if (cat === "cafe") return 1;
  if (cat === "balada") return 2;
  if (cat === "bar") return t.cocktails === "yes" || /wine|cocktail/.test(t.drink ?? "") ? 2 : 1;
  return UPSCALE.test(t.cuisine ?? "") ? 3 : 2;
}

function osmAddress(t: Record<string, string>): string | undefined {
  const street = [t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(", ");
  const parts = [street, t["addr:suburb"]].filter(Boolean);
  return parts.length ? parts.join(" · ") : undefined;
}

const CUISINE_PT: Record<string, string> = {
  regional: "regional", brazilian: "brasileira", pizza: "pizza", burger: "hambúrguer", japanese: "japonesa",
  sushi: "sushi", italian: "italiana", steak_house: "churrascaria", seafood: "frutos do mar", coffee_shop: "café",
  ice_cream: "sorvete", chinese: "chinesa", arab: "árabe", mexican: "mexicana", french: "francesa",
  vegetarian: "vegetariana", vegan: "vegana", portuguese: "portuguesa", bakery: "padaria", barbecue: "churrasco",
  sandwich: "lanches", chicken: "frango", fish: "peixes", peruvian: "peruana", acai: "açaí",
};

function translateCuisine(c?: string): string | undefined {
  if (!c) return undefined;
  return c.split(";").map((x) => CUISINE_PT[x.trim()] ?? x.trim().replace(/_/g, " ")).join(", ");
}

// ── Wikidata: foto oficial (P18) dos lugares do OSM que têm wikidata ──

async function wikidataImages(ids: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (let i = 0; i < ids.length; i += 50) {
    const params = new URLSearchParams({
      action: "wbgetentities",
      format: "json",
      origin: "*",
      props: "claims",
      ids: ids.slice(i, i + 50).join("|"),
    });
    const res = await fetch("https://www.wikidata.org/w/api.php?" + params.toString());
    if (!res.ok) continue;
    const data = (await res.json()) as {
      entities: Record<string, { claims?: { P18?: { mainsnak: { datavalue?: { value: string } } }[] } }>;
    };
    for (const [id, ent] of Object.entries(data.entities)) {
      const file = ent.claims?.P18?.[0]?.mainsnak.datavalue?.value;
      if (file) out[id] = commonsThumb(file);
    }
  }
  return out;
}

function commonsThumb(file: string): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file.replace(/ /g, "_"))}?width=640`;
}

function osmImage(t: Record<string, string>): string {
  if (t.image?.startsWith("http")) return t.image;
  if (t.wikimedia_commons?.startsWith("File:")) return commonsThumb(t.wikimedia_commons.slice(5));
  return "";
}

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s*\(.*\)$/, "").trim();

export async function fetchAttractions(
  lodging: { lat: number; lng: number },
  cityCenter: { lat: number; lng: number },
  onProgress?: (done: number, total: number) => void,
): Promise<Attraction[]> {
  const [wikiBatches, osmPois] = await Promise.all([
    Promise.all([lodging, cityCenter].map((c) => wikiGeosearch(c.lat, c.lng).catch(() => [] as WikiPage[]))),
    nominatimPois(lodging.lat, lodging.lng, 9, onProgress),
  ]);
  const osmBatches = [osmPois];

  const byId = new Map<string, Attraction>();
  const wikidataSeen = new Set<string>();
  const namesSeen = new Set<string>();

  for (const page of wikiBatches.flat()) {
    const coord = page.coordinates?.[0];
    const text = `${page.title} ${page.description ?? ""}`;
    const id = `w${page.pageid}`;
    if (!coord || !page.thumbnail || byId.has(id)) continue;
    const qid = page.pageprops?.wikibase_item;
    if (qid) wikidataSeen.add(qid);
    namesSeen.add(norm(page.title));
    byId.set(id, {
      id,
      name: page.title.replace(/\s*\(.*\)$/, ""),
      wikiTitle: page.title,
      category: "passeio",
      description: page.description ?? "",
      summary: "",
      image: page.thumbnail.source,
      lat: coord.lat,
      lng: coord.lon,
      cost: estimateCost(text),
      score: 10,
    });
  }

  const pendingImage = new Map<string, Attraction[]>();
  for (const el of osmBatches.flat()) {
    const t = el.tags;
    const lat = el.lat;
    const lng = el.lon;
    const id = `o${el.type[0]}${el.id}`;
    if (lat === undefined || lng === undefined || byId.has(id)) continue;
    if ((t.wikidata && wikidataSeen.has(t.wikidata)) || namesSeen.has(norm(t.name))) continue;
    // "[park]" traz toda praça de bairro; mantemos só parques de verdade
    if (t.leisure === "park" && !t.wikidata && !/^parque/i.test(t.name)) continue;
    const category = osmCategory(t);
    const image = osmImage(t);
    const website = t.website ?? t["contact:website"];
    const phone = t.phone ?? t["contact:phone"];
    const place: Attraction = {
      id,
      name: t.name,
      category,
      description: [CATEGORY_LABEL[category], translateCuisine(t.cuisine)].filter(Boolean).join(" · "),
      summary: t.description ?? "",
      image,
      lat,
      lng,
      cost: osmCost(t, category),
      address: osmAddress(t),
      hours: t.opening_hours,
      website,
      phone,
      instagram: t["contact:instagram"],
      cuisine: translateCuisine(t.cuisine),
      score:
        (t.wikidata ? 4 : 0) + (website ? 2 : 0) + (t.opening_hours ? 1 : 0) + (phone ? 1 : 0) +
        (t["contact:instagram"] ? 1 : 0) + (t.cuisine ? 1 : 0) + (image ? 2 : 0) -
        // redes (Pizza Hut, McDonald's) existem em qualquer cidade; o roteiro deve priorizar o local
        (t.brand || t["brand:wikidata"] ? 4 : 0),
    };
    if (!image && t.wikidata) pendingImage.set(t.wikidata, [...(pendingImage.get(t.wikidata) ?? []), place]);
    byId.set(id, place);
    namesSeen.add(norm(t.name));
  }

  if (pendingImage.size) {
    const images = await wikidataImages([...pendingImage.keys()].slice(0, 200)).catch(() => ({} as Record<string, string>));
    for (const [qid, places] of pendingImage) {
      if (!images[qid]) continue;
      for (const p of places) {
        p.image = images[qid];
        p.score += 2;
      }
    }
  }

  return [...byId.values()];
}

// Estimativa por palavra-chave até a IA do backend assumir essa classificação
export function estimateCost(text: string): CostLevel {
  const t = text.toLowerCase();
  if (/(pão de açúcar|helicóptero|cristo redentor|corcovado|passeio de barco)/.test(t)) return 3;
  if (/(aquário|bondinho|teleférico|zoológico|estádio|parque aquático|roda-gigante)/.test(t)) return 2;
  if (/(museu|centro cultural|jardim botânico|teatro|palácio|forte|planetário)/.test(t)) return 1;
  if (/(praia|parque|praça|mirante|igreja|catedral|lagoa|feira|escadaria|trilha|morro|pedra|floresta|orla|cachoeira)/.test(t)) return 0;
  return 1;
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
