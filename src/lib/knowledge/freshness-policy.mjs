const maxAgeBySchedule = Object.freeze({
  hourly: 3,
  daily: 14,
  weekly: 60,
  monthly: 120,
  quarterly: 210,
  semiannual: 240,
  yearly: 450,
});

const staleActionBySchedule = Object.freeze({
  hourly: 'exclude',
  daily: 'label-limited',
  weekly: 'label-limited',
  monthly: 'fallback-only',
  quarterly: 'label-limited',
  semiannual: 'label-limited',
  yearly: 'label-limited',
});

export const isBoeLegalDiscoveryUrl = (value) => {
  try {
    const url = new URL(String(value));
    return (url.hostname === 'boe.es' || url.hostname.endsWith('.boe.es')) && url.pathname.includes('/legislacion-consolidada/');
  } catch {
    return false;
  }
};

export const freshnessScheduleFor = (source = {}, registry = []) => isBoeLegalDiscoveryUrl(source.url)
  ? 'weekly'
  : source.schedule || registry.find((item) => item.id === source.sourceRegistryId)?.schedule || 'daily';

export const freshnessMaxAgeDays = (value) => {
  const schedule = typeof value === 'string' ? value : value?.schedule;
  return maxAgeBySchedule[schedule] || maxAgeBySchedule.daily;
};

export const staleActionForSchedule = (schedule) => staleActionBySchedule[schedule] || 'label-limited';

export const sourceFreshness = (source = {}, now = Date.now(), registry = []) => {
  const retrievedAt = Date.parse(source.retrievedAt || '');
  if (!Number.isFinite(retrievedAt)) return 'unknown';
  if (retrievedAt > now + 5 * 60_000) return 'invalid';
  const schedule = freshnessScheduleFor(source, registry);
  return (now - retrievedAt) / 86_400_000 <= freshnessMaxAgeDays(schedule) ? 'fresh' : 'stale';
};

export const staleSourceReason = (source = {}, now = Date.now(), registry = []) => {
  const status = sourceFreshness(source, now, registry);
  if (status === 'fresh') return '';
  if (status === 'invalid') return 'retrievedAt is in the future';
  if (status === 'unknown') return 'retrievedAt is missing or invalid';
  return `snapshot is older than ${freshnessMaxAgeDays(freshnessScheduleFor(source, registry))} days`;
};
