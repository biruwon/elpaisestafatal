-- Derived evidence warehouse. Rebuildable from source snapshots and parser versions.

CREATE TABLE IF NOT EXISTS source_documents (
  id TEXT PRIMARY KEY,
  publisher TEXT NOT NULL,
  url TEXT NOT NULL,
  content_type TEXT NOT NULL,
  published_at TEXT,
  retrieved_at TEXT NOT NULL,
  sha256 TEXT NOT NULL UNIQUE,
  trust_tier TEXT NOT NULL CHECK (trust_tier IN ('primary', 'discovery')),
  parser_version TEXT,
  object_path TEXT NOT NULL
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
  value REAL,
  unit TEXT,
  period TEXT,
  geography TEXT,
  population TEXT,
  dimensions_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (dataset_id) REFERENCES datasets(id),
  FOREIGN KEY (source_document_id) REFERENCES source_documents(id)
);

CREATE INDEX IF NOT EXISTS idx_observations_lookup
  ON observations(metric, period, geography);

CREATE TABLE IF NOT EXISTS government_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_date TEXT NOT NULL,
  actor_entity TEXT,
  target_entity TEXT,
  amount REAL,
  currency TEXT,
  purpose TEXT,
  legal_instrument TEXT,
  source_document_id TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (source_document_id) REFERENCES source_documents(id)
);

CREATE INDEX IF NOT EXISTS idx_government_events_lookup
  ON government_events(event_type, event_date, actor_entity, target_entity);

CREATE TABLE IF NOT EXISTS legal_rules (
  id TEXT PRIMARY KEY,
  jurisdiction TEXT NOT NULL,
  valid_from TEXT,
  valid_to TEXT,
  subject TEXT NOT NULL,
  scenario TEXT NOT NULL,
  conditions_json TEXT NOT NULL DEFAULT '[]',
  exceptions_json TEXT NOT NULL DEFAULT '[]',
  source_document_id TEXT NOT NULL,
  FOREIGN KEY (source_document_id) REFERENCES source_documents(id)
);

CREATE TABLE IF NOT EXISTS evidence_relationships (
  evidence_id TEXT NOT NULL,
  proposition_id TEXT NOT NULL,
  relationship TEXT NOT NULL CHECK (relationship IN ('supports', 'contradicts', 'qualifies', 'context', 'insufficient')),
  directness REAL NOT NULL DEFAULT 0,
  geography_match REAL NOT NULL DEFAULT 0,
  time_match REAL NOT NULL DEFAULT 0,
  population_match REAL NOT NULL DEFAULT 0,
  freshness REAL NOT NULL DEFAULT 0,
  extraction_confidence REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (evidence_id, proposition_id)
);

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL,
  parser_version TEXT NOT NULL,
  records_seen INTEGER NOT NULL DEFAULT 0,
  records_written INTEGER NOT NULL DEFAULT 0,
  error TEXT
);
