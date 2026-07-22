# CLAUDE.md — Regras de Trabalho

## Stack

React 19 + Vite PWA (`app/`) | Node.js 20 + Express + Prisma (`backend/`) | Supabase Postgres + Auth + Storage + Realtime

Arquitetura completa → [SPEC.md](./SPEC.md)
Roadmap e o que falta → [PLAN.md](./PLAN.md)

---

## Estrutura de Pastas

```
app/src/
  components/   componentes React (PascalCase)
  hooks/        hooks customizados (prefixo `use`)
  lib/          clientes: supabase.ts, api.ts
  pages/        telas completas (Login, Trip, etc.)
  data.ts       roteiro demo — NÃO MODIFICAR

backend/src/
  routes/       handlers Express por recurso
  middleware/   auth JWT, rate limit, error handler
  services/     lógica de negócio (flights, ai, crypto)
  lib/          prisma.ts, redis.ts, supabase-admin.ts

supabase/migrations/   SQL migrations numeradas (001_, 002_, ...)
```

---

## Convenções de Código

- Sem comentários óbvios — só comentar o "porquê" quando não é evidente
- Sem emojis em código, mensagens de erro ou logs
- Sem abstrações prematuras — três cópias similares antes de extrair
- Sem `any` em TypeScript — sempre tipar explicitamente
- Componentes React: PascalCase. Hooks: camelCase com `use`. Arquivos: kebab-case para utilitários
- CSS: CSS Modules para componentes novos (padrão já estabelecido no projeto)
- Sem `console.log` em produção — usar o logger do backend

---

## Regras de Segurança

- Nunca expor `SUPABASE_SERVICE_KEY` ou chaves Amadeus/Anthropic no frontend
- Todo endpoint do backend verifica o JWT Supabase antes de processar
- Nunca usar `localStorage` para dados de grupo — esses dados vão para o Supabase
- Localização sempre criptografada antes de sair do cliente (AES-256)
- Erros de API nunca expõem stack trace — logar internamente, retornar mensagem genérica
- RLS habilitado em todas as tabelas — checar `SPEC.md` para as políticas

---

## O que NÃO Fazer

- **Não modificar `app/src/data.ts`** — é a fonte de verdade do roteiro demo. Mudanças de conteúdo do roteiro são feitas via banco quando o backend estiver pronto
- **Não criar arquivos `.md`** sem que o usuário peça explicitamente
- **Não instalar dependências** sem confirmar com o usuário
- **Não tocar em `app/public/imgs/`** — imagens estáticas do roteiro demo, não são geradas por código
- **Não usar `localStorage`** para dados que precisam ser compartilhados entre usuários
- **Não fazer `git push`** sem o usuário pedir explicitamente

---

## Variáveis de Ambiente

Frontend (`app/.env.local`):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_BACKEND_URL=
```

Backend (`backend/.env`):
```
DATABASE_URL=          # Supabase Postgres connection string
SUPABASE_URL=
SUPABASE_SERVICE_KEY=  # Nunca expor no frontend
AMADEUS_CLIENT_ID=
AMADEUS_CLIENT_SECRET=
ANTHROPIC_API_KEY=
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=
LOCATION_ENCRYPTION_SECRET=
```
