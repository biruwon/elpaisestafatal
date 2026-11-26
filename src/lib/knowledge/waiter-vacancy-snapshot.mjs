// Eurostat experimental occupation-level job-vacancy estimates for Spain.
// The source has no economic-activity dimension, and 2024 is flagged as a
// break in the series; this snapshot must not be used to infer a trend.
const source = {
  id: 'eurostat-experimental-waiter-vacancies-2024',
  title: 'Job vacancy statistics by occupation and NUTS 1 region · Eurostat experimental data',
  publisher: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/jvs_a_isco3_r1?geo=ES&geo=ES1&geo=ES2&geo=ES3&geo=ES4&geo=ES5&geo=ES6&geo=ES7&freq=A&isco08=OC513&indic_em=JOBVAC&unit=THS&sinceTimePeriod=2023',
  retrievedAt: '2026-11-26',
  role: 'primary',
};
const methodologySource = {
  id: 'eurostat-job-vacancies-occupation-methodology',
  title: 'Job vacancy statistics by occupation and NUTS 1 region · Eurostat metadata',
  publisher: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/cache/metadata/EN/jvs_a_isco3_r1_esmsip2.htm',
  retrievedAt: '2026-11-26',
  role: 'methodology',
};

const observation = (year, value, status) => ({
  id: `eurostat-waiter-vacancies-${year}`,
  kind: 'observation',
  dataKind: 'snapshot',
  metricId: 'experimental_job_vacancies_waiters',
  metric: 'Experimental annual estimate of job vacancies for waiters and bartenders in Spain',
  value,
  unit: 'thousand posts',
  period: String(year),
  geography: 'España',
  population: 'Eurostat experimental estimate for ISCO-08 OC513 (waiters and bartenders) across economic activities in Spain',
  denominator: 'Not a rate; estimated number of vacant posts in thousands',
  dimensions: { freq: 'A', geo: 'ES', isco08: 'OC513', indic_em: 'JOBVAC', unit: 'THS' },
  ...(status ? { status } : {}),
  source,
});

export const WAITER_VACANCY_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-26',
  expiresAt: '2027-02-18',
  refreshCommand: 'Review Eurostat jvs_a_isco3_r1 for Spain, occupation OC513, indicator JOBVAC and update values/flags; do not compare across a break in series.',
  validationStatus: 'reviewed',
  asOf: '2026-11-26',
  supportedScope: 'Spain; national annual experimental estimates of vacant posts for ISCO-08 occupation OC513 (waiters and bartenders), 2023–2024; the dataset also provides NUTS 1 regions, but the Spanish regional cells for this occupation are confidential',
  unsupportedScope: 'hospitality-only vacancies, public regional counts for Spanish OC513 in 2023–2024, sub-NUTS-1 location counts, offered wages or schedules, applicant supply, why vacancies exist, and temporal comparison across the 2024 break',
  methodologySource,
  regionalAvailability: Object.freeze({
    geographies: Object.freeze(['ES1', 'ES2', 'ES3', 'ES4', 'ES5', 'ES6', 'ES7']),
    periods: Object.freeze(['2023', '2024']),
    status: 'C',
    statusMeaning: 'Confidential; no public numeric value',
  }),
  observations: [
    observation(2023, 4.73),
    observation(2024, 5.12, 'b'),
  ],
});
