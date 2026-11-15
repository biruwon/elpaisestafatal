// The same URL can be fetched repeatedly. Do not let a longer, older fetch
// override a newer revision of the same scoped series, or merge their values.
export const preferLatestSourceRevisions = (observations) => {
  const keyFor = (item) => {
    if (!item.source?.url || !item.source?.id || !Number.isFinite(Date.parse(item.source?.retrievedAt || ''))) return null;
    const dimensions = Object.fromEntries(Object.entries(item.dimensions || {})
      .filter(([key]) => !['time', 'period', 'year', 'anyo', 'fecha'].includes(key.toLowerCase()))
      .sort(([a], [b]) => a.localeCompare(b)));
    return JSON.stringify({ url: item.source.url, metricId: item.metricId, metric: item.metric,
      unit: item.unit, geography: item.geography, population: item.population, denominator: item.denominator,
      dataKind: item.dataKind, dimensions });
  };
  const latest = new Map();
  for (const item of observations) {
    const key = keyFor(item);
    if (!key) continue;
    const timestamp = Date.parse(item.source.retrievedAt);
    if (!latest.has(key) || timestamp > latest.get(key)) latest.set(key, timestamp);
  }
  return observations.filter((item) => {
    const key = keyFor(item);
    return !key || Date.parse(item.source.retrievedAt) === latest.get(key);
  });
};
