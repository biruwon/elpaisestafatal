import { sourceRegistry } from './source-registry.mjs';

const maxAgeBySchedule = Object.freeze({ hourly: 3, daily: 14, weekly: 60, monthly: 120 });

export const freshnessMaxAgeDays = (source = {}) => maxAgeBySchedule[source.schedule] || maxAgeBySchedule.daily;

export const sourceFreshness = (source = {}, now = Date.now()) => {
  const retrievedAt = Date.parse(source.retrievedAt || '');
  if (!Number.isFinite(retrievedAt)) return 'unknown';
  if (retrievedAt > now + 5 * 60 * 1000) return 'invalid';
  const ageDays = (now - retrievedAt) / 86_400_000;
  const registrySource = sourceRegistry.find((item) => item.id === source.sourceRegistryId);
  const schedule = source.schedule || registrySource?.schedule || 'daily';
  return ageDays <= freshnessMaxAgeDays({ schedule }) ? 'fresh' : 'stale';
};

export const staleSourceReason = (source = {}, now = Date.now()) => {
  const status = sourceFreshness(source, now);
  if (status === 'fresh') return '';
  if (status === 'invalid') return 'retrievedAt is in the future';
  if (status === 'unknown') return 'retrievedAt is missing or invalid';
  return `snapshot is older than ${freshnessMaxAgeDays(source)} days`;
};
