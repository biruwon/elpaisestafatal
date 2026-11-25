import { sourceRegistry } from './source-registry.mjs';
import { freshnessMaxAgeDays, freshnessScheduleFor, sourceFreshness as sharedSourceFreshness, staleActionForSchedule, staleSourceReason as sharedStaleSourceReason } from '../../src/lib/knowledge/freshness-policy.mjs';

export { freshnessMaxAgeDays };
export const sourceFreshness = (source = {}, now = Date.now()) => sharedSourceFreshness(source, now, sourceRegistry);
export const staleSourceReason = (source = {}, now = Date.now()) => sharedStaleSourceReason(source, now, sourceRegistry);

export const freshnessPolicyFor = (source = {}) => {
  const schedule = freshnessScheduleFor(source, sourceRegistry);
  return { maxAgeDays: freshnessMaxAgeDays(schedule), staleAction: staleActionForSchedule(schedule), expectedSchedule: schedule };
};

export const freshnessDecision = (source = {}, now = Date.now()) => {
  const status = sourceFreshness(source, now, sourceRegistry);
  const policy = freshnessPolicyFor(source);
  if (status === 'fresh') return { status, action: 'use', policy };
  if (status === 'invalid') return { status, action: 'exclude', policy, reason: staleSourceReason(source, now, sourceRegistry) };
  if (policy.staleAction === 'exclude' || policy.staleAction === 'fallback-only') return { status, action: 'exclude', policy, reason: staleSourceReason(source, now, sourceRegistry) };
  return { status, action: 'label-limited', policy, reason: staleSourceReason(source, now, sourceRegistry) };
};
