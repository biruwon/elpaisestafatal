import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { evaluationCases } from './evaluation-cases.mjs';
import { evaluateOutcome } from './evaluation-metrics.mjs';

const base = (process.env.EVALUATION_BASE_URL || 'http://127.0.0.1:4321').replace(/\/$/, '');
const resolvePath = process.env.EVALUATION_RESOLVE_PATH || '/api/v1/resolve';
const offset = Math.min(evaluationCases.length, Math.max(0, Number(process.env.EVALUATION_OFFSET || 0)));
const limit = Math.min(evaluationCases.length - offset, Math.max(1, Number(process.env.EVALUATION_LIMIT || evaluationCases.length)));
const concurrency = Math.max(1, Math.min(8, Number(process.env.EVALUATION_CONCURRENCY || 3)));
const cases = evaluationCases.slice(offset, offset + limit);
const outcomes = [];
let cursor = 0;

const resolve = async (item) => {
  const started = performance.now();
  try {
    const response = await fetch(`${base}${resolvePath}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: item.input, inputType: 'text' }), signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`POST ${response.status}`);
    let result = await response.json();
    for (let attempt = 0; attempt < 40 && result.status === 'processing'; attempt += 1) {
      await new Promise((wait) => setTimeout(wait, 350));
      result = await fetch(`${base}${resolvePath}/${encodeURIComponent(result.requestId)}`, { signal: AbortSignal.timeout(5000) }).then((pending) => pending.json());
    }
    return evaluateOutcome({ item, result, latencyMs: Math.round(performance.now() - started) });
  } catch (error) {
    return { id: item.id, expected: item.expected, status: 'error', error: error instanceof Error ? error.message : String(error), knownPass: false, unknownPass: false, latencyMs: Math.round(performance.now() - started) };
  }
};

const worker = async () => {
  while (cursor < cases.length) {
    const item = cases[cursor];
    cursor += 1;
    outcomes.push(await resolve(item));
  }
};
await Promise.all(Array.from({ length: Math.min(concurrency, cases.length) }, worker));
const latencies = outcomes.map((item) => item.latencyMs).sort((left, right) => left - right);
const percentile = (value) => latencies.length ? latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * value))] : 0;
const knownOutcomes = outcomes.filter((item) => item.expected.status === 'known');
const unknownOutcomes = outcomes.filter((item) => item.expected.status === 'unknown');
const traceableOutcomes = outcomes.filter((item) => item.traceabilityChecked);
let health = null;
try {
  const response = await fetch(`${base}${process.env.EVALUATION_HEALTH_PATH || '/healthz'}`, { signal: AbortSignal.timeout(3000) });
  if (response.ok) health = await response.json();
} catch { /* Health telemetry is optional for a remote Pages endpoint. */ }
const report = {
  generatedAt: new Date().toISOString(),
  base,
  resolvePath,
  offset,
  cases: outcomes.length,
  knownCases: outcomes.filter((item) => item.expected.status === 'known').length,
  unknownCases: outcomes.filter((item) => item.expected.status === 'unknown').length,
  knownAccuracy: knownOutcomes.filter((item) => item.knownPass).length,
  knownRetrievalRecall: knownOutcomes.filter((item) => item.knownPass).length,
  unknownSafety: unknownOutcomes.filter((item) => item.unknownPass).length,
  irrelevantMatches: outcomes.filter((item) => item.irrelevantMatch).length,
  unsupportedConclusionRate: unknownOutcomes.length ? Number((unknownOutcomes.filter((item) => !item.unknownPass).length / unknownOutcomes.length).toFixed(4)) : 0,
  propositionBreakdowns: outcomes.filter((item) => item.propositionBreakdown).length,
  traceability: { checked: traceableOutcomes.length, passed: traceableOutcomes.filter((item) => item.traceabilityPass).length },
  coverageByStatus: Object.fromEntries([...new Set(outcomes.map((item) => item.coverage))].map((status) => [status, outcomes.filter((item) => item.coverage === status).length])),
  cacheHitRate: typeof health?.metrics?.cacheHitRate === 'number' ? health.metrics.cacheHitRate : null,
  errors: outcomes.filter((item) => item.status === 'error').length,
  p50LatencyMs: percentile(0.5),
  p95LatencyMs: percentile(0.95),
  outcomes,
};
const root = new URL('../../.local/', import.meta.url).pathname;
await mkdir(root, { recursive: true });
await writeFile(join(root, 'evaluation-latest.json'), JSON.stringify(report, null, 2));
console.log(`Evaluation completed: ${report.cases} cases; known recall ${report.knownRetrievalRecall}/${report.knownCases}; unknown safety ${report.unknownSafety}/${report.unknownCases}; irrelevant matches ${report.irrelevantMatches}; traceability ${report.traceability.passed}/${report.traceability.checked}; p50 ${report.p50LatencyMs}ms; p95 ${report.p95LatencyMs}ms.`);
if (report.errors === report.cases) process.exit(1);
