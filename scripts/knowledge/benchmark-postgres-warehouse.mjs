import { mkdir, writeFile } from 'node:fs/promises';
import { queryPostgresWarehouse, closeWarehousePool, postgresEnabled } from './postgres-warehouse.mjs';
import { warehouseRetrievalBenchmarkCases } from './warehouse-retrieval-benchmark-cases.mjs';

const limit = Math.max(1, Math.min(20, Number(process.env.POSTGRES_BENCHMARK_LIMIT || 8)));
const concurrency = Math.max(1, Math.min(12, Number(process.env.POSTGRES_BENCHMARK_CONCURRENCY || 4)));
const reportPath = new URL('../../.local/postgres-warehouse-benchmark.json', import.meta.url);

if (!postgresEnabled()) {
  console.log('PostgreSQL warehouse benchmark skipped: WAREHOUSE_DATABASE_URL is not configured.');
  process.exit(0);
}

const positiveCases = warehouseRetrievalBenchmarkCases.filter((item) => item.expectedMetricId !== null);
const negativeCases = warehouseRetrievalBenchmarkCases.filter((item) => item.expectedMetricId === null);
const outcomes = [];
let cursor = 0;

const worker = async () => {
  while (cursor < warehouseRetrievalBenchmarkCases.length) {
    const index = cursor;
    cursor += 1;
    const [id, query, expectedMetricId] = warehouseRetrievalBenchmarkCases[index];
    const startedAt = performance.now();
    let rows = null;
    let error = null;
    try { rows = await queryPostgresWarehouse(query, limit); } catch (failure) { error = failure instanceof Error ? failure.message : String(failure); }
    const ranked = Array.isArray(rows) ? rows : [];
    outcomes[index] = {
      id,
      query,
      expectedMetricId,
      topMetricId: ranked[0]?.metricId || null,
      top3MetricIds: ranked.slice(0, 3).map((row) => row.metricId || null),
      topScore: Number(ranked[0]?.score || 0),
      topEvidenceFit: ranked[0]?.evidenceFit || null,
      resultCount: ranked.length,
      latencyMs: Math.round(performance.now() - startedAt),
      error,
    };
  }
};

try {
  await Promise.all(Array.from({ length: Math.min(concurrency, warehouseRetrievalBenchmarkCases.length) }, worker));
} finally {
  await closeWarehousePool();
}

const count = (predicate) => outcomes.filter(predicate).length;
const report = {
  generatedAt: new Date().toISOString(),
  cases: outcomes.length,
  positiveCases: positiveCases.length,
  negativeCases: negativeCases.length,
  concurrency,
  limit,
  top1: count((item) => item.expectedMetricId !== null && item.topMetricId === item.expectedMetricId),
  recallAt3: count((item) => item.expectedMetricId !== null && item.top3MetricIds.includes(item.expectedMetricId)),
  negativeRejections: count((item) => item.expectedMetricId === null && item.topMetricId === null),
  errors: count((item) => Boolean(item.error)),
  unsafeTopMatches: count((item) => item.expectedMetricId !== null && item.topEvidenceFit === 'weak'),
  latencyMs: {
    p50: [...outcomes].sort((a, b) => a.latencyMs - b.latencyMs)[Math.floor(outcomes.length * 0.5)]?.latencyMs || 0,
    p95: [...outcomes].sort((a, b) => a.latencyMs - b.latencyMs)[Math.max(0, Math.ceil(outcomes.length * 0.95) - 1)]?.latencyMs || 0,
  },
  outcomes,
};
const root = new URL('../../.local/', import.meta.url).pathname;
await mkdir(root, { recursive: true });
await writeFile(reportPath, JSON.stringify(report, null, 2));
console.log(`PostgreSQL warehouse benchmark: top-1 ${report.top1}/${report.positiveCases}; recall@3 ${report.recallAt3}/${report.positiveCases}; negative rejections ${report.negativeRejections}/${report.negativeCases}; errors ${report.errors}; p95 ${report.latencyMs.p95}ms.`);
if (report.errors || report.recallAt3 / report.positiveCases < 0.9 || report.negativeRejections !== report.negativeCases || report.unsafeTopMatches > 0) process.exitCode = 1;
