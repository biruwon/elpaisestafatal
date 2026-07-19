const product = (arrays) => arrays.reduce((items, values) => items.flatMap((prefix) => values.map((value) => [...prefix, value])), [[]]);

const dimensionValues = (dimension) => {
  const index = dimension?.category?.index;
  if (Array.isArray(index)) return index;
  if (index && typeof index === 'object') return Object.entries(index).sort(([, left], [, right]) => Number(left) - Number(right)).map(([key]) => key);
  return Object.keys(dimension?.category?.label || {});
};

const flattenJsonStat = (payload, source) => {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.id) || !Array.isArray(payload.size) || !payload.dimension || !('value' in payload)) return [];
  const dimensions = payload.id.map((id) => ({ id, values: dimensionValues(payload.dimension[id]) }));
  const coordinates = product(dimensions.map((dimension) => dimension.values));
  return coordinates.map((coordinate, position) => ({
    id: `${source.id}-observation-${position}`,
    kind: 'observation',
    sourceId: source.id,
    datasetId: payload.label || payload.id.join('_'),
    period: coordinate[dimensions.findIndex(({ id }) => ['time', 'period', 'year'].includes(id.toLowerCase()))] || undefined,
    dimensions: Object.fromEntries(coordinate.map((value, index) => [dimensions[index].id, value])),
    value: Array.isArray(payload.value) ? payload.value[position] ?? null : payload.value,
    unit: payload.unit || payload.dimension.unit?.category?.label?.[payload.unit] || undefined,
  }));
};

const flattenRows = (payload, source) => {
  if (!Array.isArray(payload) || !payload.every((row) => row && typeof row === 'object' && !Array.isArray(row))) return [];
  return payload.flatMap((row, rowIndex) => Object.entries(row)
    .filter(([, value]) => typeof value === 'number' || value === null)
    .map(([metric, value]) => ({
      id: `${source.id}-row-${rowIndex}-${metric}`,
      kind: 'observation',
      sourceId: source.id,
      datasetId: source.title,
      metric,
      value,
      dimensions: Object.fromEntries(Object.entries(row).filter(([key, item]) => key !== metric && typeof item !== 'number' && item !== null)),
    })));
};

export const normalizeJsonPayload = (payload, source) => flattenJsonStat(payload, source).concat(flattenRows(payload, source));
