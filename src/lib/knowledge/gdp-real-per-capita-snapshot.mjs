// Reviewed from Eurostat's annual national-accounts API on 2026-11-23.
// The 2024 and 2025 observations are provisional. The warehouse feeds are the
// refresh path; this bounded snapshot supports deterministic text answers.
const totalGdpSource = {
  id: 'eurostat-annual-real-gdp-spain-2026-11-23',
  title: 'PIB real anual de España · Eurostat, volúmenes encadenados',
  publisher: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10_gdp?freq=A&geo=ES&na_item=B1GQ&unit=CLV20_MEUR&sinceTimePeriod=2015',
  retrievedAt: '2026-11-23T12:00:00Z',
  schedule: 'daily',
  trust: 'primary',
};

const perCapitaSource = {
  id: 'eurostat-annual-real-gdp-per-capita-spain-2026-11-23',
  title: 'PIB real por habitante en España · Eurostat, volúmenes encadenados',
  publisher: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10_pc?freq=A&geo=ES&na_item=B1GQ&unit=CLV20_EUR_HAB&sinceTimePeriod=2015',
  retrievedAt: '2026-11-23T12:00:00Z',
  schedule: 'daily',
  trust: 'primary',
};

const rows = (source, metricId, metric, unit, dimensions, values) => values.map(([year, value, status]) => ({
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
  dimensions: { freq: 'A', geo: 'ES', na_item: 'B1GQ', time: String(year), ...dimensions },
  source,
}));

export const GDP_REAL_PER_CAPITA_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-23',
  expiresAt: '2027-11-11',
  refreshCommand: 'npm run knowledge:refresh',
  validationStatus: 'reviewed',
  asOf: '2026-11-23',
  supportedScope: 'España; PIB real total y PIB real por habitante, series anuales 2019–2025; 2024 y 2025 provisionales',
  unsupportedScope: 'renta disponible o mediana de los hogares, distribución de ingresos, bienestar completo, productividad, desgloses territoriales o demográficos, causalidad y evolución de cada año',
  observations: [
    ...rows(totalGdpSource, 'gdp_real_annual', 'PIB a precios de mercado, volúmenes encadenados', 'million euro, chain-linked volumes (2020)',
      { unit: 'CLV20_MEUR' },
      [[2019, 1267926], [2020, 1129214], [2021, 1204681], [2022, 1281423], [2023, 1311664], [2024, 1359828, 'p'], [2025, 1395075, 'p']]),
    ...rows(perCapitaSource, 'gdp_real_per_capita_annual', 'PIB real por habitante', 'euro per capita, chain-linked volumes (2020)',
      { unit: 'CLV20_EUR_HAB' },
      [[2019, 26930], [2020, 23850], [2021, 25440], [2022, 26820], [2023, 27130], [2024, 27820, 'p'], [2025, 28260, 'p']]),
  ],
});
