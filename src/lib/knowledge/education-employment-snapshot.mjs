// Eurostat annual observations for Spain, retrieved from the official data API
// on 2026-11-17. These are single-year fallback observations, not trend series.
// Every 2025 value carries Eurostat's `d` flag: the definition differs from
// earlier years. The answer composer preserves that qualification.
const employmentSource = {
  id: 'eurostat-tertiary-employment',
  title: 'Employment rates by educational attainment level · Eurostat',
  publisher: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/databrowser/view/lfsa_ergaedn/default/table?lang=en',
  retrievedAt: '2026-11-17',
  schedule: 'annual',
  trust: 'primary',
};

const unemploymentSource = {
  id: 'eurostat-tertiary-unemployment',
  title: 'Unemployment rates by educational attainment level · Eurostat',
  publisher: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/databrowser/view/une_educ_a/default/table?lang=en',
  retrievedAt: '2026-11-17',
  schedule: 'annual',
  trust: 'primary',
};

const overqualificationSource = {
  id: 'eurostat-tertiary-overqualification',
  title: 'Over-qualification rates by citizenship · Eurostat',
  publisher: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/databrowser/view/lfsa_eoqgan/default/table?lang=en',
  retrievedAt: '2026-11-17',
  schedule: 'annual',
  trust: 'primary',
};

const observation = ({ id, metricId, metric, value, population, denominator, dimensions, source }) => ({
  id,
  kind: 'observation',
  dataKind: 'snapshot',
  metricId,
  metric,
  value,
  unit: 'Percentage',
  period: '2025',
  geography: 'España',
  population,
  denominator,
  dimensions: { freq: 'A', sex: 'T', geo: 'ES', time: '2025', ...dimensions },
  dimensionLabels: {
    geo: 'Spain',
    time: '2025',
    ...(dimensions.age === 'Y20-34' ? { age: 'From 20 to 34 years' } : dimensions.age === 'Y20-64' ? { age: 'From 20 to 64 years' } : {}),
  },
  status: 'd',
  freshness: 'fresh',
  source,
});

const tertiary = 'educación terciaria (ISCED 2011, niveles 5–8)';

export const EDUCATION_EMPLOYMENT_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-17',
  expiresAt: '2027-04-30',
  refreshCommand: 'npm run knowledge:refresh',
  validationStatus: 'reviewed',
  asOf: '2026-11-17',
  supportedScope: 'España; observaciones anuales Eurostat de 2025; tasas de empleo y paro de residentes de 20 a 64 años con educación terciaria, y tasa de sobrecualificación entre personas ocupadas de 20 a 64 o de 20 a 34 años con esa educación',
  unsupportedScope: 'garantía de empleo o de empleo acorde con los estudios para cada persona; recién graduados; campos de estudio; requisitos de anuncios de empleo; FP frente a universidad; otros países, territorios o periodos; tendencias temporales',
  observations: [
    observation({
      id: 'tertiary-employment-2025',
      metricId: 'employment_rate_tertiary_education',
      metric: 'Tasa de empleo de residentes con educación terciaria',
      value: 83.2,
      population: `residentes de 20 a 64 años con ${tertiary}`,
      denominator: `todas las personas residentes de 20 a 64 años con ${tertiary}`,
      dimensions: { citizen: 'TOTAL', unit: 'PC', age: 'Y20-64', isced11: 'ED5-8' },
      source: employmentSource,
    }),
    observation({
      id: 'tertiary-unemployment-2025',
      metricId: 'unemployment_rate_tertiary_education',
      metric: 'Tasa de paro de la población activa con educación terciaria',
      value: 6.4,
      population: `población activa de 20 a 64 años con ${tertiary}`,
      denominator: `personas ocupadas más desempleadas de 20 a 64 años con ${tertiary}`,
      dimensions: { unit: 'PC_ACT', age: 'Y20-64', isced11: 'ED5-8' },
      source: unemploymentSource,
    }),
    observation({
      id: 'tertiary-overqualification-2025',
      metricId: 'tertiary_overqualification_rate',
      metric: 'Tasa de sobrecualificación entre personas ocupadas con educación terciaria',
      value: 34,
      population: `personas ocupadas de 20 a 64 años con ${tertiary}`,
      denominator: `todas las personas ocupadas de 20 a 64 años con ${tertiary}`,
      dimensions: { citizen: 'TOTAL', unit: 'PC', age: 'Y20-64' },
      source: overqualificationSource,
    }),
    observation({
      id: 'tertiary-overqualification-age-20-34-2025',
      metricId: 'tertiary_overqualification_rate_age_20_34',
      metric: 'Tasa de sobrecualificación entre personas ocupadas de 20 a 34 años con educación terciaria',
      value: 34.4,
      population: `personas ocupadas de 20 a 34 años con ${tertiary}`,
      denominator: `todas las personas ocupadas de 20 a 34 años con ${tertiary}`,
      dimensions: { citizen: 'TOTAL', unit: 'PC', age: 'Y20-34' },
      source: overqualificationSource,
    }),
  ],
});
