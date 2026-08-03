-- Durable, operational-only request counters. They are never part of the
-- reviewed knowledge base and can be pruned independently of claim data.

CREATE TABLE IF NOT EXISTS api_rate_limits (
  identity TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (identity, window_start)
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_updated
  ON api_rate_limits(updated_at);
