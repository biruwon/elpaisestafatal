// Reviewed from the Ministry of Labour's October 2026 agreement report and
// Eurostat's annual HICP API series on 2026-11-23. The 2025 settlement figure
// is provisional; 2026 is year-to-date and is intentionally not included.
const settlementSource = {
  id: 'mites-collective-agreements-2026-10',
  title: 'Estadística de Convenios Colectivos de Trabajo · avance mensual de octubre de 2026',
  publisher: 'Ministerio de Trabajo y Economía Social',
  url: 'https://www.mites.gob.es/estadisticas/cct/cct26octav/Resumen_resultados_CCT_octubre-26.pdf',
  retrievedAt: '2026-11-23T12:00:00Z',
  schedule: 'monthly',
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

const settlementRows = [[2019, 2.24], [2020, 1.73], [2021, 1.45], [2022, 3.02], [2023, 3.61], [2024, 3.25], [2025, 3.51]];
const priceRows = [[2018, 81.69], [2019, 82.33], [2020, 82.05], [2021, 84.52], [2022, 91.55], [2023, 94.66], [2024, 97.38], [2025, 100]];

const observations = [
  ...settlementRows.map(([year, value]) => ({
    id: `collective-agreement-wage-settlement-${year}`,
    kind: 'observation', dataKind: 'snapshot', metricId: 'collective_agreement_wage_settlement_rate',
    metric: 'Variación salarial media pactada en convenios colectivos con efectos económicos conocidos y cuantificados',
    value, unit: 'Percent', period: String(year), geography: 'España',
    population: 'Personas trabajadoras afectadas por convenios registrados con efectos económicos conocidos y cuantificados',
    denominator: 'Personas trabajadoras afectadas por esos convenios',
    freshness: 'fresh', ...(year === 2025 ? { status: 'p' } : {}),
    dimensions: { freq: 'A', geo: 'ES', unit: 'PC', agreement: 'all', time: String(year), registeredCutoff: '2026-10', agreementsCount: 3162, affectedCompanies: 963590, affectedWorkers: 9578780 }, source: settlementSource,
  })),
  ...priceRows.map(([year, value]) => ({
    id: `collective-agreement-price-index-${year}`,
    kind: 'observation', dataKind: 'snapshot', metricId: 'annual_hicp_index',
    metric: 'Índice armonizado medio anual de precios de consumo, todos los productos',
    value, unit: 'Annual average index', period: String(year), geography: 'España', freshness: 'fresh',
    dimensions: { freq: 'A', geo: 'ES', unit: 'INX_A_AVG', coicop18: 'TOTAL', time: String(year) }, source: priceSource,
  })),
];

export const COLLECTIVE_AGREEMENT_WAGE_SNAPSHOT = Object.freeze({
  schemaVersion: '1', owner: 'knowledge-review', createdAt: '2026-11-23', expiresAt: '2027-02-28',
  refreshCommand: 'npm run knowledge:refresh', validationStatus: 'reviewed', asOf: '2026-11-23',
  supportedScope: 'España; variación salarial media pactada en convenios registrados con efectos económicos conocidos y cuantificados; 2019–2025; HICP medio anual de todos los productos',
  unsupportedScope: 'subidas efectivamente cobradas por cada persona; convenios o sectores concretos; salarios netos; costes de vida de hogares concretos; 2026 completo',
  observations,
});
