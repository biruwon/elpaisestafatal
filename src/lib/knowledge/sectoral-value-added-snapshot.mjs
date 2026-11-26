// Reviewed from Eurostat's annual national-accounts APIs on 26 November 2026.
// 2024 and 2025 are provisional in the source tables. This short-lived snapshot
// is used only when a live warehouse series is unavailable.
const gvaSource = {
  id: 'eurostat-gva-activity-spain-2026-11-26',
  title: 'Valor añadido bruto real por actividad en España · Eurostat',
  publisher: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10_a10?freq=A&geo=ES&na_item=B1G&unit=CLV20_MEUR&sinceTimePeriod=2015',
  retrievedAt: '2026-11-26T03:38:28.454Z',
  dataUpdatedAt: '2026-11-24T23:00:00+0100',
  schedule: 'daily',
  trust: 'primary',
};

const hoursSource = {
  id: 'eurostat-employment-hours-activity-spain-2026-11-26',
  title: 'Horas trabajadas por actividad en España · Eurostat',
  publisher: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10_a10_e?freq=A&geo=ES&na_item=EMP_DC&unit=THS_HW&sinceTimePeriod=2015',
  retrievedAt: '2026-11-26T03:38:28.763Z',
  dataUpdatedAt: '2026-10-21T23:00:00+0200',
  schedule: 'daily',
  trust: 'primary',
};

const jobsSource = {
  id: 'eurostat-employment-jobs-activity-spain-2026-11-26',
  title: 'Puestos de trabajo por actividad en España · Eurostat',
  publisher: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10_a10_e?freq=A&geo=ES&na_item=EMP_DC&unit=THS_JOB&sinceTimePeriod=2015',
  retrievedAt: '2026-11-26T03:38:29.099Z',
  dataUpdatedAt: '2026-10-21T23:00:00+0200',
  schedule: 'daily',
  trust: 'primary',
};

const activityCodes = ['TOTAL', 'A', 'B-E', 'F', 'G-I', 'J', 'K', 'L', 'M_N', 'O-Q', 'R-U'];
const periods = ['2019', '2024', '2025'];
const series = [
  {
    source: gvaSource,
    metricId: 'gva_chain_volume_by_activity',
    metric: 'Gross value added by main activity, chain-linked volumes',
    unit: 'Chain linked volumes (2020), million euro',
    unitCode: 'CLV20_MEUR',
    naItem: 'B1G',
    values: [
      [1156624, 32080, 182544, 74683, 279402, 42531, 43768, 134345, 104817, 207728, 54998],
      [1244770, 33692, 185275, 67883, 293809, 57576, 48443, 151330, 129483, 224945, 53271],
      [1278038, 37699, 186472, 71947, 301349, 60391, 49906, 151723, 138752, 227861, 52888],
    ],
  },
  {
    source: hoursSource,
    metricId: 'employment_hours_by_activity',
    metric: 'Total hours worked by main activity, national accounts',
    unit: 'Thousand hours worked',
    unitCode: 'THS_HW',
    naItem: 'EMP_DC',
    values: [
      [34348535, 1506694, 4086822, 2590657, 10867392, 911392, 605510, 396008, 4312421, 6389301, 2682339],
      [36336218, 1407730, 4133121, 2701639, 11149169, 1215562, 606902, 466088, 4623849, 7345665, 2686494],
      [37063069, 1414499, 4254038, 2803780, 11241406, 1229474, 615372, 494224, 4835134, 7426719, 2748424],
    ],
  },
  {
    source: jobsSource,
    metricId: 'employment_jobs_by_activity',
    metric: 'Employment jobs by main activity, national accounts',
    unit: 'Thousand jobs',
    unitCode: 'THS_JOB',
    naItem: 'EMP_DC',
    values: [
      [21054.3, 827.6, 2431.3, 1371.7, 6242, 535.5, 355.7, 230.7, 2668.3, 4520, 1871.5],
      [22628.8, 777.7, 2476.3, 1544.9, 6530.8, 723.4, 368.4, 264.2, 2989.1, 5068.2, 1885.8],
      [23259.8, 792.2, 2572.6, 1606.5, 6696.6, 729.1, 373.6, 278.6, 3138.7, 5178.3, 1893.6],
    ],
  },
];

const observations = series.flatMap(({ source, metricId, metric, unit, unitCode, naItem, values }) => values.flatMap((row, periodIndex) => activityCodes.map((activity, activityIndex) => ({
  id: `${source.id}-${periods[periodIndex]}-${activity}`,
  kind: 'observation',
  dataKind: 'snapshot',
  metricId,
  metric,
  value: row[activityIndex],
  unit,
  period: periods[periodIndex],
  geography: 'España',
  freshness: 'fresh',
  ...(periods[periodIndex] === '2019' ? {} : { status: 'p' }),
  dimensions: { freq: 'A', unit: unitCode, nace_r2: activity, na_item: naItem, geo: 'ES', time: periods[periodIndex] },
  source,
}))));

export const SECTORAL_VALUE_ADDED_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-26',
  expiresAt: '2027-01-26',
  refreshCommand: 'npm run knowledge:refresh',
  validationStatus: 'reviewed',
  asOf: '2026-11-26',
  supportedScope: 'España; valor añadido bruto real por hora trabajada y puestos de trabajo en las diez grandes ramas NACE Rev. 2; datos anuales de 2019, 2024 y 2025; 2024 y 2025 provisionales',
  unsupportedScope: 'ocupaciones individuales, salarios o calidad del empleo, atribución causal, territorios distintos de España, años no incluidos y un umbral para decidir si la composición es excesiva',
  observations,
});
