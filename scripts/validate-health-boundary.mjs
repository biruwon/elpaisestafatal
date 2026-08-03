import { safeHealthEnvelope, safeHealthMetrics, safeHealthQueue } from '../src/lib/knowledge/safe-health.mjs';

const sanitized = safeHealthMetrics({
  received: 4.9,
  completed: 3,
  unavailable: -1,
  cacheHitRate: 1.234,
  p95LatencyMs: 999999,
  queueDepth: 12,
  provider: 'local-runtime',
  statusCounts: { complete: 2.8, processing: 1, provider: 99, invalid: 8 },
});

if (JSON.stringify(sanitized) !== JSON.stringify({ received: 4, completed: 3, p95LatencyMs: 120000, statusCounts: { complete: 2, processing: 1 } })) {
  throw new Error(`Health metrics were not reduced to the safe contract: ${JSON.stringify(sanitized)}`);
}
if (safeHealthMetrics({ provider: 'local-runtime', model: 'hidden' }) !== undefined) throw new Error('Implementation-only health fields crossed the boundary');
if (safeHealthQueue(-1) !== undefined || safeHealthQueue(2.9) !== 2 || safeHealthQueue(2_000_000_001) !== 1_000_000_000) throw new Error('Health queue bounds are invalid');
const validEnvelope = safeHealthEnvelope({ status: 'ok', deterministic: true, dynamic: true, metrics: { completed: 4 }, queue: 2 });
if (JSON.stringify(validEnvelope) !== JSON.stringify({ dynamic: true, metrics: { completed: 4 }, queue: 2 })) throw new Error('Valid health envelope was rejected');
if (JSON.stringify(safeHealthEnvelope({ status: 'ok', deterministic: true, dynamic: true, provider: 'hidden' })) !== JSON.stringify({ dynamic: true })) throw new Error('Unknown health envelope fields crossed the public boundary');
if (safeHealthEnvelope({ status: 'ok', deterministic: true, provider: 'hidden' }) !== undefined) throw new Error('Malformed health envelope was accepted');
console.log('Health boundary validation passed: only bounded provider-neutral operational metrics are public.');
