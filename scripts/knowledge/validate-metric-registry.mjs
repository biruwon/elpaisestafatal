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
  if (metric.dimensionConstraints !== undefined && (!metric.dimensionConstraints || typeof metric.dimensionConstraints !== 'object' || Array.isArray(metric.dimensionConstraints)
    || Object.entries(metric.dimensionConstraints).some(([key, value]) => !metric.dimensions?.includes(key) || typeof value !== 'string' || !value.trim()))) {
    errors.push(`${id}: dimensionConstraints must map declared dimensions to exact non-empty values`);
  }
  if (!Array.isArray(metric.notEquivalentTo) || metric.notEquivalentTo.some((item) => typeof item !== 'string' || item === id)) errors.push(`${id}: invalid notEquivalentTo list`);
  for (const other of metric.notEquivalentTo || []) if (!registry[other]) errors.push(`${id}: notEquivalentTo references missing metric ${other}`);
  if (metric.sourceComposition !== undefined) {
    const composition = metric.sourceComposition;
    const inputMetrics = composition?.inputMetricsByDimensionValue;
    if (!composition || composition.operation !== 'sum' || !inputMetrics || typeof inputMetrics !== 'object' || Array.isArray(inputMetrics) || Object.keys(inputMetrics).length < 2) {
      errors.push(`${id}: sourceComposition must define a sum across at least two source-dimension values`);
    } else {
      for (const [value, inputMetricId] of Object.entries(inputMetrics)) {
        if (!value.trim() || typeof inputMetricId !== 'string' || !registry[inputMetricId]) errors.push(`${id}: sourceComposition references invalid input metric ${inputMetricId}`);
      }
    }
    if (typeof composition.sourceDatasetPath !== 'string' || !composition.sourceDatasetPath.startsWith('/')) errors.push(`${id}: sourceComposition requires an absolute dataset path`);
    if (!composition.requiredDimensions || typeof composition.requiredDimensions !== 'object' || Array.isArray(composition.requiredDimensions) || !Object.keys(composition.requiredDimensions).length
      || Object.entries(composition.requiredDimensions || {}).some(([name, value]) => !name.trim() || typeof value !== 'string' || !value.trim())) errors.push(`${id}: sourceComposition requires non-empty source dimension constraints`);
    if (!Array.isArray(composition.joinDimensions) || !composition.joinDimensions.length || composition.joinDimensions.some((item) => typeof item !== 'string' || !item.trim())) errors.push(`${id}: sourceComposition requires join dimensions`);
    else if (Object.keys(composition.requiredDimensions || {}).some((name) => !composition.joinDimensions.includes(name))) errors.push(`${id}: sourceComposition joinDimensions must include every constrained dimension`);
    if (!Number.isFinite(composition.maxRetrievedAtSkewHours) || composition.maxRetrievedAtSkewHours < 0) errors.push(`${id}: sourceComposition requires a non-negative retrieval-skew limit`);
  }
  if (metric.definition) {
    for (const key of ['label', 'explanation', 'numerator', 'denominator']) if (typeof metric.definition[key] !== 'string' || !metric.definition[key].trim()) errors.push(`${id}: definition requires ${key}`);
    if (!Array.isArray(metric.definition.sources) || !metric.definition.sources.length || metric.definition.sources.some((source) => !source.id || !source.title || !source.publisher || !/^https:\/\//.test(source.url) || !Number.isFinite(Date.parse(source.retrievedAt)))) errors.push(`${id}: definition requires reviewed, dated source links`);
  }
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Metric registry valid: ${Object.keys(registry).length} canonical metrics.`);
