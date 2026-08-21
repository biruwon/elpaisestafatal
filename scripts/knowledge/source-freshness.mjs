import { sourceRegistry } from './source-registry.mjs';
import { isBoeLegalDiscoveryUrl } from './refresh-utils.mjs';

const maxAgeBySchedule = Object.freeze({ hourly: 3, daily: 14, weekly: 60, monthly: 120 });
const staleActionBySchedule = Object.freeze({ hourly: 'exclude', daily: 'label-limited', weekly: 'label-limited', monthly: 'fallback-only' });

export const freshnessMaxAgeDays = (source = {}) => maxAgeBySchedule[source.schedule] || maxAgeBySchedule.daily;

export const freshnessPolicyFor = (source = {}) => {
  const schedule = scheduleFor(source);
  return { maxAgeDays: freshnessMaxAgeDays({ schedule }), staleAction: staleActionBySchedule[schedule] || 'label-limited', expectedSchedule: schedule };
};

export const freshnessDecision = (source = {}, now = Date.now()) => {
  const status = sourceFreshness(source, now);
  const policy = freshnessPolicyFor(source);
  if (status === 'fresh') return { status, action: 'use', policy };
  if (status === 'invalid') return { status, action: 'exclude', policy, reason: staleSourceReason(source, now) };
  if (policy.staleAction === 'exclude' || policy.staleAction === 'fallback-only') return { status, action: 'exclude', policy, reason: staleSourceReason(source, now) };
  return { status, action: 'label-limited', policy, reason: staleSourceReason(source, now) };
};

const scheduleFor = (source = {}) => isBoeLegalDiscoveryUrl(source.url)
  ? 'weekly'
  : source.schedule || sourceRegistry.find((item) => item.id === source.sourceRegistryId)?.schedule || 'daily';

export const sourceFreshness = (source = {}, now = Date.now()) => {
  const retrievedAt = Date.parse(source.retrievedAt || '');
  if (!Number.isFinite(retrievedAt)) return 'unknown';
  if (retrievedAt > now + 5 * 60 * 1000) return 'invalid';
  const ageDays = (now - retrievedAt) / 86_400_000;
  const schedule = scheduleFor(source);
  return ageDays <= freshnessMaxAgeDays({ schedule }) ? 'fresh' : 'stale';
};

export const staleSourceReason = (source = {}, now = Date.now()) => {
  const status = sourceFreshness(source, now);
  if (status === 'fresh') return '';
  if (status === 'invalid') return 'retrievedAt is in the future';
  if (status === 'unknown') return 'retrievedAt is missing or invalid';
  return `snapshot is older than ${freshnessMaxAgeDays({ schedule: scheduleFor(source) })} days`;
};
