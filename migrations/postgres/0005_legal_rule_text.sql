-- Bounded text from official legal blocks. This remains derived data and can
-- be rebuilt from the versioned BOE source snapshots.
ALTER TABLE observations ADD COLUMN IF NOT EXISTS excerpt TEXT;

CREATE INDEX IF NOT EXISTS idx_observations_legal_rule_period
  ON observations(kind, period DESC)
  WHERE kind = 'legal_rule';
