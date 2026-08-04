-- Durable maintainer-only triage state. This never publishes a claim.
ALTER TABLE query_clusters ADD COLUMN triage_status TEXT NOT NULL DEFAULT 'untriaged';
ALTER TABLE query_clusters ADD COLUMN triage_priority REAL NOT NULL DEFAULT 0;
ALTER TABLE query_clusters ADD COLUMN triage_next_action TEXT;
ALTER TABLE query_clusters ADD COLUMN triaged_at TEXT;

CREATE INDEX IF NOT EXISTS idx_query_clusters_triage
  ON query_clusters(triage_status, triage_priority DESC, last_seen_at DESC);
