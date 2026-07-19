-- Search columns for the derived PostgreSQL warehouse. This migration is
-- additive so older local databases can be upgraded without a rebuild.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE source_documents ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';
ALTER TABLE source_documents ADD COLUMN IF NOT EXISTS aliases_json TEXT NOT NULL DEFAULT '[]';

ALTER TABLE observations ADD COLUMN IF NOT EXISTS dimension_labels_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE observations ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'observation';
ALTER TABLE observations ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE observations ADD COLUMN IF NOT EXISTS search_text TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_observations_search_text_trgm
  ON observations USING gin (search_text gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_observations_period_value
  ON observations(period, value);
