const boeDatePattern = /\/sumario\/(\d{8})$/;

export const isBoeSummaryUrl = (value) => {
  try {
    const url = new URL(String(value));
    return url.hostname === 'www.boe.es' && boeDatePattern.test(url.pathname);
  } catch {
    return false;
  }
};

export const boeSummaryCandidates = (value, { maxDays = 7 } = {}) => {
  let url;
  try { url = new URL(String(value)); } catch { return [String(value)]; }
  const match = url.pathname.match(boeDatePattern);
  if (!match) return [url.toString()];
  const year = Number(match[1].slice(0, 4));
  const month = Number(match[1].slice(4, 6)) - 1;
  const day = Number(match[1].slice(6, 8));
  const start = new Date(Date.UTC(year, month, day));
  if (!Number.isFinite(start.getTime())) return [url.toString()];
  return Array.from({ length: Math.max(0, maxDays) + 1 }, (_, offset) => {
    const candidate = new Date(start);
    candidate.setUTCDate(candidate.getUTCDate() - offset);
    const stamp = candidate.toISOString().slice(0, 10).replaceAll('-', '');
    const next = new URL(url);
    next.pathname = url.pathname.replace(match[1], stamp);
    return next.toString();
  });
};

export const isBoeLegalDiscoveryUrl = (value) => {
  try {
    const url = new URL(String(value));
    return url.hostname.endsWith('boe.es') && url.pathname.includes('/legislacion-consolidada/');
  } catch {
    return false;
  }
};
