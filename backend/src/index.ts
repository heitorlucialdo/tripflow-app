import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { flightsRouter } from "./routes/flights.js";
import { aiRouter } from "./routes/ai.js";
import { errorHandler } from "./middleware/error-handler.js";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
