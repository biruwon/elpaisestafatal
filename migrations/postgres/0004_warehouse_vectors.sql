-- Optional semantic index for the derived PostgreSQL warehouse. The index is
-- rebuildable and is never the authoritative copy of evidence.

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE observations ADD COLUMN IF NOT EXISTS search_embedding vector(1024);
ALTER TABLE observations ADD COLUMN IF NOT EXISTS embedding_model TEXT;

CREATE INDEX IF NOT EXISTS idx_observations_search_embedding_hnsw
  ON observations USING hnsw (search_embedding vector_cosine_ops);
