// Compares statutory general pension revaluations with the INE median gross
// monthly wage series for the main job. They are distinct population measures.
const sources = {
  pension2023: {
    id: 'pension-revaluation-2023',
    title: 'Real Decreto 1058/2022 · revalorización de pensiones para 2023',
    publisher: 'Boletín Oficial del Estado',
    url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2022-22694',
    publishedAt: '2022-12-28',
    retrievedAt: '2026-11-24',
    role: 'primary',
  },
  pension2024: {
    id: 'pension-revaluation-2024',
    title: 'Real Decreto-ley 8/2023 · revalorización de pensiones para 2024',
    publisher: 'Boletín Oficial del Estado',
    url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2023-26452',
    publishedAt: '2023-12-28',
    retrievedAt: '2026-11-24',
    role: 'primary',
  },
  wages: {
    id: 'ine-epa-main-job-wage-deciles-2024',
    title: 'Decil de salarios del empleo principal · EPA 2024',
    publisher: 'Instituto Nacional de Estadística',
    url: 'https://www.ine.es/dyngs/Prensa/dsEPA2024.htm',
    retrievedAt: '2026-11-24',
    role: 'primary',
  },
};

export const PENSION_INDEXATION_WAGE_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-24',
  asOf: '2026-11-24',
  expiresAt: '2027-06-30',
  validationStatus: 'reviewed',
  refreshCommand: 'Check the latest INE EPA salary-decile release and the BOE general pension revaluation percentages for the matched years.',
  supportedScope: 'Spain; 2023 and 2024 general revaluations of contributory pensions compared with the 2022–2024 EPA median gross monthly wage for the main job',
  unsupportedScope: 'individual wage or pension changes; net income; every worker or pensioner; other years; a personal comparison of purchasing power',
  sources: Object.values(sources),
  pensionRevaluations: [
    { year: 2023, value: 8.5 },
    { year: 2024, value: 3.8 },
  ],
  medianMonthlyWages: [
    { year: 2022, value: 1802.8 },
    { year: 2023, value: 1935.5 },
    { year: 2024, value: 2001.4 },
  ],
  population: 'contributory pensions covered by the general revaluation; salaried people and their gross wage in the main job as measured by the EPA',
  geography: 'España',
  unit: 'porcentaje de variación nominal y euros brutos mensuales',
  sourceIds: {
    pension2023: sources.pension2023.id,
    pension2024: sources.pension2024.id,
    wages: sources.wages.id,
  },
});
