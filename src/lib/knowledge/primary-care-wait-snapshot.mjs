// Reviewed from the Ministry of Health's second-wave 2026 workbook and
// technical note. The rate and mean use different respondent bases.
const source = {
  id: 'sanidad-primary-care-2026-wave2',
  title: 'Barómetro Sanitario 2026, segunda oleada: cita y demora de atención primaria',
  publisher: 'Ministerio de Sanidad',
  url: 'https://www.sanidad.gob.es/estadEstudios/estadisticas/BarometroSanitario/Barom_Sanit_2026/2Oleada/2026_CIS_2_OLA_3574multi.xlsx',
  retrievedAt: '2026-11-23',
  schedule: 'monthly',
  trust: 'primary',
};

const population = 'personas adultas que consultaron por un problema propio con medicina de familia pública en los últimos 12 meses, excluida mutualidad con atención privada';
const common = {
  kind: 'observation',
  dataKind: 'snapshot',
  period: '2026-O2',
  geography: 'España',
  freshness: 'fresh',
  source,
};

export const PRIMARY_CARE_WAIT_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-23',
  expiresAt: '2027-02-28',
  refreshCommand: 'npm run knowledge:refresh',
  validationStatus: 'reviewed',
  asOf: '2026-11-23',
  supportedScope: 'España; Barómetro Sanitario 2026, segunda oleada; adultos que usaron medicina de familia pública por un problema propio en los 12 meses anteriores; porcentaje de la base de la pregunta 5c y demora media solo entre quienes esperaron más de un día porque no había cita anterior',
  unsupportedScope: 'espera en cada centro o comunidad autónoma; atención especializada, cirugía o urgencias; experiencia de personas menores o atendidas fuera de medicina de familia pública; una regla universal para determinar si una espera es excesiva; efectos causales sobre el uso de urgencias; tendencia entre oleadas',
  observations: [
    {
      ...common,
      id: 'sanidad-primary-care-2026-wave2-primary-care-unavailable',
      metricId: 'primary_care_wait_over_one_day_rate',
      metric: 'Espera superior a un día por falta de cita en atención primaria',
      value: 71.97411214663927,
      unit: '%',
      population,
      denominator: 'pacientes de la base de la pregunta 5c',
      dimensions: { service: 'primary_care', surveyYear: '2026', surveyWave: '2', provisional: true, question: '5c', sampleSize: 2020 },
    },
    {
      ...common,
      id: 'sanidad-primary-care-2026-wave2-primary-care-delay',
      metricId: 'primary_care_wait_days',
      metric: 'Demora media declarada entre quienes esperaron más de un día por falta de cita',
      value: 9.71,
      unit: 'días',
      population: `${population}; solo quienes esperaron más de un día por falta de cita`,
      denominator: 'personas de la pregunta 5c_01 con respuesta válida en días',
      dimensions: { service: 'primary_care', surveyYear: '2026', surveyWave: '2', provisional: true, question: '5c_01', eligibleSampleSize: 1454, validResponseSampleSize: 1417 },
    },
  ],
});
