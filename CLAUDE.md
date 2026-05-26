# CineMatch — Agent Onboarding

This file is the entry point for any AI agent working on this repo. Read it first, then jump to the document you need.

## What this project is

CineMatch is a "Tinder for movies" web app for couples and groups. Two connected users swipe on AI-filtered films until they accumulate 3 mutual likes (the "podium"). It resolves the "what should we watch tonight?" deadlock using semantic similarity rather than rigid genre tags.

The product spec is documented in [docs/01-overview.md](docs/01-overview.md). All other docs are listed in [docs/README.md](docs/README.md).

## Stack at a glance

| Layer | Choice | Why |
|---|---|---|
| Main API + WebSocket Gateway | NestJS + TypeScript | Native WS gateway, first-class BullMQ, modular DI |
| Background workers | NestJS standalone app | Same Prisma client, shared codebase |
| ML / embeddings | FastAPI + Sentence-BERT | Isolated Python service called via HTTP |
| Relational DB | PostgreSQL + pgvector | One DB for both rows and vectors; cosine via `<=>` |
| Queues | BullMQ on Redis | Native to Node, dashboard included, no extra broker |
| ORM | Prisma | TypeScript-first, great migrations |
| Front-end | Undecided (React / Next.js / React Native) | To be decided with the user |

Full rationale in [docs/02-architecture.md](docs/02-architecture.md).

## Repo layout

```
.
├── apps/
│   ├── api/           # NestJS — REST + WebSocket gateway
│   ├── worker/        # NestJS standalone — BullMQ consumers
│   └── ml/            # FastAPI — SBERT embeddings microservice
├── packages/
│   └── database/      # Prisma schema, migrations, generated client
├── docs/              # All product + technical documentation (pt-BR)
│   └── diagrams/      # Mermaid sources for diagrams
├── .claude/
│   └── skills/        # Project-scoped Claude skills
├── docker-compose.yml # Postgres+pgvector, Redis, app services
└── CLAUDE.md          # You are here
```

## Project rules (must follow)

1. **Language — code, comments, identifiers, commit messages, branch names, and PR titles must all be in English.** Documentation under `docs/` stays in **Portuguese (pt-BR)** because the project owner is the primary reader.
2. **Commits follow [Conventional Commits](https://www.conventionalcommits.org/)**. Type and optional scope, imperative subject, no period at the end. Examples:
   - `feat(api): add match session lobby endpoint`
   - `fix(worker): handle empty Letterboxd diary RSS`
   - `chore(docs): expand letterboxd integration notes`
   - `refactor(database): extract Swipe relations into separate module`
   Allowed types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`, `perf`, `build`, `ci`.
3. **Comments are exceptional, not default.** Only add a comment when the *why* is non-obvious (a workaround, an invariant a future reader would break). Never narrate what the code does.
4. **Tunable gameplay constants live in config, never inline.** See [docs/07-gamification.md](docs/07-gamification.md). Examples: `FREE_TIER_MATCH_LIMIT`, `PODIUM_SIZE`, `DISLIKE_COOLDOWN_DAYS`, `RECENCY_BIAS_WINDOW`. Magic numbers in business logic are a code-review blocker.
5. **Letterboxd integration is fragile by design.** All HTML parsing must be centralized in a single module under `apps/worker/src/letterboxd/`. See [docs/06-letterboxd.md](docs/06-letterboxd.md).
6. **Do not commit secrets.** `.env` is gitignored; `.env.example` is the source of truth for required variables.

## Skills

Project-scoped skills live in `.claude/skills/`. They are invoked by agents to perform repeatable, opinionated workflows. Current skills:

- [commit-cinematch](.claude/skills/commit-cinematch/SKILL.md) — guides agents through writing a Conventional Commit message that matches this project's rules before invoking `git commit`.
- [prisma-migrate](.claude/skills/prisma-migrate/SKILL.md) — safe Prisma migration workflow: diff, detect destructive ops, apply, verify, manage pgvector index.

When you notice a workflow being repeated more than twice, propose a new skill.

## Where to find things

| If you need... | Read |
|---|---|
| Product context, modes, user stories | [docs/01-overview.md](docs/01-overview.md) |
| Architecture decisions, components, data flow | [docs/02-architecture.md](docs/02-architecture.md) |
| Schema, entities, relationships | [docs/03-data-model.md](docs/03-data-model.md) |
| REST endpoints + WebSocket events | [docs/04-api-contracts.md](docs/04-api-contracts.md) |
| SBERT, vector math, match algorithm | [docs/05-match-algorithm.md](docs/05-match-algorithm.md) |
| Letterboxd RSS + scraping strategy | [docs/06-letterboxd.md](docs/06-letterboxd.md) |
| Podium, cooldown, premium gating | [docs/07-gamification.md](docs/07-gamification.md) |
| What's in v1 vs v2 | [docs/08-roadmap.md](docs/08-roadmap.md) |

## Running locally

The full stack runs via Docker Compose. See [docs/02-architecture.md](docs/02-architecture.md#running-locally) for the up-to-date command list.

```bash
cp .env.example .env
docker compose up -d postgres redis    # infra only, for now
```

Application services (`api`, `worker`, `ml`) will be added to compose as each is scaffolded in subsequent phases.
