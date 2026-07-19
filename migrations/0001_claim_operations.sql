-- Operational data only. Reviewed claims and evidence remain versioned in Git.

CREATE TABLE IF NOT EXISTS resolve_requests (
  id TEXT PRIMARY KEY,
  normalized_text TEXT NOT NULL,
  canonical_signature TEXT,
  input_type TEXT NOT NULL DEFAULT 'text',
  status TEXT NOT NULL DEFAULT 'received',
  result_json TEXT,
  knowledge_version TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_resolve_requests_signature
  ON resolve_requests(canonical_signature);

CREATE INDEX IF NOT EXISTS idx_resolve_requests_created
  ON resolve_requests(created_at);

CREATE TABLE IF NOT EXISTS query_clusters (
  id TEXT PRIMARY KEY,
  canonical_text TEXT NOT NULL,
  canonical_signature TEXT NOT NULL UNIQUE,
  query_count INTEGER NOT NULL DEFAULT 0,
  last_seen_at TEXT NOT NULL,
  coverage_status TEXT NOT NULL DEFAULT 'uncovered',
  linked_claim_slug TEXT,
  review_status TEXT NOT NULL DEFAULT 'unreviewed'
);

CREATE INDEX IF NOT EXISTS idx_query_clusters_priority
  ON query_clusters(query_count DESC, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS query_cluster_members (
  request_id TEXT NOT NULL,
  cluster_id TEXT NOT NULL,
  PRIMARY KEY (request_id, cluster_id),
  FOREIGN KEY (request_id) REFERENCES resolve_requests(id),
  FOREIGN KEY (cluster_id) REFERENCES query_clusters(id)
);

CREATE TABLE IF NOT EXISTS answer_feedback (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (request_id) REFERENCES resolve_requests(id)
);
