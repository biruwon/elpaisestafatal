// Official Spanish pension-age rules and published observed/projected ages.
// Legal eligibility, the mean age of pension access, and cohort forecasts are
// different measures and must never be presented as interchangeable.
const statutorySource = {
  id: 'boe-social-security-retirement-age',
  title: 'Ley General de la Seguridad Social · edad ordinaria de jubilación',
  publisher: 'Boletín Oficial del Estado',
  url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724&p=20250430&tn=0',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

const currentRulesSource = {
  id: 'social-security-retirement-age-rules-2026',
  title: 'Pensión de jubilación · requisitos de edad y cotización para 2026',
  publisher: 'Ministerio de Inclusión, Seguridad Social y Migraciones',
  url: 'https://prestaciones.seg-social.es/servicio/pension-jubilacion.html?categoria=jubilacion',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

const observedAgeSource = {
  id: 'social-security-effective-retirement-age-2026',
  title: 'Altas de jubilación y edad media de acceso · septiembre de 2026',
  publisher: 'Ministerio de Inclusión, Seguridad Social y Migraciones',
  url: 'https://revista.seg-social.es/-/la-pension-media-del-sistema-de-la-seguridad-social-alcanza-los-1.376-1-euros-en-octubre-un-4-6-mas-alta-que-hace-un-ano?redirect=/',
  publishedAt: '2026-10-27',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

const projectionSource = {
  id: 'airef-effective-retirement-age-projection-2025',
  title: 'Metodología del modelo de gasto en pensiones · Documento técnico 3/25',
  publisher: 'AIReF',
  url: 'https://www.airef.es/wp-content/uploads/2025/04/Documentos-tecnicos-segunda-opinion-sostenibilidad-a-largo-plazo-AAPP/250225_DT_metodologia_pensiones.pdf',
  publishedAt: '2025-04-24',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

export const RETIREMENT_AGE_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-24',
  expiresAt: '2026-12-31',
  refreshCommand: 'Review the next Social Security monthly release for the mean age of new retirement-pension access and check for updated AIReF retirement-age projections or legal amendments.',
  validationStatus: 'reviewed',
  asOf: '2026-11-24',
  supportedScope: 'Spain; ordinary statutory retirement-age schedule for 2026 and from 2027; mean age of access to Social Security retirement pensions through September 2026 compared with 2019; AIReF effective-age projection for 2024–2035',
  unsupportedScope: 'the age at which today’s young people will retire, a requirement to keep working until pension eligibility, the proportion who will retire near 70, individual projections, or a cohort-specific effective retirement age',
  sources: [statutorySource, currentRulesSource, observedAgeSource, projectionSource],
  statutorySchedule: [
    { period: '2026', contributionThreshold: '38 years and 3 months', lessThanThreshold: '66 years and 10 months', atLeastThreshold: '65 years' },
    { period: '2027 onward', contributionThreshold: '38 years and 6 months', lessThanThreshold: '67 years', atLeastThreshold: '65 years' },
  ],
  observedMeanAge: [
    { period: '2019', value: 64.4, unit: 'years', measure: 'mean age of access to a Social Security retirement pension' },
    { period: 'through September 2026', value: 65.4, unit: 'years', measure: 'mean age of access to new Social Security retirement pensions' },
  ],
  effectiveAgeProjection: [
    { period: '2024', value: 65.2, unit: 'years', measure: 'projected effective retirement age, total' },
    { period: '2030', value: 66.0, unit: 'years', measure: 'projected effective retirement age, total' },
    { period: '2035', value: 66.2, unit: 'years', measure: 'projected effective retirement age, total' },
  ],
  statutorySource,
  currentRulesSource,
  observedAgeSource,
  projectionSource,
});
