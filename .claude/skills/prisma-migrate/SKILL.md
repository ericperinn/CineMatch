---
name: prisma-migrate
description: Use this skill when the user wants to create, apply, or manage Prisma migrations in the CineMatch repo. Triggers on phrases like "cria uma migration", "aplica as migrations", "rodar migrations", "prisma migrate", "atualiza o schema", "faz o migrate". Also runs automatically before seeding if migrations haven't been applied. Enforces safe migration practices — never uses --accept-data-loss, alerts on destructive operations.
---

# Prisma Migrate — CineMatch

Migrations in CineMatch live in `packages/database/prisma/migrations/`. The schema source of truth is `packages/database/prisma/schema.prisma`.

## The two workflows

### 1. Development: creating a new migration

When the schema changes and you need a migration file:

```bash
# Run from monorepo root via docker compose (preferred in dev):
docker compose exec api npx prisma migrate dev --name <migration-name> --schema /app/packages/database/prisma/schema.prisma

# Or locally (requires DATABASE_URL set in .env):
cd packages/database && npx prisma migrate dev --name <migration-name>
```

**Migration naming rules:**
- Lowercase, words separated by underscores.
- Describe what changed, not the ticket number.
- Examples: `add_user_table`, `add_embedding_column_to_movies`, `add_dislike_cooldown_index`
- Never: `migration1`, `update`, `fix`, `new`

### 2. Production / CI: applying existing migrations

```bash
docker compose exec api npx prisma migrate deploy --schema /app/packages/database/prisma/schema.prisma
```

`migrate deploy` applies all pending migrations without generating new ones. Safe for CI and production.

## Before running any migration: safety checklist

Work through these in order:

1. **Check current state.**
   ```bash
   docker compose exec api npx prisma migrate status --schema /app/packages/database/prisma/schema.prisma
   ```
   Understand which migrations are pending before applying.

2. **Diff the schema.**
   If you're about to `migrate dev`, run `prisma migrate diff` first:
   ```bash
   cd packages/database && npx prisma migrate diff \
     --from-migrations prisma/migrations \
     --to-schema-datamodel prisma/schema.prisma \
     --shadow-database-url "$DATABASE_URL"
   ```
   Read the diff. Identify any destructive operations.

3. **Block on destructive operations.** Stop and ask the user before proceeding if the diff contains:
   - `DROP TABLE`
   - `DROP COLUMN`
   - `ALTER COLUMN` that changes type (may truncate data)
   - Removal of a unique constraint that has data depending on it
   Never pass `--accept-data-loss` without explicit user instruction.

4. **Check for the pgvector extension.** The `vector` extension must be created before any table with `vector(384)` columns. Verify it exists:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'vector';
   ```
   If missing, the `packages/database/init/01-extensions.sql` bootstrap script should have created it on first boot. If not, run it manually.

5. **Run and verify.**
   After applying, check:
   ```bash
   docker compose exec api npx prisma migrate status --schema /app/packages/database/prisma/schema.prisma
   ```
   All migrations should show ✔. If any show ⚠, investigate before proceeding.

## pgvector index (manual — Prisma can't manage these yet)

After the initial migration creates the `movies` table, run the HNSW index manually:

```sql
-- Connect to the DB
docker compose exec postgres psql -U cinematch -d cinematch

-- Create HNSW index for cosine similarity (run once, after movies table exists)
CREATE INDEX CONCURRENTLY movie_embedding_hnsw_idx
  ON movies
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

`CONCURRENTLY` builds the index without locking the table. Omit it if the table is empty.

## Seeding after migration

After a fresh `migrate dev` or `migrate deploy`:

```bash
docker compose exec api node /app/packages/database/prisma/seed.js
```

Or via npm workspace:

```bash
npm run --workspace=@cinematch/database prisma:seed
```

## Regenerating the Prisma client

After any schema change, regenerate the client (so the TypeScript types stay in sync):

```bash
npm run --workspace=@cinematch/database prisma:generate
```

In Docker, the Dockerfiles run this automatically at build time. In local dev, run it when you change the schema.

## Common errors and fixes

| Error | Cause | Fix |
|---|---|---|
| `P3006: Migration failed to apply cleanly` | SQL in the migration is invalid | Fix the schema and run `prisma migrate dev --create-only` to edit the SQL before applying |
| `P3009: Found failed migrations` | A migration was applied but failed mid-way | Run `prisma migrate resolve --applied <name>` after manually fixing the state |
| `P1001: Can't reach database server` | DATABASE_URL wrong or postgres not running | `docker compose up -d postgres` and verify `docker compose ps` |
| `column embedding is of type vector(384) but expression is of type text` | pgvector extension not loaded | Run `CREATE EXTENSION IF NOT EXISTS vector;` as postgres superuser |
| `error: relation "movies" does not exist` | Migrations not applied | `prisma migrate deploy` |
