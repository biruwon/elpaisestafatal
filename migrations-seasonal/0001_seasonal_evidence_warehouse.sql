-- Small, separately sharded evidence store for quarterly tourism-related
-- employment series. This avoids writes to the full operational warehouse.
CREATE TABLE IF NOT EXISTS source_documents (
  id TEXT PRIMARY KEY,
  publisher TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  aliases_json TEXT NOT NULL DEFAULT '[]',
  source_registry_id TEXT,
  schedule TEXT,
  url TEXT NOT NULL,
  content_type TEXT NOT NULL,
  published_at TEXT,
  retrieved_at TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  trust_tier TEXT NOT NULL CHECK (trust_tier IN ('primary', 'discovery')),
  parser_version TEXT
);

CREATE TABLE IF NOT EXISTS datasets (
  id TEXT PRIMARY KEY,
  source_document_id TEXT NOT NULL,
  title TEXT NOT NULL,
  metric TEXT,
  unit TEXT,
  geography TEXT,
  population TEXT,
  period_start TEXT,
  period_end TEXT,
  definition TEXT,
  FOREIGN KEY (source_document_id) REFERENCES source_documents(id)
);

CREATE TABLE IF NOT EXISTS observations (
  id TEXT PRIMARY KEY,
  dataset_id TEXT NOT NULL,
  source_document_id TEXT NOT NULL,
  metric TEXT,
  metric_id TEXT,
  value REAL,
  unit TEXT,
  period TEXT,
  geography TEXT,
  population TEXT,
  dimensions_json TEXT NOT NULL DEFAULT '{}',
  dimension_labels_json TEXT NOT NULL DEFAULT '{}',
  kind TEXT NOT NULL DEFAULT 'observation',
  url TEXT,
  excerpt TEXT,
  search_text TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (dataset_id) REFERENCES datasets(id),
  FOREIGN KEY (source_document_id) REFERENCES source_documents(id)
);

CREATE INDEX IF NOT EXISTS idx_seasonal_observations_metric_period
  ON observations(metric_id, period);

CREATE TABLE IF NOT EXISTS warehouse_source_imports (
  source_id TEXT PRIMARY KEY,
  sha256 TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'complete')),
  updated_at TEXT NOT NULL,
  FOREIGN KEY (source_id) REFERENCES source_documents(id) ON DELETE CASCADE
);
