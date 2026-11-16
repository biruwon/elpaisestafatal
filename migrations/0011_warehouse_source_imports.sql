-- Track whether each source snapshot finished loading so refreshes can skip
-- unchanged evidence and safely retry imports interrupted between batches.
CREATE TABLE IF NOT EXISTS warehouse_source_imports (
  source_id TEXT PRIMARY KEY,
  sha256 TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'complete')),
  updated_at TEXT NOT NULL,
  FOREIGN KEY (source_id) REFERENCES source_documents(id) ON DELETE CASCADE
);
