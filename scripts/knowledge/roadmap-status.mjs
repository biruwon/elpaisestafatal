import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
const read = async (path, fallback = {}) => { try { return JSON.parse(await readFile(join(root, path), 'utf8')); } catch { return fallback; } };
const audit = await read('.local/coverage-audit.json');
const refresh = await read('.local/domain-refresh-report.json');
const benchmark = await read('.local/compiler-benchmark.json');
const catalog = await read('dist/claim-catalog.json', []);
let reviewedLanguageExamples = 0;
try {
  const claimFiles = (await readdir(join(root, 'content/claims'))).filter((file) => file.endsWith('.md'));
  for (const file of claimFiles) {
    const source = await readFile(join(root, 'content/claims', file), 'utf8');
    const aliasLine = source.match(/^aliases:\s*(\[[^\n]*\])/m)?.[1];
    if (aliasLine) {
      try { reviewedLanguageExamples += new Set(JSON.parse(aliasLine).filter(Boolean)).size; } catch { /* catalog fallback below */ }
    }
  }
} catch { /* use built catalog when source files are unavailable */ }
if (!reviewedLanguageExamples && Array.isArray(catalog)) reviewedLanguageExamples = catalog.filter((item) => item.kind === 'claim').reduce((total, item) => total + new Set([item.title, ...(item.aliases || [])].filter(Boolean)).size, 0);
const partialMetricIds = (audit.metrics || []).filter((item) => item.status === 'partial_domain_evidence').map((item) => item.id);
const gapClasses = Object.fromEntries(Object.entries(audit.summary?.clusterClasses || {}).sort(([left], [right]) => left.localeCompare(right)));
const status = {
  schemaVersion: '1',
  generatedAt: new Date().toISOString(),
  coverage: { metrics: audit.summary?.registryMetrics || 0, configuredFeeds: audit.summary?.configuredFeeds || 0, configuredMetrics: audit.summary?.configuredMetricCount || 0, reviewedLanguageExamples, ready: audit.summary?.metricStatuses?.ready || 0, partial: audit.summary?.metricStatuses?.partial_domain_evidence || 0, clusters: audit.summary?.clusters || 0, newlyCovered: audit.summary?.newlyCoveredClusters || 0, trueGaps: audit.summary?.clusterClasses?.true_research_gap || 0, sourceWorkItems: audit.summary?.sourceWorkItems || 0 },
  gapDetail: { partialMetricIds, clusterClasses: gapClasses, domainContracts: (audit.domainGaps || []).map((gap) => ({ id: gap.id, domain: gap.domain, status: gap.status, missingFields: gap.missingFields || [], nextEvidence: gap.nextEvidence || null })) },
  refresh: { attempted: refresh.attempted || 0, succeeded: refresh.succeeded || 0, failed: refresh.failed || 0 },
  model: { recommended: benchmark.recommendedModel || null, status: benchmark.recommendedModel ? 'qualified' : benchmark.reports?.length ? 'rejected' : 'not_run', unavailable: benchmark.unavailableModels || [], candidates: benchmark.reports?.map((item) => ({ model: item.model, passed: item.passed, complete: item.complete === true, quality: item.quality, safetyRate: item.safetyRate, p95Ms: item.p95Ms, failureReasons: [item.complete !== true ? 'incomplete_benchmark' : null, item.quality < (benchmark.minimumQuality ?? 0.8) ? 'quality_below_threshold' : null, item.safetyRate !== 1 ? 'safety_fields_not_preserved' : null, item.p95Ms > (benchmark.maxWarmP95Ms ?? 15000) ? 'warm_p95_above_threshold' : null].filter(Boolean) })) || [] },
};
const output = join(root, '.local/roadmap-status.json');
await mkdir(join(root, '.local'), { recursive: true });
await writeFile(output, JSON.stringify(status, null, 2));
console.log(JSON.stringify(status, null, 2));
