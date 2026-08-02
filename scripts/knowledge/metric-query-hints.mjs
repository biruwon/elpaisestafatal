const normalise = (value) => String(value || '')
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/ñ/g, 'n')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const metricHints = [
  { ids: ['youth_unemployment_rate'], terms: ['joven', 'juvenil', 'jovenes', 'youth', '15-24'] },
  { ids: ['government_debt_ratio'], terms: ['deuda', 'endeudamiento', 'debt'] },
];

export const preferredMetricIdsForQuery = (query) => {
  const normalized = normalise(query);
  return new Set(metricHints
    .filter((hint) => hint.terms.some((term) => normalized.includes(normalise(term))))
    .flatMap((hint) => hint.ids));
};

export const excludedMetricIdsForQuery = (query) => {
  const normalized = normalise(query);
  const youthRequested = metricHints[0].terms.some((term) => normalized.includes(normalise(term)));
  const genericUnemployment = ['paro', 'desemple', 'unemployment', 'encuentra trabajo', 'sin trabajo', 'no trabaja'].some((term) => normalized.includes(term));
  return genericUnemployment && !youthRequested ? new Set(['youth_unemployment_rate']) : new Set();
};
