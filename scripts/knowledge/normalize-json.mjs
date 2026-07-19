const product = (arrays) => arrays.reduce((items, values) => items.flatMap((prefix) => values.map((value) => [...prefix, value])), [[]]);

const dimensionValues = (dimension) => {
  const index = dimension?.category?.index;
  if (Array.isArray(index)) return index;
  if (index && typeof index === 'object') return Object.entries(index).sort(([, left], [, right]) => Number(left) - Number(right)).map(([key]) => key);
  return Object.keys(dimension?.category?.label || {});
};

const valueAt = (value, position) => {
  if (Array.isArray(value)) return value[position] ?? null;
  if (value && typeof value === 'object') return value[String(position)] ?? null;
  return value ?? null;
};

const unitLabel = (payload, coordinate, dimensions) => {
  const unitIndex = dimensions.findIndex(({ id }) => id.toLowerCase() === 'unit');
  if (unitIndex < 0) return payload.unit;
  const unitDimension = payload.dimension?.[dimensions[unitIndex].id];
  const code = coordinate[unitIndex];
  return unitDimension?.category?.label?.[code] || code || payload.unit;
};

const dimensionLabels = (payload, coordinate, dimensions) => Object.fromEntries(coordinate.map((value, index) => {
  const dimension = payload.dimension?.[dimensions[index].id];
  return [dimensions[index].id, dimension?.category?.label?.[value] || value];
}));

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
    dimensionLabels: dimensionLabels(payload, coordinate, dimensions),
    value: valueAt(payload.value, position),
    unit: unitLabel(payload, coordinate, dimensions),
  }));
};

const flattenRows = (payload, source) => {
  if (!Array.isArray(payload) || !payload.every((row) => row && typeof row === 'object' && !Array.isArray(row))) return [];
  return payload.flatMap((row, rowIndex) => Array.isArray(row.Data) ? [] : Object.entries(row)
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

const periodLabel = (point) => {
  if (Number.isFinite(point?.Anyo) && Number.isFinite(point?.FK_Periodo)) return `${point.Anyo}-${String(point.FK_Periodo).padStart(2, '0')}`;
  if (Number.isFinite(point?.Anyo)) return String(point.Anyo);
  if (Number.isFinite(point?.Fecha)) return new Date(point.Fecha).toISOString().slice(0, 10);
  return undefined;
};

// INE's DATOS_TABLA endpoints return one series per row with a nested Data
// array. Treat each Data point as an observation instead of flattening the
// row's implementation fields (FK_Unidad, FK_Escala, etc.) into fake values.
const flattenIneTable = (payload, source) => {
  if (!Array.isArray(payload)) return [];
  return payload.flatMap((row, rowIndex) => {
    if (!row || typeof row !== 'object' || !Array.isArray(row.Data)) return [];
    const metric = typeof row.Nombre === 'string' ? row.Nombre.trim() : row.COD || `series-${rowIndex}`;
    return row.Data.filter((point) => point && typeof point === 'object' && typeof point.Valor === 'number' && Number.isFinite(point.Valor)).map((point, pointIndex) => ({
      id: `${source.id}-ine-${rowIndex}-${pointIndex}`,
      kind: 'observation',
      sourceId: source.id,
      datasetId: source.title,
      metric,
      value: point.Valor,
      period: periodLabel(point),
      unit: row.FK_Unidad == null ? undefined : `INE unit ${row.FK_Unidad}`,
      dimensions: {
        code: row.COD,
        series: metric,
        year: point.Anyo,
        period: point.FK_Periodo,
        dataType: point.FK_TipoDato,
      },
    }));
  });
};

const asArray = (value) => Array.isArray(value) ? value : value ? [value] : [];

// BOE's daily-summary API is a document index rather than a numeric dataset.
// Keep each publication searchable with its exact title and direct document
// URL; a document match is evidence of publication, not proof of its claims.
const flattenBoeSummary = (payload, source) => {
  const summary = payload?.data?.sumario;
  if (!summary || !Array.isArray(summary.diario)) return [];
  const period = summary.metadatos?.fecha_publicacion;
  return summary.diario.flatMap((daily) => asArray(daily.seccion).flatMap((section) => asArray(section.departamento).flatMap((department) => asArray(department.epigrafe).flatMap((epigraph) => asArray(epigraph.item).map((item) => {
    if (!item || typeof item !== 'object' || !item.identificador || !item.titulo) return null;
    return {
      id: `${source.id}-boe-${item.identificador}`,
      kind: 'official_publication',
      sourceId: source.id,
      datasetId: source.title,
      metric: String(item.titulo).trim(),
      value: null,
      period,
      url: item.url_html || item.url_xml || item.url_pdf?.texto,
      dimensions: {
        identifier: item.identificador,
        section: section.nombre,
        department: department.nombre,
        epigraph: epigraph.nombre,
      },
    };
  }).filter(Boolean)))));
};

export const normalizeJsonPayload = (payload, source) => flattenJsonStat(payload, source).concat(flattenBoeSummary(payload, source)).concat(flattenIneTable(payload, source)).concat(flattenRows(payload, source));
