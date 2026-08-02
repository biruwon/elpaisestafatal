-- Group equivalent long-tail wording in D1 without losing the original
-- canonical signature used for audit and review display.

ALTER TABLE resolve_requests ADD COLUMN semantic_signature TEXT;
ALTER TABLE query_clusters ADD COLUMN semantic_signature TEXT;

CREATE INDEX IF NOT EXISTS idx_resolve_requests_semantic_signature
  ON resolve_requests(semantic_signature);

CREATE UNIQUE INDEX IF NOT EXISTS idx_query_clusters_semantic_signature
  ON query_clusters(semantic_signature);
