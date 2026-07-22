# SPEC — Especificação Técnica

## Visão Geral do Produto

Plataforma de viagens para grupos de amigos (ou solo traveler). Qualquer usuário cria uma **trip** com origem e destino livres, convida amigos via link, e o grupo colabora em tempo real: fotos compartilhadas, divisão de gastos, checklist de lugares, localização dos membros e busca de passagens.

A trip Cuiabá → Rio de Janeiro (Fev 2026, 4 amigos) é o caso de uso inicial que serve como demo do produto.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + TypeScript + Vite + PWA (Workbox) |
| Estilo | CSS Modules + variáveis CSS (dark/light) |
| Mapa | Leaflet |
| 3D | Three.js |
| Backend API | Node.js 20 + Express + TypeScript |
| ORM | Prisma (aponta para Postgres do Supabase) |
| Banco | Supabase Postgres |
| Auth | Supabase Auth (Google OAuth) |
| Storage | Supabase Storage |
| Realtime | Supabase Realtime |
| Passagens | Amadeus Flight Offers API |
| IA | Anthropic Claude API |
| Cache | Upstash Redis (para resultados de voos) |
| Deploy frontend | Vercel |
| Deploy backend | Railway ou Render |

---

## Estrutura de Pastas

```
viagemrRJ/
├── app/              # Frontend React (Vite PWA)
│   └── src/
│       ├── components/
│       ├── hooks/
│       ├── lib/      # supabase client, api client
│       ├── pages/    # Login, Onboarding, Trip, etc.
│       └── data.ts   # Fonte de verdade do roteiro demo (não modificar)
├── backend/          # API Node.js
│   └── src/
│       ├── routes/
│       ├── middleware/
│       ├── services/
│       └── lib/      # prisma client, supabase admin, redis
├── supabase/
│   └── migrations/   # SQL migrations numeradas
└── SPEC.md / PLAN.md / CLAUDE.md
```

---

## Schema do Banco (Postgres via Supabase)

### `profiles`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK, FK auth.users) | Mesmo ID do Supabase Auth |
| name | text | Nome do usuário |
| avatar_url | text | URL do avatar (Google) |
| email | text | Email verificado |
| created_at | timestamptz | |

### `trips`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | |
| name | text | Nome da trip (ex: "Rio 2026") |
| origin | text | Cidade/local de origem (livre) |
| destination | text | Cidade/local de destino (livre) |
| origin_iata | text | Código IATA do aeroporto de origem (opcional) |
| destination_iata | text | Código IATA do destino (opcional) |
| start_date | date | |
| end_date | date | |
| cover_image_url | text | Imagem de capa da trip |
| created_by | uuid (FK profiles) | Admin da trip |
| created_at | timestamptz | |

### `trip_members`
| Coluna | Tipo | Descrição |
|---|---|---|
| trip_id | uuid (FK trips) | |
| user_id | uuid (FK profiles) | |
| role | text | `admin` ou `member` |
| joined_at | timestamptz | |
| PK | (trip_id, user_id) | |

### `invites`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | |
| trip_id | uuid (FK trips) | |
| token | uuid (único) | Token do link de convite |
| created_by | uuid (FK profiles) | |
| expires_at | timestamptz | +48h após criação |
| used_at | timestamptz | null = ainda válido |

### `photos`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | |
| trip_id | uuid (FK trips) | |
| uploader_id | uuid (FK profiles) | |
| storage_path | text | Caminho no bucket `trip-photos` |
| caption | text | |
| taken_at | timestamptz | Data/hora da foto |
| created_at | timestamptz | |

### `photo_likes`
| Coluna | Tipo | Descrição |
|---|---|---|
| photo_id | uuid (FK photos) | |
| user_id | uuid (FK profiles) | |
| PK | (photo_id, user_id) | |

### `expenses`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | |
| trip_id | uuid (FK trips) | |
| description | text | |
| amount | numeric(10,2) | |
| category | text | Comida/Atração/Transporte/etc |
| paid_by | uuid (FK profiles) | |
| participants | uuid[] | Quem divide o gasto |
| date | date | |
| created_at | timestamptz | |

### `checklist_items`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | |
| trip_id | uuid (FK trips) | |
| user_id | uuid (FK profiles) | Quem marcou |
| place_name | text | |
| checked_at | timestamptz | null = não marcado |

### `locations`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | |
| trip_id | uuid (FK trips) | |
| user_id | uuid (FK profiles) | |
| lat_enc | text | Latitude criptografada (AES-256) |
| lng_enc | text | Longitude criptografada (AES-256) |
| updated_at | timestamptz | TTL: trigger apaga após 5 min sem atualização |

---

## Segurança

### Row Level Security (RLS)
Todas as tabelas têm RLS habilitado. Política padrão:
- **Leitura**: `auth.uid() IN (SELECT user_id FROM trip_members WHERE trip_id = <tabela>.trip_id)`
- **Escrita**: mesma condição + verificar `role` quando necessário (ex: deletar foto só o uploader ou admin)

### Localização
- Lat/lng criptografados com AES-256 antes de salvar
- Chave derivada do `trip_id` + segredo do servidor (nunca enviado ao cliente)
- Opt-in explícito do usuário (toggle na UI)
- Dados removidos automaticamente por trigger Postgres após 5 min sem atualização

### Storage (fotos)
- Bucket `trip-photos` privado (sem acesso público)
- Acesso via signed URLs com expiração de 1 hora
- Path: `trip-photos/{trip_id}/{photo_id}.jpg`

### API Backend
- Todo endpoint verifica JWT do Supabase (`Authorization: Bearer <token>`)
- Erros nunca expõem stack trace em produção
- Rate limiting: 60 req/min por usuário

---

## Endpoints Backend (Node.js)

### `GET /flights/search`
```
Query params:
  origin      string  Código IATA (ex: CGB, GRU)
  destination string  Código IATA (ex: GIG, SDU)
  date        string  ISO 8601 (ex: 2026-02-16)
  passengers  number  1-9

Response: lista de ofertas de voo com preço, escalas, duração
Cache: Upstash Redis, TTL 10 min por chave origin+destination+date+passengers
```

### `POST /ai/suggest`
```
Body:
  trip_id     string  Para buscar contexto do roteiro
  destination string
  interests   string[]
  budget      number

Response: streaming JSON com roteiro sugerido por dia
```

### `POST /ai/chat`
```
Body:
  trip_id   string
  messages  {role, content}[]

Response: streaming — Claude responde com contexto do roteiro da trip
```

---

## Auth Flow

1. Usuário abre o app → sem sessão → tela de login
2. Clica "Entrar com Google" → Supabase OAuth → Google → callback → sessão criada
3. Se é novo usuário → row criada em `profiles` automaticamente via trigger
4. Se tem link de convite (`/invite/{token}`) → valida token → adiciona em `trip_members` → redireciona para a trip

---

## Realtime

| Canal | Evento | Dados |
|---|---|---|
| `photos:{trip_id}` | INSERT em `photos` | Nova foto disponível para o grupo |
| `locations:{trip_id}` | UPDATE em `locations` | Posição atualizada de um membro |
