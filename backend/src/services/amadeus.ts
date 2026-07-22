interface AmadeusToken {
  access_token: string;
  expires_at: number;
}

let cached: AmadeusToken | null = null;

async function getToken(): Promise<string> {
  if (cached && Date.now() < cached.expires_at) return cached.access_token;

  const res = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.AMADEUS_CLIENT_ID!,
      client_secret: process.env.AMADEUS_CLIENT_SECRET!,
    }),
  });

  if (!res.ok) throw new Error("Falha ao autenticar com Amadeus.");

  const data = await res.json() as { access_token: string; expires_in: number };
  cached = {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cached.access_token;
}

export interface FlightOffer {
  id: string;
  price: { total: string; currency: string };
  itineraries: {
    duration: string;
    segments: {
      departure: { iataCode: string; at: string };
      arrival: { iataCode: string; at: string };
      carrierCode: string;
      number: string;
      numberOfStops: number;
    }[];
  }[];
  numberOfBookableSeats: number;
}

export async function searchFlights(params: {
  origin: string;
  destination: string;
  date: string;
  passengers: number;
}): Promise<FlightOffer[]> {
  const token = await getToken();

  const url = new URL("https://test.api.amadeus.com/v2/shopping/flight-offers");
  url.searchParams.set("originLocationCode", params.origin.toUpperCase());
  url.searchParams.set("destinationLocationCode", params.destination.toUpperCase());
  url.searchParams.set("departureDate", params.date);
  url.searchParams.set("adults", String(params.passengers));
  url.searchParams.set("max", "10");
  url.searchParams.set("currencyCode", "BRL");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json() as { errors?: { detail: string }[] };
    throw new Error(err.errors?.[0]?.detail ?? "Erro na busca de voos.");
  }

  const data = await res.json() as { data: FlightOffer[] };
  return data.data ?? [];
}
