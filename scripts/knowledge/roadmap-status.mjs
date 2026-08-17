import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
const read = async (path, fallback = {}) => { try { return JSON.parse(await readFile(join(root, path), 'utf8')); } catch { return fallback; } };
const audit = await read('.local/coverage-audit.json');
const refresh = await read('.local/domain-refresh-report.json');
const benchmark = await read('.local/compiler-benchmark.json');
const status = {
  schemaVersion: '1',
  generatedAt: new Date().toISOString(),
  coverage: { metrics: audit.summary?.registryMetrics || 0, ready: audit.summary?.metricStatuses?.ready || 0, partial: audit.summary?.metricStatuses?.partial_domain_evidence || 0, clusters: audit.summary?.clusters || 0, newlyCovered: audit.summary?.newlyCoveredClusters || 0, trueGaps: audit.summary?.clusterClasses?.true_research_gap || 0, sourceWorkItems: audit.summary?.sourceWorkItems || 0 },
  refresh: { attempted: refresh.attempted || 0, succeeded: refresh.succeeded || 0, failed: refresh.failed || 0 },
  model: { recommended: benchmark.recommendedModel || null, candidates: benchmark.reports?.map((item) => ({ model: item.model, passed: item.passed, quality: item.quality, safetyRate: item.safetyRate, p95Ms: item.p95Ms })) || [] },
};
const output = join(root, '.local/roadmap-status.json');
await mkdir(join(root, '.local'), { recursive: true });
await writeFile(output, JSON.stringify(status, null, 2));
console.log(JSON.stringify(status, null, 2));
