import { readFile } from 'node:fs/promises';

const registryPath = new URL('../../config/metric-registry.json', import.meta.url);
let registryPromise;

export const loadMetricRegistry = async () => {
  if (!registryPromise) registryPromise = readFile(registryPath, 'utf8').then((value) => JSON.parse(value));
  return registryPromise;
};

export const hasMetric = async (metricId) => Boolean(metricId && (await loadMetricRegistry())[metricId]);

export const metricDefinition = async (metricId) => (metricId ? (await loadMetricRegistry())[metricId] : undefined);
