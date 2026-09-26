-- Give legacy submissions without a cluster a durable review destination.
-- The claim wording is already privacy-filtered in normalized_text; preserve it.
WITH unlinked_requests AS (
  SELECT
    r.semantic_signature,
    MIN(r.normalized_text) AS canonical_text,
    MIN(r.canonical_signature) AS canonical_signature,
    COUNT(*) AS query_count,
    MAX(r.created_at) AS last_seen_at
  FROM resolve_requests r
  LEFT JOIN query_cluster_members m ON m.request_id = r.id
  WHERE m.request_id IS NULL
    AND r.semantic_signature IS NOT NULL
    AND r.semantic_signature <> ''
  GROUP BY r.semantic_signature
)
INSERT OR IGNORE INTO query_clusters (
  id,
  canonical_text,
  canonical_signature,
  semantic_signature,
  query_count,
  last_seen_at,
  coverage_status
)
SELECT
  'cluster-backfill-' || lower(hex(randomblob(16))),
  u.canonical_text,
  u.canonical_signature,
  u.semantic_signature,
  u.query_count,
  u.last_seen_at,
  'received'
FROM unlinked_requests u;

INSERT OR IGNORE INTO query_cluster_members (request_id, cluster_id)
SELECT r.id, c.id
FROM resolve_requests r
JOIN query_clusters c ON c.semantic_signature = r.semantic_signature
LEFT JOIN query_cluster_members m ON m.request_id = r.id
WHERE m.request_id IS NULL
  AND r.semantic_signature IS NOT NULL
  AND r.semantic_signature <> '';
