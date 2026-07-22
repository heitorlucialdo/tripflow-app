# PLAN — Roadmap do Produto

Para detalhes técnicos de cada item, consulte [SPEC.md](./SPEC.md).

---

## Concluído — Frontend local (sem backend)

- [x] Globe 3D com adaptação dark/light mode
- [x] Roteiro por dia (hardcoded em `data.ts` — trip demo Rio/2026)
- [x] Checklist de lugares (persiste em localStorage)
- [x] Divisão de gastos entre amigos (persiste em localStorage)
- [x] Fotos durante a viagem (persiste em IndexedDB local)
- [x] Modo ao Vivo — geolocalização com roteiro do dia
- [x] Mapa interativo (Leaflet) com todos os pins do roteiro
- [x] Galeria de memórias estáticas
- [x] PWA instalável (manifest + Workbox)
- [x] Dark/light mode persistido
- [x] Bottom nav responsivo

---

## Fase 1 — Infraestrutura do Projeto

- [x] SPEC.md — especificação técnica
- [x] PLAN.md — este arquivo
- [x] CLAUDE.md — regras para o Claude
- [x] .gitignore (raiz)
- [x] .claudeignore
- [x] .claude/agents/ (backend-dev, frontend-dev, db-architect)
- [ ] Schema SQL completo em `supabase/migrations/`
- [ ] `package.json` do backend com dependências iniciais

---

## Fase 2 — Auth + Grupos + Convites

- [ ] Configurar Google OAuth no Supabase dashboard
- [ ] Criar tabelas: `profiles`, `trips`, `trip_members`, `invites`
- [ ] Trigger automático: criar `profiles` row no signup
- [ ] Tela de login (Google OAuth)
- [ ] Tela de criação de trip (nome, origem, destino, datas)
- [ ] Sistema de convites: gerar link com token único
- [ ] Tela de aceitação de convite (`/invite/{token}`)
- [ ] Supabase SDK instalado no frontend (`@supabase/supabase-js`)

---

## Fase 3 — Dados Compartilhados em Tempo Real

- [ ] Fotos: migrar de IndexedDB → Supabase Storage + tabela `photos`
- [ ] Fotos: Realtime subscription para o grupo ver uploads em tempo real
- [ ] Gastos: migrar de localStorage → tabela `expenses`
- [ ] Checklist: migrar de localStorage → tabela `checklist_items`
- [ ] Todos os dados filtrados por `trip_id` (isolados por grupo)

---

## Fase 4 — Localização em Tempo Real

- [ ] Criptografia AES-256 da lat/lng no cliente antes de enviar
- [ ] Publicar localização na tabela `locations` a cada 30s (opt-in)
- [ ] Supabase Realtime: receber posição dos amigos
- [ ] UI: mostrar membros do grupo no mapa (Leaflet) em tempo real
- [ ] Trigger Postgres: remover localização após 5 min sem update

---

## Fase 5 — Backend Node.js + Busca de Passagens

- [ ] Setup: Express + TypeScript + Prisma + JWT middleware
- [ ] Prisma schema apontando para Supabase Postgres
- [ ] Upstash Redis para cache
- [ ] `GET /flights/search` — integração Amadeus API
  - Campos: origem (IATA), destino (IATA), data, nº de passageiros
  - Autocomplete de aeroportos no frontend
  - Resultados: preço, escalas, duração, companhia
- [ ] Tela de busca de passagens no frontend

---

## Fase 6 — Inteligência Artificial

- [ ] `POST /ai/suggest` — roteiro sugerido com base em destino/interesses/orçamento
- [ ] `POST /ai/chat` — chat contextual com dados reais da trip
- [ ] Tela de IA no frontend (chat + sugestões)
- [ ] Ação: aceitar sugestão da IA → adiciona ao checklist da trip

---

## Backlog (futuro)

- [ ] Notificações push (Firebase FCM) — nova foto, nova localização
- [ ] Alertas de preço de passagens (cron job diário)
- [ ] Exportar álbum de fotos como ZIP
- [ ] Múltiplas trips por usuário (lista de trips na home)
- [ ] Modo offline robusto (sync quando voltar online)

---

## Pendências de Decisão

- [ ] **Nome do app** — "Viagem dos Amigos" é provisório/demo. Definir nome definitivo do produto antes de qualquer deploy público ou configuração de domínio
- [ ] **Globo 3D interativo com destino** — quando o usuário criar uma trip e informar o destino, marcar o pin correspondente no globo 3D da home. Requer: geocodificação do nome da cidade para lat/lng (ex: Nominatim/Google Geocoding), e adaptar o `GlobeHero` para receber pins dinâmicos além dos hardcoded (Cuiabá/Rio). Pensar no design visual do pin de destino
