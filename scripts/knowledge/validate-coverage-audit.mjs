import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
const path = process.env.COVERAGE_AUDIT_INPUT || join(root, '.local/coverage-audit.json');
const report = JSON.parse(await readFile(path, 'utf8'));
const allowed = new Set(['covered_existing_evidence', 'covered_but_not_materialized', 'source_configured_not_refreshed', 'partial_domain_evidence', 'true_research_gap', 'unsupported_scope', 'operational_failure']);
const errors = [];
if (report.schemaVersion !== '1' || !report.generatedAt || !report.summary) errors.push('audit header is malformed');
if (!Number.isInteger(report.summary.configuredFeeds) || report.summary.configuredFeeds < 0) errors.push('configured feed total is malformed');
if (!Number.isInteger(report.summary.configuredMetricCount) || report.summary.configuredMetricCount < 0) errors.push('configured metric total is malformed');
if (!Array.isArray(report.feeds)) errors.push('feed inventory is missing');
if (Array.isArray(report.feeds) && report.summary.configuredFeeds !== report.feeds.length) errors.push('configured feed total does not match feed inventory');
if (Array.isArray(report.metrics) && report.summary.configuredMetricCount !== report.metrics.filter((item) => item.configuredFeedCount > 0).length) errors.push('configured metric total does not match metric readiness');
if (Array.isArray(report.feeds)) {
  const keys = report.feeds.map((feed) => `${feed.sourceId || ''}|${feed.metricId || ''}|${feed.url || ''}`);
  if (new Set(keys).size !== keys.length) errors.push('feed inventory contains duplicate source/metric/URL entries');
}
if (![report.summary.refreshAttempted, report.summary.refreshSucceeded, report.summary.refreshFailed].every((value) => Number.isInteger(Number(value)) && Number(value) >= 0)) errors.push('refresh summary is malformed');
if (!Array.isArray(report.operationalFailures)) errors.push('operational failure collection is missing');
if (!Array.isArray(report.metrics) || !Array.isArray(report.clusters) || !Array.isArray(report.sourceWorkCandidates) || !Array.isArray(report.sourceWorkItems)) errors.push('audit collections are missing');
const expectedSourceWorkItems = report.clusters.filter((item) => !['covered_existing_evidence', 'operational_failure'].includes(item.auditClass)).length + (report.domainGaps || []).length;
if (report.sourceWorkItems?.length !== expectedSourceWorkItems) errors.push('source-work queue does not cover every actionable gap cluster and domain contract');
for (const item of report.sourceWorkItems || []) {
  if (!item.id || (!item.clusterId && !item.id.startsWith('gap:')) || !item.canonicalText || !item.action || !Array.isArray(item.requiredDimensions)) errors.push(`${item.id || 'source-work item'}: incomplete source-work record`);
  if (![item.harmScore, item.urgencyScore, item.evidenceReadiness, item.rankScore].every((value) => Number.isFinite(Number(value)))) errors.push(`${item.id || 'source-work item'}: ranking dimensions are incomplete`);
  if (item.id?.startsWith('gap:') && (!Array.isArray(item.availableEvidence) || !Array.isArray(item.missingFields) || !item.nextEvidence)) errors.push(`${item.id}: contract gap lacks evidence summary or next-evidence task`);
}
for (const item of report.clusters || []) {
  if (!item.clusterId) errors.push('cluster is missing an id');
  if (!allowed.has(item.auditClass)) errors.push(`${item.clusterId}: invalid audit class ${item.auditClass}`);
  if (!item.action) errors.push(`${item.clusterId}: missing recommended action`);
  if (item.auditClass === 'covered_existing_evidence' && (!item.metricIds?.length && !item.linkedClaimSlug || item.action !== 'auto_route')) errors.push(`${item.clusterId}: covered item lacks metric or published-claim routing`);
  if (item.auditClass === 'unsupported_scope' && item.action !== 'find_local_source') errors.push(`${item.clusterId}: unsupported scope was not kept local`);
}
for (const item of report.metrics || []) {
  if (!item.id || !item.status || !Number.isInteger(item.configuredFeedCount)) errors.push('metric readiness record is incomplete');
  if (item.status === 'ready' && item.action !== 'none') errors.push(`${item.id}: ready metric has a non-empty action`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Coverage audit valid: ${report.clusters.length} clusters, ${report.sourceWorkCandidates.length} source-work candidates.`);
