const BASE_URL  = process.env.UPSTASH_REDIS_URL;
const TOKEN     = process.env.UPSTASH_REDIS_TOKEN;
const available = !!(BASE_URL && TOKEN);

async function redisCmd(cmd: unknown[]): Promise<unknown> {
  if (!available) return null;
  const res = await fetch(`${BASE_URL}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  const json = await res.json() as { result: unknown };
  return json.result;
}

export const redis = {
  available,
  async get(key: string): Promise<string | null> {
    return (await redisCmd(["GET", key])) as string | null;
  },
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await redisCmd(["SET", key, value, "EX", ttlSeconds]);
  },
};
