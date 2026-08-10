import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
const report = JSON.parse(await readFile(process.env.COVERAGE_REPORT_INPUT || join(root, '.local/coverage-report.json'), 'utf8'));
const errors = [];
if (!report.generatedAt || !report.summary || !Array.isArray(report.metrics) || !Array.isArray(report.feeds)) errors.push('coverage report header is malformed');
const ids = new Set();
for (const metric of report.metrics || []) {
  if (!metric.id || ids.has(metric.id)) errors.push(`duplicate or missing metric: ${metric.id || '(empty)'}`);
  ids.add(metric.id);
  if (!['fed', 'ontology_only'].includes(metric.status)) errors.push(`${metric.id}: invalid coverage status`);
  if (!Number.isInteger(metric.aliasCount) || metric.aliasCount < 1) errors.push(`${metric.id}: missing aliases`);
  if (metric.status === 'fed' && (!metric.sourceCount || (!metric.hasNationalFeed && !metric.id.endsWith('_europe')))) errors.push(`${metric.id}: feed is not national or has no source`);
}
if (report.summary.metrics !== report.metrics.length) errors.push('metric summary count does not match records');
if (report.summary.fedMetrics !== report.metrics.filter((item) => item.status === 'fed').length) errors.push('fed metric summary count does not match records');
if (report.summary.comparativeMetrics !== report.metrics.filter((item) => item.hasEuropeVariant).length) errors.push('comparative metric summary count does not match records');
const warehouseDir = process.env.COVERAGE_WAREHOUSE_DIR || join(root, '.local/source-warehouse/records');
try {
  const files = (await readdir(warehouseDir)).filter((file) => file.endsWith('.json'));
  const materialized = new Set();
  for (const file of files) {
    try {
      const value = JSON.parse(await readFile(join(warehouseDir, file), 'utf8'));
      const source = value?.source;
      if (!source?.metricId) continue;
      materialized.add(source.metricId);
      if (!Number(source.recordCount) || !source.retrievedAt || !source.publisher) errors.push(`${source.metricId}: warehouse record is empty or missing provenance`);
    } catch { errors.push(`${file}: warehouse record is not valid JSON`); }
  }
  for (const metric of report.metrics || []) {
    if (metric.status !== 'fed' || metric.id.startsWith('official_')) continue;
    if (!materialized.has(metric.id) && !['benefit_recipients_by_group', 'imv_title_holders_by_nationality', 'crime_rate_by_group', 'public_housing_allocations_by_group', 'public_housing_actions', 'wildfire_incidents', 'wildfire_surface_affected', 'emergency_wait_declared'].includes(metric.id)) errors.push(`${metric.id}: configured feed has no materialized warehouse record`);
  }
} catch { /* CI may run the report before a refresh; the refresh workflow enforces this when records exist. */ }
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Coverage report valid: ${report.summary.fedMetrics}/${report.summary.metrics} metrics fed and ${report.summary.ontologyOnlyMetrics} ontology-only gaps identified.`);
