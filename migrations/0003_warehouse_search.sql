-- D1-safe additive fields for the operational schema. PostgreSQL-specific
-- full-text/trigram indexes live under migrations/postgres instead.

ALTER TABLE observations ADD COLUMN metric_id TEXT;

CREATE INDEX IF NOT EXISTS idx_observations_metric_period
  ON observations(metric_id, period);
