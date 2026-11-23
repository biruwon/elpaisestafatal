// Reviewed from Eurostat's annual national-accounts API on 2026-11-23.
// The 2024 and 2025 productivity indices and employment-per-capita values are provisional.
const personSource = {
  id: 'eurostat-real-labour-productivity-per-person-spain-2026-11-23',
  title: 'Productividad laboral real por persona ocupada en España · Eurostat',
  publisher: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10_lp_ulc?freq=A&geo=ES&na_item=RLPR_PER&unit=I20&sinceTimePeriod=2019',
  retrievedAt: '2026-11-23T12:00:00Z',
  schedule: 'daily',
  trust: 'primary',
};

const hourSource = {
  id: 'eurostat-real-labour-productivity-per-hour-spain-2026-11-23',
  title: 'Productividad laboral real por hora trabajada en España · Eurostat',
  publisher: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10_lp_ulc?freq=A&geo=ES&na_item=RLPR_HW&unit=I20&sinceTimePeriod=2019',
  retrievedAt: '2026-11-23T12:00:00Z',
  schedule: 'daily',
  trust: 'primary',
};

const employmentSource = {
  id: 'eurostat-employment-persons-per-capita-spain-2026-11-23',
  title: 'Empleo total por habitante en España · Eurostat, cuentas nacionales',
  publisher: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10_lp_ulc?freq=A&geo=ES&na_item=EMP_HAB&unit=PC&sinceTimePeriod=2019',
  retrievedAt: '2026-11-23T12:00:00Z',
  schedule: 'daily',
  trust: 'primary',
};

const observations = (source, metricId, metric, denominator, naItem, values, unit = 'index, 2020=100', unitCode = 'I20') => values.map(([year, value, status]) => ({
  id: `${source.id}-${year}`,
  kind: 'observation',
  dataKind: 'snapshot',
  metricId,
  metric,
  value,
  unit,
  period: String(year),
  geography: 'España',
  freshness: 'fresh',
  ...(status ? { status } : {}),
  dimensions: { freq: 'A', geo: 'ES', na_item: naItem, unit: unitCode, time: String(year) },
  denominator,
  source,
}));

export const LABOUR_PRODUCTIVITY_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-23',
  expiresAt: '2027-11-11',
  refreshCommand: 'npm run knowledge:refresh',
  validationStatus: 'reviewed',
  asOf: '2026-11-23',
  supportedScope: 'España; productividad laboral real por persona ocupada y por hora trabajada (índices anuales con base 2020=100) y empleo total por habitante según cuentas nacionales; 2019–2025; 2024 y 2025 provisionales',
  unsupportedScope: 'tasa de empleo de la encuesta de población activa, productividad total de los factores, ajustes por composición o calidad del trabajo, productividad por empresa o actividad, aportación causal del empleo o de la productividad al crecimiento y desgloses demográficos',
  observations: [
    ...observations(personSource, 'real_labour_productivity_per_person', 'Real labour productivity per person employed',
      'total employment, employees and self-employed', 'RLPR_PER',
      [[2019, 107.346], [2020, 100], [2021, 103.996], [2022, 106.610], [2023, 105.825], [2024, 106.506, 'p'], [2025, 106.483, 'p']]),
    ...observations(hourSource, 'real_labour_productivity_per_hour', 'Real labour productivity per hour worked',
      'total hours worked by employees and self-employed', 'RLPR_HW',
      [[2019, 99.955], [2020, 100], [2021, 99.489], [2022, 100.725], [2023, 100.453], [2024, 101.336, 'p'], [2025, 101.923, 'p']]),
    ...observations(employmentSource, 'employment_persons_per_capita_national_accounts', 'Total employment (employed persons) per capita',
      'total population, national concept', 'EMP_HAB',
      [[2019, 43.5], [2020, 41.3], [2021, 42.4], [2022, 43.6], [2023, 44.4], [2024, 45.3, 'p'], [2025, 46, 'p']], 'percent', 'PC'),
  ],
});
