import { loadMetricRegistry } from './metric-registry.mjs';

const registry = await loadMetricRegistry();
const errors = [];
for (const [id, metric] of Object.entries(registry)) {
  if (!/^[a-z][a-z0-9_]+$/.test(id)) errors.push(`${id}: invalid metric id`);
  if (!metric || typeof metric.name !== 'string' || !metric.name.trim()) errors.push(`${id}: missing name`);
  if (!Array.isArray(metric.aliases) || !metric.aliases.length || metric.aliases.some((item) => typeof item !== 'string' || !item.trim())) errors.push(`${id}: aliases must be non-empty strings`);
  if (typeof metric.unit !== 'string' || !metric.unit.trim()) errors.push(`${id}: missing unit`);
  if (typeof metric.population !== 'string' || !metric.population.trim()) errors.push(`${id}: missing population definition`);
  if (!Array.isArray(metric.dimensions) || !metric.dimensions.length || metric.dimensions.some((item) => typeof item !== 'string' || !item.trim())) errors.push(`${id}: dimensions must be non-empty strings`);
  if (!Array.isArray(metric.notEquivalentTo) || metric.notEquivalentTo.some((item) => typeof item !== 'string' || item === id)) errors.push(`${id}: invalid notEquivalentTo list`);
  for (const other of metric.notEquivalentTo || []) if (!registry[other]) errors.push(`${id}: notEquivalentTo references missing metric ${other}`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Metric registry valid: ${Object.keys(registry).length} canonical metrics.`);
