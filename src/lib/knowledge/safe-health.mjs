const counterKeys = ['received', 'completed', 'unavailable'];
const statusKeys = new Set(['processing', 'complete', 'published', 'related', 'partial', 'draft', 'uncovered', 'unavailable']);

const boundedCounter = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return undefined;
  return Math.min(Math.floor(value), 1_000_000_000);
};

const boundedRate = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) return undefined;
  return Number(value.toFixed(3));
};

const boundedLatency = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return undefined;
  return Math.min(Math.floor(value), 120_000);
};

export const safeHealthMetrics = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const source = value;
  const metrics = {};
  for (const key of counterKeys) {
    const number = boundedCounter(source[key]);
    if (number !== undefined) metrics[key] = number;
  }
  const cacheHitRate = boundedRate(source.cacheHitRate);
  if (cacheHitRate !== undefined) metrics.cacheHitRate = cacheHitRate;
  const p95LatencyMs = boundedLatency(source.p95LatencyMs);
  if (p95LatencyMs !== undefined) metrics.p95LatencyMs = p95LatencyMs;
  if (source.statusCounts && typeof source.statusCounts === 'object' && !Array.isArray(source.statusCounts)) {
    const statusCounts = {};
    for (const [key, count] of Object.entries(source.statusCounts)) {
      if (!statusKeys.has(key)) continue;
      const number = boundedCounter(count);
      if (number !== undefined) statusCounts[key] = number;
    }
    if (Object.keys(statusCounts).length) metrics.statusCounts = statusCounts;
  }
  return Object.keys(metrics).length ? metrics : undefined;
};

export const safeHealthQueue = (value) => boundedCounter(value);
