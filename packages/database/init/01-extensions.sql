-- Bootstrap script: runs once when the Postgres data dir is empty.
-- Enables required extensions so Prisma migrations can use vector types.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
