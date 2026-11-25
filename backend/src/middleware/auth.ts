import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabase-admin.js";

export interface AuthRequest extends Request {
  userId: string;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Rotas com corpo grande autenticam antes do parser; não valida duas vezes.
  if ((req as AuthRequest).userId) { next(); return; }

  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token ausente." });
    return;
  }

  const token = header.slice(7);
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ error: "Token inválido ou expirado." });
    return;
  }

  (req as AuthRequest).userId = data.user.id;
  next();
}
