-- Remove abandoned D1 projections and feedback/rate-limit storage. The live
-- claim review queue remains in resolve_requests/query_clusters, and event
-- and legal records remain typed observations in the generic warehouse.
DROP TABLE IF EXISTS answer_feedback;
DROP TABLE IF EXISTS api_rate_limits;
DROP TABLE IF EXISTS government_events;
DROP TABLE IF EXISTS legal_rules;
DROP TABLE IF EXISTS evidence_relationships;
DROP TABLE IF EXISTS ingestion_runs;
ALTER TABLE query_clusters DROP COLUMN negative_feedback_count;

-- Per-request result/research fields were never read or updated. Keep the
-- legacy signatures/status columns temporarily because an older Pages deploy
-- may still write them until the new code is published.
ALTER TABLE resolve_requests DROP COLUMN result_json;
ALTER TABLE resolve_requests DROP COLUMN knowledge_version;
ALTER TABLE resolve_requests DROP COLUMN completed_at;
ALTER TABLE resolve_requests DROP COLUMN answer_mode;
ALTER TABLE resolve_requests DROP COLUMN event_class;
ALTER TABLE resolve_requests DROP COLUMN source_status;
ALTER TABLE resolve_requests DROP COLUMN researched_at;
ALTER TABLE resolve_requests DROP COLUMN result_state;
ALTER TABLE resolve_requests DROP COLUMN research_outcome;
ALTER TABLE query_clusters DROP COLUMN answer_mode;
ALTER TABLE query_clusters DROP COLUMN event_class;
ALTER TABLE query_clusters DROP COLUMN event_urgency;
ALTER TABLE query_clusters DROP COLUMN source_status;
ALTER TABLE query_clusters DROP COLUMN last_researched_at;
ALTER TABLE query_clusters DROP COLUMN result_state;
ALTER TABLE query_clusters DROP COLUMN research_outcome;
ALTER TABLE query_clusters DROP COLUMN source_tiers_checked;

-- The source exporter writes several useful fields that the original D1
-- schema omitted. Rebuild this still-empty table without the incorrect unique
-- constraint on content hashes: distinct source/metric manifests can point
-- to the same fetched bytes.
CREATE TABLE source_documents_rebuilt (
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
INSERT INTO source_documents_rebuilt (
  id, publisher, url, content_type, published_at, retrieved_at, sha256,
  trust_tier, parser_version
)
SELECT
  id, publisher, url, content_type, published_at, retrieved_at, sha256,
  trust_tier, parser_version
FROM source_documents;
DROP TABLE source_documents;
ALTER TABLE source_documents_rebuilt RENAME TO source_documents;

ALTER TABLE observations ADD COLUMN dimension_labels_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE observations ADD COLUMN kind TEXT NOT NULL DEFAULT 'observation';
ALTER TABLE observations ADD COLUMN url TEXT;
ALTER TABLE observations ADD COLUMN excerpt TEXT;
ALTER TABLE observations ADD COLUMN search_text TEXT NOT NULL DEFAULT '';
ALTER TABLE observations ADD COLUMN payload_json TEXT NOT NULL DEFAULT '{}';

-- The generic observation payload retains typed event/legal findings while
-- keeping one retrieval model. FTS indexes the same normalized text used by
-- the source-warehouse exporter.
CREATE VIRTUAL TABLE observations_fts USING fts5(
  search_text,
  content='observations',
  content_rowid='rowid'
);
CREATE TRIGGER observations_fts_insert AFTER INSERT ON observations BEGIN
  INSERT INTO observations_fts(rowid, search_text) VALUES (new.rowid, new.search_text);
END;
CREATE TRIGGER observations_fts_delete AFTER DELETE ON observations BEGIN
  INSERT INTO observations_fts(observations_fts, rowid, search_text)
  VALUES ('delete', old.rowid, old.search_text);
END;
CREATE TRIGGER observations_fts_update AFTER UPDATE ON observations BEGIN
  INSERT INTO observations_fts(observations_fts, rowid, search_text)
  VALUES ('delete', old.rowid, old.search_text);
  INSERT INTO observations_fts(rowid, search_text) VALUES (new.rowid, new.search_text);
END;
INSERT INTO observations_fts(observations_fts) VALUES ('rebuild');
