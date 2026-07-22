import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { searchFlights } from "../services/amadeus.js";
import { redis } from "../lib/redis.js";

export const flightsRouter = Router();

const querySchema = z.object({
  origin:      z.string().length(3),
  destination: z.string().length(3),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  passengers:  z.coerce.number().int().min(1).max(9).default(1),
});

flightsRouter.get("/search", requireAuth, async (req, res, next) => {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Parâmetros inválidos.", details: parsed.error.flatten() });
      return;
    }

    const { origin, destination, date, passengers } = parsed.data;
    const cacheKey = `flights:${origin}:${destination}:${date}:${passengers}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      res.json({ data: JSON.parse(cached), cached: true });
      return;
    }

    const offers = await searchFlights({ origin, destination, date, passengers });

    await redis.set(cacheKey, JSON.stringify(offers), 600); // 10 min

    res.json({ data: offers, cached: false });
  } catch (err) {
    next(err);
  }
});
