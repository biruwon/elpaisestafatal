// Spanish law and a scoped AIReF projection for private-retirement-saving claims.
// A replacement rate is context, not a personal finding that private saving is
// necessary or sufficient for a particular retirement budget.
const publicContributionsSource = {
  id: 'boe-social-security-contribution-obligation',
  title: 'Ley General de la Seguridad Social · obligación de cotizar (artículo 18)',
  publisher: 'Boletín Oficial del Estado',
  url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724&p=20250430&tn=0',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

const privatePlansLawSource = {
  id: 'boe-private-pension-plans-voluntary',
  title: 'Ley de Planes y Fondos de Pensiones · voluntariedad e incorporación a planes de empleo',
  publisher: 'Boletín Oficial del Estado',
  url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2002-24252&p=20221224&tn=1',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

const airefProjectionSource = {
  id: 'airef-pension-replacement-rate-projection-2025',
  title: 'Documento técnico sobre la suficiencia, equidad y contributividad del sistema de pensiones',
  publisher: 'AIReF',
  url: 'https://www.airef.es/wp-content/uploads/2025/04/Documentos-tecnicos-segunda-opinion-sostenibilidad-a-largo-plazo-AAPP/250212_DT_microsimulacion_pensiones.pdf',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

export const PENSION_PRIVATE_SAVINGS_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-24',
  asOf: '2026-11-24',
  expiresAt: '2027-05-31',
  validationStatus: 'reviewed',
  refreshCommand: 'Re-check the consolidated laws on Social Security contributions and pension plans, including collective-agreement enrolment, and look for a newer AIReF pension-sufficiency projection.',
  supportedScope: 'Spain; statutory Social Security contribution obligation; voluntary constitution of private pension plans, including the collective-agreement automatic-enrolment and opt-out rule; AIReF modelled replacement-rate path for 2027–2050',
  unsupportedScope: 'whether private saving is economically necessary or sufficient for an individual, household or specific birth cohort; a personal net pension estimate; a required private-saving amount',
  sources: [publicContributionsSource, privatePlansLawSource, airefProjectionSource],
  publicContributionsSource,
  privatePlansLawSource,
  airefProjectionSource,
  replacementRateProjection: [
    { period: '2027', value: 72.4, unit: '%', measure: 'AIReF modelled initial-pension-to-wage-at-retirement replacement rate' },
    { period: 'from 2050', value: 70, qualifier: 'around', unit: '%', measure: 'AIReF modelled initial-pension-to-wage-at-retirement replacement rate' },
  ],
});
