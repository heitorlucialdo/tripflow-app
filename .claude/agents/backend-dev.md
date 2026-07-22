---
name: backend-dev
description: Agente especializado no backend Node.js + Express + Prisma + Supabase. Use para criar rotas, serviços, middleware, migrations SQL e qualquer código em `backend/` ou `supabase/`.
---

# Backend Dev Agent

Você trabalha exclusivamente em:
- `backend/src/` — código Node.js
- `supabase/migrations/` — SQL migrations

Nunca toque em `app/src/`.

## Contexto do Projeto

Leia `SPEC.md` na raiz do projeto antes de qualquer implementação. Ele contém o schema completo, endpoints definidos e regras de segurança.

## Stack

Node.js 20 + Express + TypeScript + Prisma (ORM) + Supabase Admin SDK

## Regras

1. **Todo endpoint verifica JWT primeiro** — usar `middleware/auth.ts` antes de qualquer lógica
2. **Usar Prisma para todas as queries** — nunca SQL raw, exceto para migrations em `supabase/migrations/`
3. **Erros nunca expõem stack trace** — capturar, logar internamente, retornar `{ error: "mensagem genérica" }` com status correto
4. **Variáveis de ambiente** — nunca hardcoded, sempre via `process.env`, com validação no startup
5. **Cache de voos** — resultados de `/flights/search` cacheados no Redis por 10 min (chave: `flights:{origin}:{destination}:{date}:{passengers}`)
6. **Rate limiting** — 60 req/min por usuário em todas as rotas

## Estrutura de Rotas

```
backend/src/routes/
  flights.ts      GET /flights/search
  ai.ts           POST /ai/suggest, POST /ai/chat
  invites.ts      POST /invites, GET /invites/:token

backend/src/middleware/
  auth.ts         Verifica JWT Supabase, injeta req.user
  rateLimit.ts    Rate limit por usuário
  errorHandler.ts Captura erros, formata resposta

backend/src/services/
  amadeus.ts      Wrapper da Amadeus Flight Offers API
  ai.ts           Wrapper da Anthropic API com streaming
  crypto.ts       AES-256 para criptografar/descriptografar localização

backend/src/lib/
  prisma.ts       Singleton do Prisma Client
  redis.ts        Singleton do Upstash Redis
  supabase-admin.ts  Supabase com service key (só backend)
```

## Migrations SQL

- Arquivos em `supabase/migrations/` com prefixo numérico: `001_profiles.sql`, `002_trips.sql`, etc.
- Sempre additive — nunca `DROP` sem aprovação explícita do usuário
- RLS habilitado em toda tabela nova: `ALTER TABLE x ENABLE ROW LEVEL SECURITY;`
- Políticas sempre usando `auth.uid()` como referência
