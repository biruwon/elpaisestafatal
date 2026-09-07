const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
// Reject explicit contradictions before any broad-context composition. An
// unknown dimension stays unknown; it is never repaired with a nearby row.
export const broadObservationFits = (observation, criterion) => {
  if (!criterion.metricIds?.includes(observation.metricId) || !Number.isFinite(observation.value) || typeof observation.value !== 'number') return false;
  if (!observation.period) return false;
  const geography = normalize(observation.dimensions?.geo || observation.geography);
  if (geography && !['es', 'espana', 'spain'].includes(geography)) return false;
  const unit = normalize(observation.unit || observation.dimensionLabels?.unit);
  const metric = observation.metricId;
  if (/_index$/.test(metric) && /percent|porcent|%|rate|tasa/.test(unit)) return false;
  if (/_ratio$/.test(metric) && /million euro|millones de euros|^eur$/.test(unit)) return false;
  if (metric === 'hospital_beds_per_100k' && /^(number|person|people|camas|numero)$/.test(unit)) return false;
  if (metric === 'median_hourly_earnings' && /mensual|annual|anual|month/.test(unit)) return false;
  if (metric === 'youth_unemployment_rate') {
    const age = observation.dimensions?.age;
    if (age && !['Y15-24', 'Y16-24', 'Y_LT25', 'Y15-29', 'Y16-29'].includes(age)) return false;
  }
  for (const [key, expected] of Object.entries(criterion.requiredDimensions || {})) {
    if (observation.dimensions?.[key] !== undefined && observation.dimensions[key] !== expected) return false;
  }
  return true;
};
