# 08. Roadmap

> **TL;DR** — MVP v1 cobre auth + match Descoberta + Limpa-Fila + JustWatch + premium gating. v2 traz Híbrido, grupos com 3+ usuários, refresh tokens, notificações e métricas. v3+ é território de oportunidade (recomendações fora de sessão, social, integração com mais plataformas).

## Fase 1 — Fundação *(em andamento)*
Estrutura de pastas, docs, Docker, regras pra agentes. **Nenhum código de aplicação ainda.**

- [x] CLAUDE.md com convenções
- [x] Skill `commit-cinematch`
- [x] Documentação completa em pt-BR
- [x] Diagramas Mermaid
- [ ] `docker-compose.yml` com Postgres+pgvector e Redis
- [ ] `.env.example`, `.gitignore`, `.editorconfig`
- [ ] `package.json` raiz + npm workspaces
- [ ] `README.md` raiz
- [ ] `git init`

## Fase 2 — Schema + scaffolds vazios
- [ ] `packages/database` com Prisma schema completo
- [ ] Migração inicial: tabelas + extensão pgvector + índice HNSW
- [ ] Scaffold NestJS em `apps/api` (CLI: `nest new`) — só `main.ts`, módulo raiz, health check
- [ ] Scaffold NestJS standalone em `apps/worker` — bootstrap mínimo
- [ ] Scaffold FastAPI em `apps/ml` — endpoint `/health` + `/embed` mockado
- [ ] Compose com os 3 serviços de aplicação dockerizados
- [ ] `docker compose up` sobe tudo, health checks passam

## Fase 3 — Auth, Users, Friends
- [ ] Módulo Auth (NestJS Passport + JWT)
- [ ] Endpoints `/auth/register`, `/auth/login`, `/auth/me`
- [ ] Módulo Users + `/me PATCH`
- [ ] Módulo Friends + endpoints de request/accept/list
- [ ] Testes E2E básicos com Supertest
- [ ] Rate limiting via `@nestjs/throttler`

## Fase 4 — Worker Letterboxd
- [ ] Estrutura `apps/worker/src/letterboxd/`
- [ ] Fetchers: `DiaryFetcher` (RSS), `ProfileFetcher` (Cheerio favs), `WatchlistFetcher` (Cheerio paginado)
- [ ] Resolver Letterboxd slug → TMDB ID
- [ ] Processor `sync-profile` na fila BullMQ
- [ ] Endpoint REST `/profile/letterboxd/sync` (dispara JIT)
- [ ] Endpoint REST `/profile/letterboxd/status`
- [ ] Snapshot tests pros parsers

## Fase 5 — ML service + worker de embeddings
- [ ] FastAPI real com SBERT (`sentence-transformers/all-MiniLM-L6-v2`)
- [ ] `POST /embed` em batch
- [ ] Worker `embed-movie`: TMDB sinopse → ML service → upsert no pgvector
- [ ] Seed do catálogo: top 200 TMDB com embeddings pré-calculados
- [ ] Index HNSW criado e validado por benchmark

## Fase 6 — WebSocket Gateway + match
- [ ] Gateway `/match` namespace
- [ ] Eventos: create, join, leave, swipe, batch, match, completed
- [ ] Compute taste vector on-the-fly
- [ ] kNN query no pgvector
- [ ] Lógica de pódio (3 matches)
- [ ] Cooldown de dislike
- [ ] Modo Descoberta funcional
- [ ] Modo Limpa-Fila funcional
- [ ] Idle timeout + disconnect grace

## Fase 7 — JustWatch + Premium gating
- [ ] Integração JustWatch (cliente HTTP)
- [ ] Enriquecimento do pódio com providers
- [ ] Constantes `gameplay.config.ts` cobrindo todas tunables
- [ ] Free tier limit aplicado em `session:create`
- [ ] Histórico truncado pra free tier

## Fase 8 — Polimento pré-launch
- [ ] OpenAPI publicado em `/api/docs`
- [ ] Logs estruturados (pino) + correlation IDs
- [ ] Métricas básicas (Prometheus-compatible endpoint)
- [ ] CI básico (lint + build + test)
- [ ] Decisão sobre front-end (React / Next / RN) + scaffold inicial
- [ ] Deploy target definido (Fly.io / Render / VPS)

---

## v2 — Pós-MVP

| Tema | Itens |
|---|---|
| **Sessões com >2 usuários** | Grupo de 3-5 amigos. Algoritmo: centroid em vez de midpoint. Pódio escala (ou vira "top N" sem limite duro). |
| **Modo Híbrido** | Combina descoberta + watchlist com peso configurável. |
| **Auth social** | Google OAuth, eventualmente Apple. |
| **Refresh tokens** | Sessões longas sem re-login. |
| **Notificações push** | "Seu amigo iniciou uma sessão", "Match disponível". |
| **Filtro de provider pré-swipe** | Premium gating: "só Netflix + Max" antes de começar. |
| **Métricas + dashboards** | Tempo até pódio, taxa de conclusão, retenção. |
| **A/B test framework** | Pra calibrar pesos do vetor de gosto. |

## v3+ — Oportunidade

- **Recomendação fora de sessão**: "filme da semana pro casal".
- **Calendário compartilhado**: marcar quando vai assistir o pódio.
- **Reviews compartilhadas pós-sessão**: nota conjunta vai pro perfil.
- **Importação de outras plataformas**: Trakt, IMDB (export), Reelgood.
- **Suporte multi-idioma da UI** (já que docs são pt-BR e código en, a UI pode começar i18n desde cedo).
