const normalise = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n');

const groupLabel = (item) => item?.dimensions?.group || item?.dimensionLabels?.group || item?.population || '';
const periodLabel = (item) => item?.period || item?.dimensions?.period || item?.dimensionLabels?.period || '';
const geographyLabel = (item) => item?.geography || item?.dimensions?.geo || item?.dimensionLabels?.geo || '';

export const compareGroupObservations = (observations = []) => {
  const numeric = observations.filter((item) => typeof item.value === 'number' && Number.isFinite(item.value) && groupLabel(item));
  const buckets = new Map();
  for (const item of numeric) {
    const key = `${periodLabel(item)}|${geographyLabel(item)}|${item.metricId || item.metric || ''}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(item);
  }
  for (const [key, items] of buckets) {
    const groups = [...new Map(items.map((item) => [normalise(groupLabel(item)), item])).values()];
    if (groups.length < 2) continue;
    const [left, right] = groups.sort((a, b) => b.value - a.value);
    return { key, left, right, difference: left.value - right.value, ratio: right.value ? left.value / right.value : null, comparable: true };
  }
  return { comparable: false };
};
