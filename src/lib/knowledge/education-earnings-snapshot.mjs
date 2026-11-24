// Eurostat Structure of Earnings Survey 2022, Spain, retrieved 23 November 2026.
// These are gross hourly means by employees' attained education, not by the
// education required for their jobs. They are contextual evidence only.
const source = {
  id: 'eurostat-spain-ses-2022-education',
  title: 'Salario bruto medio por hora según estudios alcanzados, 2022 · Eurostat',
  publisher: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/earn_ses22_16?freq=A&sex=T&indic_se=ERN&isced11=ED0-2&isced11=ED3_4&isced11=ED5-8&sizeclas=GE10&nace_r2=B-S_X_O&unit=EUR&geo=ES&time=2022&lang=EN',
  retrievedAt: '2026-11-23',
  role: 'primary',
};

const educationLevels = [
  { code: 'ED0-2', value: 10.04 },
  { code: 'ED3_4', value: 11.48 },
  { code: 'ED5-8', value: 17.71 },
];

export const EDUCATION_EARNINGS_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-23',
  expiresAt: '2028-06-30',
  refreshCommand: 'Review the latest Eurostat Structure of Earnings Survey and refresh mean hourly earnings by education.',
  validationStatus: 'reviewed',
  asOf: '2026-11-23',
  supportedScope: 'Spain; 2022 mean gross hourly earnings for employees by highest educational attainment; all sexes; enterprises with at least 10 employees; NACE Rev. 2 B–S excluding O',
  unsupportedScope: 'education required by a job, occupation-matched pay, individual or net pay, wage distributions within education groups, or whether pay is adequate for a qualification',
  observations: educationLevels.map(({ code, value }) => ({
    id: `ses-2022-education-${code}`,
    kind: 'observation',
    dataKind: 'snapshot',
    metricId: 'mean_hourly_earnings_by_education',
    metric: 'Mean gross hourly earnings by educational attainment',
    value,
    unit: 'Euro',
    period: '2022',
    geography: 'España',
    population: 'Employees of all sexes in enterprises with at least 10 employees, in NACE Rev. 2 sections B to S excluding O',
    dimensions: {
      freq: 'A', sex: 'T', indic_se: 'ERN', isced11: code,
      sizeclas: 'GE10', nace_r2: 'B-S_X_O', unit: 'EUR', geo: 'ES', time: '2022',
    },
    source,
  })),
});
