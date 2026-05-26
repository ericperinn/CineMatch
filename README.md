# CineMatch

Tinder-style movie matcher for couples and groups. Two connected users swipe on AI-filtered films until they accumulate three mutual likes — the "podium". Resolves the "what should we watch tonight?" deadlock using semantic similarity over Letterboxd taste profiles, not rigid genre tags.

> **Heads up to AI agents:** read [CLAUDE.md](CLAUDE.md) first. Project conventions and the docs index live there.

## Stack

- **NestJS** + TypeScript — API, WebSocket gateway, BullMQ workers
- **FastAPI** + Sentence-BERT — embeddings microservice (Python)
- **PostgreSQL** + **pgvector** — relational data + 384-dim vectors in one DB
- **Redis** + **BullMQ** — background jobs, cache, eventual pub-sub
- **Prisma** — ORM and migrations
- **Front-end**: undecided (React / Next.js / React Native)

Full rationale in [docs/02-architecture.md](docs/02-architecture.md).

## Repository layout

```
.
├── apps/
│   ├── api/              # NestJS REST + WebSocket gateway        (Phase 2)
│   ├── worker/           # NestJS standalone — BullMQ consumers    (Phase 2)
│   └── ml/               # FastAPI — SBERT embeddings              (Phase 2)
├── packages/
│   └── database/         # Prisma schema, migrations, client       (Phase 2)
├── docs/                 # All product + technical docs (pt-BR)
│   └── diagrams/         # Mermaid source for diagrams
├── .claude/
│   └── skills/           # Project-scoped Claude Code skills
├── docker-compose.yml
├── .env.example
└── CLAUDE.md             # Agent onboarding
```

## Quick start

This is **Phase 1** — only infrastructure is configured. Application services are scaffolded in subsequent phases.

```bash
# 1. Clone and enter the repo
git clone <url> cinematch && cd cinematch

# 2. Set up environment variables
cp .env.example .env

# 3. Bring up Postgres (with pgvector) and Redis
docker compose up -d postgres redis

# 4. Confirm both are healthy
docker compose ps
```

You should see `cinematch-postgres` and `cinematch-redis` running and healthy.

To tear down:

```bash
docker compose down       # stop containers, keep data
docker compose down -v    # stop + wipe volumes
```

> Local Node tooling uses **plain npm** (npm workspaces). pnpm and yarn are not used in this project.

## Documentation

The complete documentation set (in pt-BR — the project owner is the primary reader) lives in [docs/](docs/). Start with [docs/README.md](docs/README.md).

| If you need... | Read |
|---|---|
| Product context | [docs/01-overview.md](docs/01-overview.md) |
| Architecture decisions | [docs/02-architecture.md](docs/02-architecture.md) |
| Data model | [docs/03-data-model.md](docs/03-data-model.md) |
| API contracts | [docs/04-api-contracts.md](docs/04-api-contracts.md) |
| Match algorithm | [docs/05-match-algorithm.md](docs/05-match-algorithm.md) |
| Letterboxd integration | [docs/06-letterboxd.md](docs/06-letterboxd.md) |
| Gamification rules | [docs/07-gamification.md](docs/07-gamification.md) |
| Roadmap | [docs/08-roadmap.md](docs/08-roadmap.md) |

## Project conventions

- **Code, comments, identifiers, commit messages, and branch names: English.**
- **Documentation: Portuguese (pt-BR).**
- **Commits follow [Conventional Commits](https://www.conventionalcommits.org/).** See the [commit-cinematch skill](.claude/skills/commit-cinematch/SKILL.md) for the exact format used here.
- All tunable gameplay constants live in a single config module — see [docs/07-gamification.md](docs/07-gamification.md).

## Status

Phase 1 of the roadmap is complete. Next: Phase 2 — Prisma schema and empty NestJS / FastAPI scaffolds. See [docs/08-roadmap.md](docs/08-roadmap.md).
