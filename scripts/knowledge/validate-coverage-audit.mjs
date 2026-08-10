import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
const path = process.env.COVERAGE_AUDIT_INPUT || join(root, '.local/coverage-audit.json');
const report = JSON.parse(await readFile(path, 'utf8'));
const allowed = new Set(['covered_existing_evidence', 'covered_but_not_materialized', 'source_configured_not_refreshed', 'partial_domain_evidence', 'true_research_gap', 'unsupported_scope', 'operational_failure']);
const errors = [];
if (report.schemaVersion !== '1' || !report.generatedAt || !report.summary) errors.push('audit header is malformed');
if (!Array.isArray(report.metrics) || !Array.isArray(report.clusters) || !Array.isArray(report.sourceWorkCandidates)) errors.push('audit collections are missing');
for (const item of report.clusters || []) {
  if (!item.clusterId) errors.push('cluster is missing an id');
  if (!allowed.has(item.auditClass)) errors.push(`${item.clusterId}: invalid audit class ${item.auditClass}`);
  if (!item.action) errors.push(`${item.clusterId}: missing recommended action`);
  if (item.auditClass === 'covered_existing_evidence' && (!item.metricIds?.length || item.action !== 'auto_route')) errors.push(`${item.clusterId}: covered item lacks metric routing`);
  if (item.auditClass === 'unsupported_scope' && item.action !== 'find_local_source') errors.push(`${item.clusterId}: unsupported scope was not kept local`);
}
for (const item of report.metrics || []) {
  if (!item.id || !item.status || !Number.isInteger(item.configuredFeedCount)) errors.push('metric readiness record is incomplete');
  if (item.status === 'ready' && item.action !== 'none') errors.push(`${item.id}: ready metric has a non-empty action`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Coverage audit valid: ${report.clusters.length} clusters, ${report.sourceWorkCandidates.length} source-work candidates.`);
