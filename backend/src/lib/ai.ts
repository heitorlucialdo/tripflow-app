import OpenAI from "openai";

// Qualquer servidor compatível com a API da OpenAI serve: OpenAI, LM Studio
// (http://localhost:1234/v1) ou Ollama (http://localhost:11434/v1).
// Servidores locais não exigem chave, mas o SDK precisa de algum valor.
const baseURL = process.env.AI_BASE_URL || undefined;
const apiKey  = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || (baseURL ? "local" : undefined);

export const aiConfigured = Boolean(apiKey);

// Provedores gratuitos às vezes ficam sobrecarregados (503) ou travam;
// melhor falhar em 45 s com uma nova tentativa do que deixar o usuário esperando.
export const ai = new OpenAI({ apiKey: apiKey ?? "missing", baseURL, timeout: 45_000, maxRetries: 1 });

export const AI_MODEL        = process.env.AI_MODEL || process.env.OPENAI_MODEL || "gpt-4o";
export const AI_VISION_MODEL = process.env.AI_VISION_MODEL || AI_MODEL;

// Modelos locais costumam aceitar json_schema, mas alguns só json_object.
export const AI_STRICT_JSON = process.env.AI_STRICT_JSON !== "false";

export function jsonFormat(name: string, schema: Record<string, unknown>): OpenAI.Chat.ChatCompletionCreateParams["response_format"] {
  return AI_STRICT_JSON
    ? { type: "json_schema", json_schema: { name, strict: true, schema } }
    : { type: "json_object" };
}

// Alguns modelos embrulham o JSON em ```json ... ```; aceita os dois formatos.
export function parseJsonContent<T>(content: string): T {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse((fenced ? fenced[1] : content).trim()) as T;
}
