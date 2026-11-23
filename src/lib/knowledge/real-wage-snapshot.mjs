// Reviewed from Eurostat's annual API series on 2026-11-23. The warehouse is
// the primary refresh path; this bounded snapshot keeps text answers available
// while the live observation feed is missing or being refreshed.
const wageSource = {
  id: 'eurostat-annual-hourly-wages-spain-2026-11-23',
  title: 'Índice anual de salarios y sueldos brutos por hora en España · Eurostat',
  publisher: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/lc_lci_r2_a?geo=ES&nace_r2=B-S&lcstruct=D11&unit=I20&sinceTimePeriod=2018',
  retrievedAt: '2026-11-23T12:00:00Z',
  schedule: 'daily',
  trust: 'primary',
};

const priceSource = {
  id: 'eurostat-annual-hicp-spain-2026-11-23',
  title: 'Índice armonizado anual medio de precios en España · Eurostat',
  publisher: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_ainr?geo=ES&coicop18=TOTAL&unit=INX_A_AVG&sinceTimePeriod=2018',
  retrievedAt: '2026-11-23T12:00:00Z',
  schedule: 'daily',
  trust: 'primary',
};

const rows = (source, metricId, metric, unit, dimensions, values) => values.map(([period, value]) => ({
  id: `${source.id}-${period}`,
  kind: 'observation',
  dataKind: 'snapshot',
  metricId,
  metric,
  value,
  unit,
  period: String(period),
  geography: 'España',
  freshness: 'fresh',
  dimensions: { freq: 'A', geo: 'ES', time: String(period), ...dimensions },
  source,
}));

export const REAL_WAGE_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-23',
  expiresAt: '2027-02-28',
  refreshCommand: 'npm run knowledge:refresh',
  validationStatus: 'reviewed',
  asOf: '2026-11-23',
  supportedScope: 'España; índices anuales 2018–2025; salarios y sueldos brutos por hora trabajada en industria, construcción y servicios; HICP medio anual, todos los productos',
  unsupportedScope: 'salarios netos, medianos, individuales o por ocupación, edad, sexo, sector o territorio; coste de vida de un hogar concreto; cambios causales o ocurridos en cada año',
  observations: [
    ...rows(wageSource, 'annual_hourly_wage_index', 'Índice anual de salarios y sueldos brutos por hora trabajada', 'Index, 2020=100',
      { unit: 'I20', nace_r2: 'B-S', lcstruct: 'D11' },
      [[2018, 94.1], [2019, 96.3], [2020, 100], [2021, 100.3], [2022, 103.4], [2023, 108.5], [2024, 112.9], [2025, 116.3]]),
    ...rows(priceSource, 'annual_hicp_index', 'Índice armonizado medio anual de precios de consumo, todos los productos', 'Annual average index',
      { unit: 'INX_A_AVG', coicop18: 'TOTAL' },
      [[2018, 81.69], [2019, 82.33], [2020, 82.05], [2021, 84.52], [2022, 91.55], [2023, 94.66], [2024, 97.38], [2025, 100]]),
  ],
});
