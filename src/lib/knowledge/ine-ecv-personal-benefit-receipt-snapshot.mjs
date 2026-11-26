// Derived from the public ECV 2025 microdata. Income components in this
// survey refer to 2024. The calculation uses only person-level income fields
// in the P file; household-file transfers are deliberately excluded.
const source = {
  id: 'ine-ecv-2025-personal-benefit-receipt',
  title: 'Encuesta de Condiciones de Vida 2025 · microdatos transversales',
  publisher: 'INE',
  url: 'https://www.ine.es/ftp/microdatos/ecv/ecv_b2013/datos_2025.zip',
  retrievedAt: '2026-11-26',
  schedule: 'yearly',
  trust: 'primary',
  archiveSha256: 'bf4f2751ac247957f6edcf02cfd85a3931785b0932b1291e8972a33ad490f617',
};
const methodologySource = {
  id: 'ine-ecv-2025-design-register',
  title: 'INE · Diseño de registro de la Encuesta de Condiciones de Vida 2025',
  publisher: 'INE',
  url: 'https://www.ine.es/metodologia/t25/dise%C3%B1o_registro_ecv.pdf',
  retrievedAt: '2026-11-26',
  trust: 'primary',
};

const benefitComponents = [
  'PY090N unemployment benefits',
  'PY100N old-age benefits',
  'PY110N survivor benefits',
  'PY120N sickness benefits',
  'PY130N disability benefits',
];
const population = 'personas representadas de 16 años o más; la respuesta cuenta si el fichero personal declara un importe positivo en una de las cinco prestaciones incluidas';
const denominator = 'personas de 16 años o más del mismo grupo, ponderadas con el factor personal transversal PB040';
const makeObservation = ({ id, metricId, groupKind, group, value, sampleSize, weightedPopulation, weightedRecipients }) => ({
  id,
  kind: 'observation',
  dataKind: 'snapshot',
  metricId,
  metric: 'Personas de 16 años o más con ingresos personales positivos en prestaciones seleccionadas',
  value,
  unit: 'percent',
  period: '2024',
  geography: 'España',
  population,
  denominator,
  dimensions: {
    geo: 'ES',
    unit: 'PC',
    groupKind,
    group,
    surveyYear: '2025',
    incomeReferenceYear: '2024',
    denominator: 'PB040; personas de 16 años o más del mismo grupo',
    benefitComponents,
    unweightedSampleSize: sampleSize,
    weightedPopulation,
    weightedRecipients,
    ageAdjusted: false,
    sourceDefinition: 'Cualquier valor positivo en PY090N, PY100N, PY110N, PY120N o PY130N; se excluyen variables del fichero de hogares.',
  },
  freshness: 'fresh',
  source,
});

export const INE_ECV_PERSONAL_BENEFIT_RECEIPT_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-26',
  expiresAt: '2027-11-30',
  refreshCommand: 'node scripts/knowledge/derive-ecv-personal-benefit-rates.mjs --input <INE ECV 2025 archive.zip>',
  validationStatus: 'reviewed',
  asOf: '2026-11-26',
  supportedScope: 'España; personas representadas de 16 años o más; cinco prestaciones con ingreso individual observado en ECV 2025, referidas a 2024; tasas ponderadas separadas por lugar de nacimiento y nacionalidad.',
  unsupportedScope: 'todas las ayudas públicas, cuantías o gasto por persona, elegibilidad o concesión de un programa, hogares que reciben prestaciones registradas a nivel de hogar, tasas ajustadas por edad, causalidad o balance fiscal.',
  methodology: 'Estimación propia reproducible desde el fichero P (personas) y el fichero R (nacionalidad y lugar de nacimiento). El numerador cuenta personas con importe positivo en PY090N, PY100N, PY110N, PY120N o PY130N; el denominador usa PB040. Se agrupan por separado las categorías españolas y extranjeras de nacimiento y nacionalidad. No se mezclan los componentes HY del fichero H.',
  methodologySource,
  observations: [
    makeObservation({
      id: 'ine-ecv-2025-birthplace-spain-personal-benefits',
      metricId: 'ecv_selected_personal_benefit_receipt_rate_by_birthplace',
      groupKind: 'birthplace',
      group: 'born_in_spain',
      value: 39.21,
      sampleSize: 52889,
      weightedPopulation: 33625817.28,
      weightedRecipients: 13185815.94,
    }),
    makeObservation({
      id: 'ine-ecv-2025-birthplace-abroad-personal-benefits',
      metricId: 'ecv_selected_personal_benefit_receipt_rate_by_birthplace',
      groupKind: 'birthplace',
      group: 'born_abroad',
      value: 24.45,
      sampleSize: 7267,
      weightedPopulation: 8247304.71,
      weightedRecipients: 2016263.30,
    }),
    makeObservation({
      id: 'ine-ecv-2025-nationality-spanish-personal-benefits',
      metricId: 'ecv_selected_personal_benefit_receipt_rate_by_nationality',
      groupKind: 'nationality',
      group: 'spanish_nationality',
      value: 38.59,
      sampleSize: 56186,
      weightedPopulation: 36202201.54,
      weightedRecipients: 13971629.38,
    }),
    makeObservation({
      id: 'ine-ecv-2025-nationality-foreign-personal-benefits',
      metricId: 'ecv_selected_personal_benefit_receipt_rate_by_nationality',
      groupKind: 'nationality',
      group: 'foreign_nationality',
      value: 21.70,
      sampleSize: 3970,
      weightedPopulation: 5670920.46,
      weightedRecipients: 1230449.86,
    }),
  ],
});
