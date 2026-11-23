// Eurostat EU-SILC snapshot, retrieved 2026-11-23 from ilc_mdes09.
// The published indicator is derived by adding the two response categories
// used by Eurostat's glossary definition of subjective poverty.
const source = {
  id: 'eurostat-subjective-poverty-2026-11',
  title: 'Inability to make ends meet · EU-SILC · ilc_mdes09',
  publisher: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/databrowser/view/ilc_mdes09/default/table?lang=en',
  retrievedAt: '2026-11-23T15:12:58Z',
  schedule: 'annual',
  trust: 'primary',
};

const aggregate = {
  id: 'eurostat-subjective-poverty-spain-2025',
  kind: 'observation',
  dataKind: 'snapshot',
  metricId: 'subjective_poverty_rate',
  metric: 'Población en hogares que declaran dificultad o gran dificultad para llegar a fin de mes',
  value: 20.6,
  unit: 'percent of population',
  period: '2025',
  geography: 'España',
  population: 'Personas residentes en hogares privados, clasificadas según la respuesta del hogar a la pregunta de EU-SILC sobre cubrir los gastos habituales',
  denominator: 'Población residente en hogares privados',
  dimensions: {
    freq: 'A', unit: 'PC', geo: 'ES', time: '2025', hhcomp: 'TOTAL', rskpovth: 'TOTAL',
    lev_diff: ['DIF', 'GRT'], lev_diff_values: { DIF: 12.1, GRT: 8.5 },
    calculation: '12.1 % + 8.5 % (categorías publicadas, redondeadas a una décima)',
  },
  dimensionLabels: { geo: 'Spain', time: '2025', lev_diff: 'Difficulty or great difficulty' },
  source,
};

const componentObservations = [
  ['DIF', 'subjective_poverty_difficulty_rate', 12.1, 'dificultad'],
  ['GRT', 'subjective_poverty_great_difficulty_rate', 8.5, 'gran dificultad'],
].map(([level, metricId, value, label]) => {
  const { lev_diff_values: _levels, calculation: _calculation, ...baseDimensions } = aggregate.dimensions;
  return {
    ...aggregate,
    id: `${aggregate.id}-${level.toLowerCase()}`,
    metricId,
    metric: `Población en hogares que declaran ${label} para cubrir los gastos habituales`,
    value,
    dimensions: { ...baseDimensions, lev_diff: level },
    dimensionLabels: { ...aggregate.dimensionLabels, lev_diff: label },
  };
});

export const SUBJECTIVE_POVERTY_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-23',
  expiresAt: '2027-04-30',
  refreshCommand: 'npm run knowledge:refresh',
  validationStatus: 'reviewed',
  asOf: '2026-11-23',
  supportedScope: 'España; EU-SILC ilc_mdes09; población residente en hogares privados; 2025; respuestas «con dificultad» o «con gran dificultad» agregadas como pobreza subjetiva por Eurostat',
  unsupportedScope: 'desglose por empleo o jornada, dificultad de una persona concreta, recuento de hogares, otros años en el fallback revisado y causas de la dificultad',
  observations: [aggregate, ...componentObservations],
});
