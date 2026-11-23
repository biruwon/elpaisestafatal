import { metricVocabulary } from './measurement-definitions.generated.mjs';

const metricDefinitions = new Map(metricVocabulary.map((metric) => [metric.id, metric]));

export const dimensionConstraintsForMetric = (metricId) => metricDefinitions.get(metricId)?.dimensionConstraints || {};

// A metric ID describes one measurement. When a source table carries several
// indicators under one response, require the source dimension that identifies
// that measurement; missing codes stay unknown and cannot be treated as a fit.
export const metricDimensionContractFits = (observation) => Object.entries(dimensionConstraintsForMetric(observation?.metricId))
  .every(([dimension, expected]) => String(observation?.dimensions?.[dimension] ?? '') === String(expected));
