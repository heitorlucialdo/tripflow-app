import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { searchFlights, flightsConfigured, FlightProviderError } from "../services/serpapi-flights.js";
import { redis } from "../lib/redis.js";

export const flightsRouter = Router();

// Um aeroporto ("CGB") ou até 3 da mesma cidade ("GRU,CGH,VCP"): a SerpApi busca em todos.
const iata = z.string().trim().toUpperCase().regex(/^[A-Z]{3}(,[A-Z]{3}){0,2}$/);
const day  = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const querySchema = z.object({
  origin:      iata,
  destination: iata,
  date:        day,
  return_date: day.optional(),
  passengers:  z.coerce.number().int().min(1).max(9).default(1),
}).refine(q => q.origin !== q.destination, { message: "Origem e destino iguais." })
  .refine(q => !q.return_date || q.return_date >= q.date, { message: "Volta antes da ida." });

flightsRouter.get("/status", requireAuth, (_req, res) => {
  res.json({ configured: flightsConfigured });
});

flightsRouter.get("/search", requireAuth, async (req, res, next) => {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Confira os aeroportos (3 letras) e as datas." });
      return;
    }

    const { origin, destination, date, return_date, passengers } = parsed.data;
    // Cada busca gasta cota do plano da SerpApi; o cache evita repetir a mesma.
    const cacheKey = `flights:v2:${origin}:${destination}:${date}:${return_date ?? "-"}:${passengers}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      res.json({ data: JSON.parse(cached), cached: true });
      return;
    }

    const result = await searchFlights({ origin, destination, date, returnDate: return_date, passengers });
    await redis.set(cacheKey, JSON.stringify(result), 1800);

    res.json({ data: result, cached: false });
  } catch (err) {
    if (err instanceof FlightProviderError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  }
});
