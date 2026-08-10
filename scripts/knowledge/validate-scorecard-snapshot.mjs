import { GOVERNMENT_SCORECARD_SNAPSHOT, snapshotScorecard } from '../../src/lib/knowledge/scorecard-snapshot.mjs';

const failures = [];
const snapshot = GOVERNMENT_SCORECARD_SNAPSHOT;
if (snapshot.schemaVersion !== '1' || !/^\d{4}-\d{2}-\d{2}$/.test(snapshot.asOf || '')) failures.push('snapshot version/asOf is invalid');
if (!snapshot.periods?.['since-2018'] || !snapshot.periods?.['current-term']) failures.push('both government comparison periods are required');
if (!Array.isArray(snapshot.metrics) || snapshot.metrics.length !== 6) failures.push('scorecard must contain exactly six fixed metrics');
const ids = new Set(snapshot.metrics?.map((metric) => metric.metricId));
if (ids.size !== 6) failures.push('scorecard metric IDs must be unique');
for (const metric of snapshot.metrics || []) {
  if (!metric.label || !metric.unit || !metric.baseline?.period || !metric.comparison?.period) failures.push(`${metric.metricId} is missing label/unit/period data`);
  if (!['improved', 'worsened', 'roughly_unchanged', 'unavailable'].includes(metric.direction)) failures.push(`${metric.metricId} has invalid direction`);
  if (!Array.isArray(metric.sourceIds) || !metric.sourceIds.length) failures.push(`${metric.metricId} has no source IDs`);
  if (metric.label.toLocaleLowerCase('es').includes('real') && metric.metricId === 'gdp_per_capita_current_prices') failures.push('nominal GDP series cannot be labelled real');
}
for (const source of snapshot.sources || []) {
  if (!source.id || !source.title || !source.publisher || !/^https:\/\//.test(source.url) || source.role !== 'primary') failures.push(`invalid scorecard source ${source.id || '(missing id)'}`);
}
const rendered = snapshotScorecard();
if (rendered.items.some((item) => typeof item.baseline?.value !== 'string' || typeof item.comparison?.value !== 'string')) failures.push('rendered scorecard values must be display-safe strings');
const regional = snapshotScorecard('since-2018', { geography: 'andalucia' });
const population = snapshotScorecard('since-2018', { population: 'jóvenes' });
if (regional.items.some((item) => item.direction !== 'unavailable') || population.items.some((item) => item.direction !== 'unavailable')) failures.push('national snapshot must fail closed for regional or population-specific requests');
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Scorecard snapshot validation passed: ${snapshot.metrics.length} metrics and ${snapshot.sources.length} primary sources.`);
