CREATE TABLE deputies (id TEXT PRIMARY KEY, legislature TEXT NOT NULL, name TEXT NOT NULL, group_name TEXT, constituency TEXT, service_from TEXT, service_to TEXT, profile_url TEXT, source_document_id TEXT NOT NULL);
CREATE TABLE sessions (id TEXT PRIMARY KEY, legislature TEXT NOT NULL, body TEXT NOT NULL, number INTEGER, date TEXT NOT NULL, agenda_url TEXT, transcript_url TEXT, video_url TEXT, status TEXT NOT NULL);
CREATE TABLE interventions (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, deputy_id TEXT, initiative_id TEXT, title TEXT, topic_labels_json TEXT, text TEXT, text_status TEXT, clip_url TEXT, source_url TEXT);
CREATE TABLE ballots (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, date TEXT, title TEXT, result_url TEXT, totals_json TEXT, presence_note TEXT);
CREATE TABLE individual_votes (ballot_id TEXT NOT NULL, deputy_id TEXT NOT NULL, choice TEXT NOT NULL, mode TEXT NOT NULL, source_locator TEXT, PRIMARY KEY(ballot_id,deputy_id));
CREATE TABLE presence_observations (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, deputy_id TEXT, kind TEXT NOT NULL, value TEXT NOT NULL, observed_at TEXT, seat TEXT, evidence_id TEXT, confidence TEXT, review_status TEXT NOT NULL);
CREATE TABLE source_documents (id TEXT PRIMARY KEY, url TEXT NOT NULL, retrieved_at TEXT NOT NULL, sha256 TEXT, http_status INTEGER, parser_version TEXT, object_path TEXT, error TEXT);
