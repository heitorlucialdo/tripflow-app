import type { Request, Response, NextFunction } from "express";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error("[error]", err.message);
  // Em respostas SSE os headers já foram enviados: avisa pelo próprio stream.
  if (res.headersSent) {
    res.write(`data: ${JSON.stringify({ error: "Erro interno. Tente novamente." })}\n\n`);
    res.end();
    return;
  }
  res.status(500).json({ error: "Erro interno. Tente novamente." });
}
