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

-- Preserve normalized claim wording so maintainers can review real demand.
-- New submissions are filtered and normalized in functions/lib/claim-demand.ts
-- before they reach these tables. Replacing historical wording wholesale
-- would leave the review queue with counts but no claims to inspect.
