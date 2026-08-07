ALTER TABLE resolve_requests ADD COLUMN answer_mode TEXT;
ALTER TABLE resolve_requests ADD COLUMN event_class TEXT;
ALTER TABLE resolve_requests ADD COLUMN source_status TEXT;
ALTER TABLE resolve_requests ADD COLUMN researched_at TEXT;
ALTER TABLE query_clusters ADD COLUMN answer_mode TEXT;
ALTER TABLE query_clusters ADD COLUMN event_class TEXT;
ALTER TABLE query_clusters ADD COLUMN event_urgency TEXT;
ALTER TABLE query_clusters ADD COLUMN source_status TEXT;
ALTER TABLE query_clusters ADD COLUMN last_researched_at TEXT;
ALTER TABLE query_clusters ADD COLUMN negative_feedback_count INTEGER NOT NULL DEFAULT 0;

-- One-time privacy scrub for rows created before neutral clustering. The
-- semantic signature remains useful for aggregate counts; original wording
-- is deliberately not retained.
UPDATE resolve_requests SET normalized_text = 'legacy neutral cluster', canonical_signature = COALESCE(canonical_signature, 'legacy');
UPDATE query_clusters SET canonical_text = 'legacy neutral cluster', canonical_signature = COALESCE(canonical_signature, 'legacy');
