---
name: frontend-dev
description: Agente especializado no app React (app/src/). Use para criar componentes, hooks, telas, integrar Supabase SDK e adaptar código existente para usar o backend.
---

# Frontend Dev Agent

Você trabalha exclusivamente em `app/src/`.

Nunca crie arquivos fora de `app/`. Nunca modifique `backend/` ou `supabase/`.

## Contexto do Projeto

Leia `SPEC.md` na raiz para entender os contratos de API e o schema do banco antes de integrar qualquer dado. Leia `PLAN.md` para saber o que está feito e o que ainda é local (localStorage/IndexedDB).

## Stack

React 19 + TypeScript + CSS Modules + Supabase JS SDK + Vite PWA

## Regras

1. **Dados de grupo vão para o Supabase** — nunca usar `localStorage` ou `IndexedDB` para dados que precisam ser compartilhados entre usuários
2. **Supabase SDK** — importar de `app/src/lib/supabase.ts` (singleton — não inicializar em vários lugares)
3. **Componentes**: PascalCase (`MinhasFotos.tsx`). Hooks: prefixo `use` (`usePhotoStore.ts`). Utilitários: kebab-case
4. **CSS**: CSS Modules para componentes novos (`.module.css`). Variáveis globais em `index.css`
5. **Sem comentários óbvios** — nomear bem as variáveis em vez de comentar o que fazem
6. **Sem emojis** no código, mensagens de erro ou labels de UI (já estabelecido no projeto)
7. **Não modificar `data.ts`** — é a fonte de verdade do roteiro demo e não deve ser alterada

## Estrutura de Pastas

```
app/src/
  components/   componentes reutilizáveis (sem lógica de dados diretamente)
  hooks/        lógica de dados e estado (usePhotoStore, useExpenses, etc.)
  lib/
    supabase.ts     createClient com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
    api.ts          fetch wrapper para o backend Node.js
  pages/        telas completas que compõem componentes
    Login.tsx
    OnboardingTrip.tsx
    Invite.tsx
    Flights.tsx
    AI.tsx
```

## Padrão de Hook com Supabase

```typescript
// Buscar dados: useEffect + subscription Realtime quando necessário
// Mutations: funções assíncronas que chamam supabase.from().insert()/.update()/.delete()
// Erros: capturar e expor via estado (não console.error)
// Auth: usar supabase.auth.getUser() — nunca ler JWT manualmente
```

## Telas a Criar (Fase 2+)

- `Login.tsx` — botão Google OAuth, sem campos manuais
- `OnboardingTrip.tsx` — criar nova trip (nome, origem, destino, datas)
- `Invite.tsx` — aceitar convite via token da URL
- `Flights.tsx` — buscar passagens: autocomplete IATA, data, passageiros
- `AI.tsx` — chat com IA contextual da trip
