// INE EPA estimates for wage earners reporting overtime in hospitality.
// The question refers to each respondent's reference week, so the quarterly
// estimates count respondents, not unique people over the whole quarter.
const source = {
  id: 'ine-epa-unpaid-overtime-2026',
  title: 'EPA · asalariados que realizan horas extra por sexo y actividad · 2026',
  publisher: 'Instituto Nacional de Estadística',
  url: 'https://www.ine.es/jaxiT3/Tabla.htm?L=0&t=79313',
  publishedAt: '2026-10-27',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

const questionnaireSource = {
  id: 'ine-epa-questionnaire-2021',
  title: 'Cuestionario de la Encuesta de Población Activa · preguntas sobre horas extraordinarias',
  publisher: 'Instituto Nacional de Estadística',
  url: 'https://www.ine.es/inebaseDYN/epa30308/docs/epacues21.pdf',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

export const UNPAID_OVERTIME_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-24',
  expiresAt: '2027-01-31',
  refreshCommand: 'Review the next INE EPA release and refresh 2026 overtime estimates by industry and payment status.',
  validationStatus: 'reviewed',
  asOf: '2026-11-24',
  supportedScope: 'Spain; wage earners in the broad hospitality industry; INE EPA estimates for reference weeks in Q1–Q3 2026; both sexes; estimates in thousands of persons',
  unsupportedScope: 'individual overtime frequency, total unpaid hours, events outside survey reference weeks, a trend before 2026, local or regional estimates, restaurants or hotels separately, and industries other than hospitality',
  source,
  questionnaireSource,
  // The active series changed to CNAE-2025 in Q1 2026. Do not sum quarterly
  // estimates: respondents can be observed in more than one quarter.
  observations: [
    { period: '2026-T1', employees: 1492.8, overtime: 69.4, unpaidOnly: 20.0, both: 6.8 },
    { period: '2026-T2', employees: 1672.3, overtime: 91.4, unpaidOnly: 30.7, both: 8.5 },
    { period: '2026-T3', employees: 1732.5, overtime: 90.0, unpaidOnly: 22.4, both: 5.3 },
  ],
});
