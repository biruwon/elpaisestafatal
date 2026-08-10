-- Sanitized operational outcomes only. No raw claim text, excerpts, snippets,
-- article bodies, private names, or provider payloads are stored here.
ALTER TABLE resolve_requests ADD COLUMN result_state TEXT;
ALTER TABLE resolve_requests ADD COLUMN research_outcome TEXT;
ALTER TABLE query_clusters ADD COLUMN result_state TEXT;
ALTER TABLE query_clusters ADD COLUMN research_outcome TEXT;
ALTER TABLE query_clusters ADD COLUMN source_tiers_checked TEXT;
