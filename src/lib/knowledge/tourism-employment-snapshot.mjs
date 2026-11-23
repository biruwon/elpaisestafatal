// INE Cuenta Satélite del Turismo, series published 22 December 2025.
// The latest period is 2024, marked by INE as an advance estimate.
const shareSource = {
  id: 'ine-tourism-employment-share-cste-2024',
  title: 'Cuenta Satélite del Turismo de España · empleo turístico, serie 2021–2024',
  publisher: 'Instituto Nacional de Estadística',
  url: 'https://www.ine.es/dyngs/Prensa/es/CSTE2024.htm',
  publishedAt: '2025-12-22',
  retrievedAt: '2026-11-23',
  role: 'primary',
};

const jobsSource = {
  id: 'ine-tourism-characteristic-jobs-2024',
  title: 'Empleo turístico · Cuenta Satélite del Turismo de España',
  publisher: 'Instituto Nacional de Estadística',
  url: 'https://www.ine.es/jaxi/Tabla.htm?tpx=72970',
  publishedAt: '2025-12-22',
  retrievedAt: '2026-11-23',
  role: 'primary',
};

const periods = [
  { period: '2021', share: 10.8, jobs: 2193.3 },
  { period: '2022', share: 12.1, jobs: 2566.6 },
  { period: '2023', share: 12.2, jobs: 2687.1, status: 'p' },
  { period: '2024', share: 12.3, jobs: 2776.7, status: 'a' },
];

export const TOURISM_EMPLOYMENT_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-23',
  expiresAt: '2026-12-21',
  refreshCommand: 'Review the annual INE Cuenta Satélite del Turismo release and refresh tourism-characteristic employment.',
  validationStatus: 'reviewed',
  asOf: '2026-11-23',
  supportedScope: 'Spain; jobs and share of total employment in tourism-characteristic economic branches; annual observations 2021–2024; 2023 provisional and 2024 advance estimate',
  unsupportedScope: 'jobs caused by tourism demand, net job creation attributable to tourism, job quality, seasonality, regional estimates, or a standard for deciding whether dependence is excessive',
  observations: periods.flatMap(({ period, share, jobs, status }) => [
    {
      id: `tourism-characteristic-employment-share-${period}`,
      kind: 'observation',
      dataKind: 'snapshot',
      metricId: 'tourism_characteristic_employment_share',
      metric: 'Employment in tourism-characteristic branches as a share of total employment',
      value: share,
      unit: 'percent',
      period,
      geography: 'España',
      population: 'Employment in economic branches characteristic of tourism',
      denominator: 'Total employment in the Spanish economy',
      dimensions: { geo: 'ES', industry_scope: 'tourism_characteristic_branches', denominator: 'total_economy_employment' },
      source: shareSource,
      ...(status ? { status } : {}),
    },
    {
      id: `tourism-characteristic-employment-jobs-${period}`,
      kind: 'observation',
      dataKind: 'snapshot',
      metricId: 'tourism_characteristic_employment_jobs',
      metric: 'Jobs in tourism-characteristic economic branches',
      value: jobs,
      unit: 'thousand jobs',
      period,
      geography: 'España',
      population: 'Jobs in economic branches characteristic of tourism',
      dimensions: { geo: 'ES', industry_scope: 'tourism_characteristic_branches' },
      source: jobsSource,
      ...(status ? { status } : {}),
    },
  ]),
});
