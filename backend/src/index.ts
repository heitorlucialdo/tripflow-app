import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { flightsRouter } from "./routes/flights.js";
import { aiRouter } from "./routes/ai.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requireAuth } from "./middleware/auth.js";

const app = express();
const PORT = process.env.PORT ?? 3001;

// Na Vercel o IP real vem no X-Forwarded-For; sem isso o rate limit veria
// todos os usuários como o mesmo IP do proxy.
app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
  credentials: true,
}));
// Fotos de nota fiscal chegam em base64; só esta rota aceita corpo grande (a Vercel limita a 4,5 MB),
// e só depois de autenticar, para ninguém mandar 6 MB sem token.
app.use("/ai/parse-expense", requireAuth, express.json({ limit: "4mb" }));
app.use(express.json({ limit: "100kb" }));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/flights", flightsRouter);
app.use("/ai", aiRouter);

app.use(errorHandler);

// Na Vercel o app roda como função serverless: ela importa o app exportado.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
  });
}

export default app;
