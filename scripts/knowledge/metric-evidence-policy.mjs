import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const registry = JSON.parse(readFileSync(fileURLToPath(new URL('../../config/metric-registry.json', import.meta.url)), 'utf8'));

const familyFor = (metricId) => String(metricId || '').replace(/_(?:europe|quarterly|monthly|annual)$/, '');
const supportsFor = (metricId) => {
  const id = String(metricId || '');
  if (id.includes('causal') || id.includes('cause')) return ['causal'];
  if (id.endsWith('_europe')) return ['comparative', 'descriptive', 'trend'];
  if (id.includes('growth') || id.includes('rate') || id.includes('index') || id.includes('share')) return ['descriptive', 'trend', 'comparative'];
  return ['descriptive', 'trend'];
};

export const metricPolicyFor = (metricId) => {
  const definition = registry[metricId];
  if (!definition) return undefined;
  return {
    metricId,
    family: definition.family || familyFor(metricId),
    requiredDimensions: Array.isArray(definition.dimensions) && definition.dimensions.length ? definition.dimensions : ['period', 'geography'],
    supportedGeographies: ['ES', 'Spain'],
    periodGranularity: definition.dimensions?.includes('quarter') ? 'quarterly' : definition.dimensions?.includes('month') ? 'monthly' : 'annual-or-source-defined',
    freshnessPolicy: { maxAgeDays: definition.freshness?.maxAgeDays || 14, staleAction: definition.freshness?.staleAction || 'label-limited', expectedSchedule: definition.freshness?.expectedSchedule || 'daily' },
    supports: definition.supports || supportsFor(metricId),
    limitations: definition.limitations || ['No resume por sí solo el estado general del país ni demuestra causalidad.'],
    population: definition.population,
    unit: definition.unit,
  };
};

export const allMetricPolicies = () => Object.keys(registry).map(metricPolicyFor).filter(Boolean);
