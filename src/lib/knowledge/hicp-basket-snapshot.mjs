// Reviewed from Eurostat's annual HICP API on 2026-11-23. The warehouse is
// the refresh path; this bounded snapshot keeps category comparisons usable
// while the live observation feed is missing or being refreshed.
const source = (id, title, coicop18) => ({
  id,
  title,
  publisher: 'Eurostat',
  url: `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_ainr?freq=A&geo=ES&coicop18=${coicop18}&unit=INX_A_AVG&sinceTimePeriod=2020`,
  retrievedAt: '2026-11-23T12:00:00Z',
  schedule: 'daily',
  trust: 'primary',
});

const totalSource = source('eurostat-annual-hicp-spain-2026-11-23', 'Índice armonizado anual medio de precios en España · Eurostat', 'TOTAL');
const foodSource = source('eurostat-annual-hicp-food-spain-2026-11-23', 'Índice armonizado anual medio de alimentos y bebidas no alcohólicas · Eurostat', 'CP01');
const rentSource = source('eurostat-annual-hicp-actual-rents-spain-2026-11-23', 'Índice armonizado anual medio de alquileres efectivamente pagados · Eurostat', 'CP041');

export const HICP_METHODOLOGY_SOURCE = Object.freeze({
  id: 'eurostat-hicp-methodology-2026-11-23',
  title: 'Harmonised Indices of Consumer Prices: information on data · Eurostat',
  publisher: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/web/hicp/information-data',
  retrievedAt: '2026-11-23T12:00:00Z',
  trust: 'primary',
  role: 'primary',
});

const rows = (source, metricId, metric, coicop18, values) => values.map(([period, value]) => ({
  id: `${source.id}-${period}`,
  kind: 'observation',
  dataKind: 'snapshot',
  metricId,
  metric,
  value,
  unit: 'Annual average index',
  period: String(period),
  geography: 'España',
  freshness: 'fresh',
  dimensions: { freq: 'A', geo: 'ES', unit: 'INX_A_AVG', coicop18, time: String(period) },
  source,
}));

export const HICP_BASKET_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-23',
  expiresAt: '2027-02-28',
  refreshCommand: 'npm run knowledge:refresh',
  validationStatus: 'reviewed',
  asOf: '2026-11-23',
  supportedScope: 'España; índices medios anuales 2020–2025; HICP de todos los productos, alimentos y bebidas no alcohólicas, y pagos efectivos de alquiler de vivienda',
  unsupportedScope: 'inflación personalizada por hogar; gasto y pesos de consumo individuales; compra de vivienda, alquiler imputado de vivienda en propiedad o coste total de vivienda',
  observations: [
    ...rows(totalSource, 'annual_hicp_index', 'Índice armonizado medio anual de precios de consumo, todos los productos', 'TOTAL', [[2020, 82.05], [2021, 84.52], [2022, 91.55], [2023, 94.66], [2024, 97.38], [2025, 100]]),
    ...rows(foodSource, 'annual_hicp_food_index', 'Índice armonizado medio anual de alimentos y bebidas no alcohólicas', 'CP01', [[2020, 74.23], [2021, 75.6], [2022, 84.4], [2023, 94.24], [2024, 97.6], [2025, 100]]),
    ...rows(rentSource, 'annual_hicp_actual_rent_index', 'Índice armonizado medio anual de alquileres efectivamente pagados', 'CP041', [[2020, 91.84], [2021, 92.38], [2022, 93.62], [2023, 95.55], [2024, 97.64], [2025, 100]]),
  ],
});
