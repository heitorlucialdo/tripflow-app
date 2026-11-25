// Cidades com aeroporto comercial, para a busca de passagens aceitar nome de
// cidade além do código. "codes" com mais de um aeroporto busca em todos.
export interface Destino {
  city: string;
  codes: string[];
  country?: string;
}

export const DESTINOS: Destino[] = [
  { city: "São Paulo", codes: ["GRU", "CGH", "VCP"] },
  { city: "Rio de Janeiro", codes: ["GIG", "SDU"] },
  { city: "Belo Horizonte", codes: ["CNF", "PLU"] },
  { city: "Brasília", codes: ["BSB"] },
  { city: "Salvador", codes: ["SSA"] },
  { city: "Recife", codes: ["REC"] },
  { city: "Fortaleza", codes: ["FOR"] },
  { city: "Porto Alegre", codes: ["POA"] },
  { city: "Curitiba", codes: ["CWB"] },
  { city: "Florianópolis", codes: ["FLN"] },
  { city: "Manaus", codes: ["MAO"] },
  { city: "Belém", codes: ["BEL"] },
  { city: "Goiânia", codes: ["GYN"] },
  { city: "Cuiabá", codes: ["CGB"] },
  { city: "Campo Grande", codes: ["CGR"] },
  { city: "Natal", codes: ["NAT"] },
  { city: "Maceió", codes: ["MCZ"] },
  { city: "João Pessoa", codes: ["JPA"] },
  { city: "Aracaju", codes: ["AJU"] },
  { city: "Teresina", codes: ["THE"] },
  { city: "São Luís", codes: ["SLZ"] },
  { city: "Vitória", codes: ["VIX"] },
  { city: "Porto Velho", codes: ["PVH"] },
  { city: "Rio Branco", codes: ["RBR"] },
  { city: "Macapá", codes: ["MCP"] },
  { city: "Boa Vista", codes: ["BVB"] },
  { city: "Palmas", codes: ["PMW"] },
  { city: "Foz do Iguaçu", codes: ["IGU"] },
  { city: "Porto Seguro", codes: ["BPS"] },
  { city: "Navegantes", codes: ["NVT"] },
  { city: "Londrina", codes: ["LDB"] },
  { city: "Uberlândia", codes: ["UDI"] },
  { city: "Ribeirão Preto", codes: ["RAO"] },
  { city: "Ilhéus", codes: ["IOS"] },
  { city: "Fernando de Noronha", codes: ["FEN"] },
  { city: "Jericoacoara", codes: ["JJD"] },
  { city: "Bonito", codes: ["BYO"] },
  { city: "Chapecó", codes: ["XAP"] },
  { city: "Joinville", codes: ["JOI"] },
  { city: "Montes Claros", codes: ["MOC"] },
  { city: "Petrolina", codes: ["PNZ"] },
  { city: "Santarém", codes: ["STM"] },
  { city: "Buenos Aires", codes: ["EZE", "AEP"], country: "Argentina" },
  { city: "Santiago", codes: ["SCL"], country: "Chile" },
  { city: "Montevidéu", codes: ["MVD"], country: "Uruguai" },
  { city: "Lima", codes: ["LIM"], country: "Peru" },
  { city: "Bogotá", codes: ["BOG"], country: "Colômbia" },
  { city: "Cancún", codes: ["CUN"], country: "México" },
  { city: "Cidade do México", codes: ["MEX"], country: "México" },
  { city: "Miami", codes: ["MIA"], country: "EUA" },
  { city: "Orlando", codes: ["MCO"], country: "EUA" },
  { city: "Nova York", codes: ["JFK", "EWR", "LGA"], country: "EUA" },
  { city: "Lisboa", codes: ["LIS"], country: "Portugal" },
  { city: "Porto", codes: ["OPO"], country: "Portugal" },
  { city: "Madri", codes: ["MAD"], country: "Espanha" },
  { city: "Barcelona", codes: ["BCN"], country: "Espanha" },
  { city: "Paris", codes: ["CDG", "ORY"], country: "França" },
  { city: "Londres", codes: ["LHR", "LGW"], country: "Reino Unido" },
  { city: "Roma", codes: ["FCO"], country: "Itália" },
  { city: "Milão", codes: ["MXP"], country: "Itália" },
];

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function destinoLabel(d: Destino): string {
  return `${d.city}${d.country ? `, ${d.country}` : ""} (${d.codes.join(", ")})`;
}

// Aceita "Cuiabá", "cuiaba", "CGB", "gru" ou o texto da sugestão "Cuiabá (CGB)".
// Devolve os códigos para a busca, ou null se não reconhecer.
export function resolverAeroporto(input: string): { codes: string[]; label: string } | null {
  const text = input.replace(/\s*\(.*\)\s*$/, "");
  // "Cuiabá - MT", "Cuiabá, MT" ou "Cuiabá/MT": vale só o nome da cidade.
  const n = normalize(text).split(/\s*[-,/]\s*/)[0];
  if (!n) return null;

  const byCity = DESTINOS.find(d => normalize(d.city) === n)
    ?? DESTINOS.find(d => normalize(destinoLabel(d)) === normalize(input));
  if (byCity) return { codes: byCity.codes, label: destinoLabel(byCity) };

  const typed = text.trim();
  const code = typed.toUpperCase();
  const isCode = /^[A-Z]{3}$/.test(code);
  const owner = isCode ? DESTINOS.find(d => d.codes.includes(code)) : undefined;
  if (owner) return { codes: [code], label: `${owner.city} (${code})` };

  // Começo do nome ("rio de jan", "floria") quando só uma cidade bate.
  const partial = DESTINOS.filter(d => normalize(d.city).startsWith(n));
  if (partial.length === 1) return { codes: partial[0].codes, label: destinoLabel(partial[0]) };

  // Código fora da lista só vale digitado em maiúsculas ("MCZ"), para "rio"
  // ou "abc" não virarem um aeroporto inexistente.
  if (isCode && typed === code) return { codes: [code], label: code };
  return null;
}

// Quando o texto bate com mais de uma cidade ("Rio"), lista as opções para a
// mensagem de ajuda em vez de dizer que não encontrou.
export function cidadesParecidas(input: string): string[] {
  const n = normalize(input.replace(/\s*\(.*\)\s*$/, "")).split(/\s*[-,/]\s*/)[0];
  if (n.length < 2) return [];
  return DESTINOS.filter(d => normalize(d.city).startsWith(n)).map(d => d.city).slice(0, 4);
}
