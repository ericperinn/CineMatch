-- HNSW index for fast approximate kNN over the SBERT embeddings.
-- Uses cosine similarity, which matches both how SBERT vectors are normalised
-- (we set normalize_embeddings=True in the ML service) and the operator the
-- match algorithm queries with ('embedding <=> :midpoint').
--
-- m and ef_construction tuning: defaults are conservative for a catalogue
-- of <100k movies. Revisit when we scale past that.
--
-- CONCURRENTLY is omitted because Prisma migrations run inside a transaction
-- and `CREATE INDEX CONCURRENTLY` cannot. The catalogue is small enough that
-- the brief lock during the build is acceptable. If we ever need to add
-- this on a large existing dataset, run it manually outside Prisma migrate.

CREATE INDEX IF NOT EXISTS movies_embedding_hnsw_idx
  ON movies
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
