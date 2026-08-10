export const scorecardMetrics = [
  { id: 'gdp_per_capita_real', label: 'PIB real por habitante', aliases: 'PIB real por habitante', threshold: 0.01, higher: true },
  { id: 'median_equivalised_income_real', label: 'Renta mediana disponible real', aliases: 'renta mediana ingresos hogares', threshold: 0.01, higher: true },
  { id: 'unemployment_rate', label: 'Desempleo', aliases: 'tasa de paro desempleo', threshold: 0.02, higher: false },
  { id: 'arope_rate', label: 'AROPE', aliases: 'riesgo pobreza exclusion AROPE', threshold: 0.02, higher: false },
  { id: 'housing_cost_overburden_rate', label: 'Sobrecarga del coste de vivienda', aliases: 'sobrecarga coste vivienda', threshold: 0.02, higher: false },
  { id: 'unmet_healthcare_waiting_list_rate', label: 'Necesidades sanitarias no cubiertas por listas de espera', aliases: 'lista de espera sanitaria', threshold: 0.02, higher: false },
];

export const latestGovernmentPeriod = { label: 'Gobierno nacional más reciente', aliases: ['gobierno actual', 'gobernando la izquierda', 'gobierno de izquierda'], start: '2023-11', end: undefined, geography: 'España', assumption: 'Se usa el periodo nacional más reciente; puedes indicar otras fechas.' };
export const governmentPeriods = [
  latestGovernmentPeriod,
  { label: 'Gobierno nacional 2018–2023', aliases: ['gobierno anterior', 'gobierno 2018'], start: '2018-06', end: '2023-11', geography: 'España' },
  { label: 'Gobierno nacional 2016–2018', aliases: ['gobierno 2016'], start: '2016-11', end: '2018-06', geography: 'España' },
];

export const scorecardDirection = (baseline, comparison, metric) => {
  if (!Number.isFinite(baseline) || !Number.isFinite(comparison) || baseline === 0) return 'unavailable';
  const change = (comparison - baseline) / Math.abs(baseline);
  if (Math.abs(change) < metric.threshold) return 'roughly_unchanged';
  const improved = metric.higher ? change > 0 : change < 0;
  return improved ? 'improved' : 'worsened';
};

export const makeScorecard = (observations = [], period = latestGovernmentPeriod) => ({
  type: 'scorecard',
  baseline: { label: 'Antes del periodo', period: period.start ? `último dato antes de ${period.start}` : 'último dato anterior' },
  comparison: { label: 'Último dato compatible', period: 'última observación disponible' },
  items: scorecardMetrics.map((metric) => {
    const rows = observations.filter((item) => String(item.metricId || item.metric || '').includes(metric.id));
    const baseline = rows.at(-2); const comparison = rows.at(-1);
    const direction = scorecardDirection(Number(baseline?.value), Number(comparison?.value), metric);
    return { metricId: metric.id, label: metric.label, baseline: baseline?.value != null ? { value: String(baseline.value), period: String(baseline.period || 'anterior') } : undefined, comparison: comparison?.value != null ? { value: String(comparison.value), period: String(comparison.period || 'último') } : undefined, direction, evidenceIds: [baseline?.id, comparison?.id].filter(Boolean), caveat: direction === 'unavailable' ? 'No hay dos observaciones compatibles en el almacén.' : 'La variación simultánea no demuestra qué políticas la causaron.' };
  }),
});
