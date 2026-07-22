import { Router } from "express";
import { z } from "zod";
import OpenAI from "openai";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";

export const aiRouter = Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Personalidade do agente — configurável via .env
const AGENT_SYSTEM = process.env.AI_SYSTEM_MESSAGE ??
  `Você é um assistente de viagem inteligente chamado Viago.
Você ajuda grupos de amigos a planejar e gerenciar viagens: roteiros, gastos, divisão de contas e fotos.
Seja direto, amigável e use linguagem informal em português brasileiro.
Quando registrar um gasto, sempre confirme os valores e a divisão antes de salvar.
Nunca invente informações — se não souber algo, diga claramente.`;

// ─── Ferramentas disponíveis para a IA ───────────────────────────────────────

const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "registrar_gasto",
      description: "Registra um gasto da viagem e divide entre os participantes indicados.",
      parameters: {
        type: "object",
        properties: {
          descricao:    { type: "string", description: "O que foi gasto (ex: Jantar no restaurante)" },
          valor:        { type: "number", description: "Valor total em reais" },
          categoria:    { type: "string", enum: ["Alimentação", "Transporte", "Hospedagem", "Passeio", "Outros"] },
          pago_por:     { type: "string", description: "user_id de quem pagou" },
          participantes:{ type: "array", items: { type: "string" }, description: "Lista de user_ids que participam do gasto" },
          data:         { type: "string", description: "Data no formato YYYY-MM-DD" },
        },
        required: ["descricao", "valor", "categoria", "pago_por", "participantes", "data"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_gastos",
      description: "Retorna todos os gastos da viagem com o saldo de quem deve pagar pra quem.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "adicionar_item_roteiro",
      description: "Adiciona um item ao checklist de lugares/atividades da viagem.",
      parameters: {
        type: "object",
        properties: {
          lugar: { type: "string", description: "Nome do lugar ou atividade" },
        },
        required: ["lugar"],
      },
    },
  },
];

// ─── Execução das ferramentas ─────────────────────────────────────────────────

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  tripId: string,
  userId: string,
): Promise<string> {
  if (name === "registrar_gasto") {
    const expense = await prisma.expense.create({
      data: {
        tripId,
        description: args.descricao as string,
        amount:      args.valor as number,
        category:    args.categoria as string,
        paidBy:      args.pago_por as string,
        participants: args.participantes as string[],
        date:        new Date(args.data as string),
      },
    });
    return `Gasto registrado com sucesso. ID: ${expense.id}`;
  }

  if (name === "listar_gastos") {
    const expenses = await prisma.expense.findMany({
      where: { tripId },
      orderBy: { date: "desc" },
    });

    if (expenses.length === 0) return "Nenhum gasto registrado ainda.";

    const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const resumo = expenses.map(e =>
      `- ${e.description}: R$ ${Number(e.amount).toFixed(2)} (pago por ${e.paidBy}, dividido entre ${e.participants.length} pessoas)`,
    ).join("\n");

    return `Total gasto: R$ ${total.toFixed(2)}\n\n${resumo}`;
  }

  if (name === "adicionar_item_roteiro") {
    await prisma.checklistItem.create({
      data: {
        tripId,
        userId,
        placeName: args.lugar as string,
      },
    });
    return `"${args.lugar}" adicionado ao roteiro.`;
  }

  return "Ferramenta desconhecida.";
}

// ─── Rota de sugestão de roteiro (streaming, sem trip_id) ─────────────────────

const suggestSchema = z.object({
  destination: z.string().min(2),
  interests:   z.array(z.string()).min(1),
  budget:      z.number().positive(),
  days:        z.number().int().min(1).max(30).default(7),
});

aiRouter.post("/suggest", requireAuth, async (req, res, next) => {
  try {
    const parsed = suggestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Parâmetros inválidos.", details: parsed.error.flatten() });
      return;
    }

    const { destination, interests, budget, days } = parsed.data;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o",
      stream: true,
      messages: [
        { role: "system", content: AGENT_SYSTEM },
        {
          role: "user",
          content: `Crie um roteiro de viagem detalhado para ${destination} com ${days} dias.
Interesses: ${interests.join(", ")}.
Orçamento total: R$ ${budget}.

Organize por dia (Dia 1, Dia 2...) com sugestões de manhã, tarde e noite.
Inclua estimativa de custo por atividade. Use nomes reais de lugares.`,
        },
      ],
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    next(err);
  }
});

// ─── Rota de chat com function calling ────────────────────────────────────────

const chatSchema = z.object({
  trip_id:  z.string().uuid(),
  messages: z.array(z.object({
    role:    z.enum(["user", "assistant"]),
    content: z.string(),
  })).min(1),
});

aiRouter.post("/chat", requireAuth, async (req, res, next) => {
  try {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Parâmetros inválidos.", details: parsed.error.flatten() });
      return;
    }

    const { trip_id, messages } = parsed.data;
    const userId = (req as AuthRequest).userId;

    const member = await prisma.tripMember.findUnique({
      where: { tripId_userId: { tripId: trip_id, userId } },
      include: { trip: true },
    });

    if (!member) {
      res.status(403).json({ error: "Acesso negado a esta viagem." });
      return;
    }

    const trip = member.trip;

    const systemWithContext = `${AGENT_SYSTEM}

Contexto da viagem atual:
- Nome: ${trip.name}
- Origem: ${trip.origin}
- Destino: ${trip.destination}
- Período: ${trip.startDate.toLocaleDateString("pt-BR")} a ${trip.endDate.toLocaleDateString("pt-BR")}
- ID da viagem: ${trip_id}
- ID do usuário atual: ${userId}`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemWithContext },
      ...messages.map(m => ({ role: m.role, content: m.content }) as OpenAI.Chat.ChatCompletionMessageParam),
    ];

    // Loop para suportar múltiplas chamadas de tool em sequência
    while (true) {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL ?? "gpt-4o",
        stream: false,
        tools,
        tool_choice: "auto",
        messages: chatMessages,
      });

      const msg = response.choices[0].message;
      chatMessages.push(msg);

      // Se a IA quer chamar uma ferramenta
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        for (const call of msg.tool_calls) {
          if (call.type !== "function") continue;
          const args = JSON.parse(call.function.arguments) as Record<string, unknown>;
          const result = await executeTool(call.function.name, args, trip_id, userId);

          res.write(`data: ${JSON.stringify({ tool: call.function.name, result })}\n\n`);

          chatMessages.push({
            role: "tool",
            tool_call_id: call.id,
            content: result,
          });
        }
        continue; // volta pro loop para a IA processar o resultado da tool
      }

      // Resposta final — stream para o cliente
      const finalText = msg.content ?? "";
      res.write(`data: ${JSON.stringify({ text: finalText })}\n\n`);
      break;
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    next(err);
  }
});
