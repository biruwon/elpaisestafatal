import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { evaluationCases } from './evaluation-cases.mjs';

const base = (process.env.EVALUATION_BASE_URL || 'http://127.0.0.1:4321').replace(/\/$/, '');
const offset = Math.min(evaluationCases.length, Math.max(0, Number(process.env.EVALUATION_OFFSET || 0)));
const limit = Math.min(evaluationCases.length - offset, Math.max(1, Number(process.env.EVALUATION_LIMIT || evaluationCases.length)));
const concurrency = Math.max(1, Math.min(8, Number(process.env.EVALUATION_CONCURRENCY || 3)));
const cases = evaluationCases.slice(offset, offset + limit);
const outcomes = [];
let cursor = 0;

const resolve = async (item) => {
  const started = performance.now();
  try {
    const response = await fetch(`${base}/api/v1/resolve`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: item.input, inputType: 'text' }), signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`POST ${response.status}`);
    let result = await response.json();
    for (let attempt = 0; attempt < 40 && result.status === 'processing'; attempt += 1) {
      await new Promise((wait) => setTimeout(wait, 350));
      result = await fetch(`${base}/api/v1/resolve/${encodeURIComponent(result.requestId)}`, { signal: AbortSignal.timeout(5000) }).then((pending) => pending.json());
    }
    const claims = Array.isArray(result.relatedClaims) ? result.relatedClaims : [];
    const primarySlug = claims[0]?.slug;
    const knownPass = item.expected.status !== 'known' || primarySlug === item.expected.slug;
    // An uncovered result may still show related guidance. Safety means it
    // did not promote that guidance into a claimed answer.
    const unknownPass = item.expected.status !== 'unknown' || ['uncovered', 'draft'].includes(result.status);
    return { id: item.id, expected: item.expected, status: result.status, primarySlug, knownPass, unknownPass, latencyMs: Math.round(performance.now() - started) };
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
const report = {
  generatedAt: new Date().toISOString(),
  base,
  offset,
  cases: outcomes.length,
  knownCases: outcomes.filter((item) => item.expected.status === 'known').length,
  unknownCases: outcomes.filter((item) => item.expected.status === 'unknown').length,
  knownAccuracy: outcomes.filter((item) => item.expected.status === 'known').filter((item) => item.knownPass).length,
  unknownSafety: outcomes.filter((item) => item.expected.status === 'unknown').filter((item) => item.unknownPass).length,
  errors: outcomes.filter((item) => item.status === 'error').length,
  p50LatencyMs: percentile(0.5),
  p95LatencyMs: percentile(0.95),
  outcomes,
};
const root = new URL('../../.local/', import.meta.url).pathname;
await mkdir(root, { recursive: true });
await writeFile(join(root, 'evaluation-latest.json'), JSON.stringify(report, null, 2));
console.log(`Evaluation completed: ${report.cases} cases; known accuracy ${report.knownAccuracy}/${report.knownCases}; unknown safety ${report.unknownSafety}/${report.unknownCases}; p50 ${report.p50LatencyMs}ms; p95 ${report.p95LatencyMs}ms.`);
if (report.errors === report.cases) process.exit(1);
