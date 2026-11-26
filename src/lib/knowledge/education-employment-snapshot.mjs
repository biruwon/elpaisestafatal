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

const recentGraduateEmploymentSource = {
  id: 'eurostat-recent-graduate-employment',
  title: 'Employment rates of young persons not in education and training by educational attainment level and years since completion of highest level of education · Eurostat',
  publisher: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/databrowser/view/edat_lfse_24/default/table?lang=en',
  retrievedAt: '2026-11-26',
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
  createdAt: '2026-11-26',
  expiresAt: '2027-04-30',
  refreshCommand: 'npm run knowledge:refresh',
  validationStatus: 'reviewed',
  asOf: '2026-11-26',
  supportedScope: 'España; observaciones anuales Eurostat de 2025; tasas de empleo y paro de residentes de 20 a 64 años con educación terciaria; sobrecualificación de personas ocupadas de 20 a 64 o de 20 a 34 años con educación terciaria; y empleo de personas de 20 a 34 años fuera de educación o formación que completaron su nivel educativo más alto 1 a 3 años antes, para ISCED 3–8, FP 35/45 y terciaria 5–8',
  unsupportedScope: 'garantía individual o calidad del empleo; tiempo hasta el primer empleo; empleo de titulados por campo de estudio; requisitos de anuncios de empleo; todos los itinerarios de FP; otros países, territorios o periodos; tendencias temporales',
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
    observation({
      id: 'recent-graduate-employment-2025',
      metricId: 'recent_graduate_employment_rate',
      metric: 'Tasa de empleo de graduados recientes con educación ISCED 3–8',
      value: 81.2,
      population: 'personas residentes de 20 a 34 años, fuera de educación o formación, que completaron su nivel educativo más alto (ISCED 3–8) entre 1 y 3 años antes de la encuesta',
      denominator: 'todas las personas de 20 a 34 años que cumplen las condiciones de educación ISCED 3–8, tiempo desde la titulación y ausencia de educación o formación',
      dimensions: { duration: 'Y1-3', unit: 'PC', age: 'Y20-34', isced11: 'ED3-8' },
      source: recentGraduateEmploymentSource,
    }),
    observation({
      id: 'recent-vocational-graduate-employment-2025',
      metricId: 'employment_rate_recent_graduates_vocational',
      metric: 'Tasa de empleo de graduados recientes de formación profesional ISCED 35 y 45',
      value: 68.8,
      population: 'personas residentes de 20 a 34 años, fuera de educación o formación, que completaron educación profesional ISCED 35 o 45 entre 1 y 3 años antes de la encuesta',
      denominator: 'todas las personas de 20 a 34 años que cumplen las condiciones de educación profesional ISCED 35 o 45, tiempo desde la titulación y ausencia de educación o formación',
      dimensions: { duration: 'Y1-3', unit: 'PC', age: 'Y20-34', isced11: 'ED35_45' },
      source: recentGraduateEmploymentSource,
    }),
    observation({
      id: 'recent-tertiary-graduate-employment-2025',
      metricId: 'employment_rate_recent_graduates_tertiary',
      metric: 'Tasa de empleo de graduados recientes con educación terciaria ISCED 5–8',
      value: 86.1,
      population: 'personas residentes de 20 a 34 años, fuera de educación o formación, que completaron educación terciaria ISCED 5–8 entre 1 y 3 años antes de la encuesta',
      denominator: 'todas las personas de 20 a 34 años que cumplen las condiciones de educación terciaria ISCED 5–8, tiempo desde la titulación y ausencia de educación o formación',
      dimensions: { duration: 'Y1-3', unit: 'PC', age: 'Y20-34', isced11: 'ED5-8' },
      source: recentGraduateEmploymentSource,
    }),
  ],
});
