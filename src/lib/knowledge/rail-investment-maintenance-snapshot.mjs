import { requestedGeographyScopes } from './geography-scope.mjs';

const adifSource = {
  id: 'adif-rail-investment-maintenance-2023',
  title: 'Adif bate récord histórico de inversiones en la red convencional en 2023',
  publisher: 'ADIF',
  url: 'https://www.adif.es/w/adif-bate-r%C3%A9cord-hist%C3%B3rico-de-inversiones-en-la-red-convencional-en-2023-1.430-millones-de-euros-1-7-veces-lo-ejecutado-en-2022',
  retrievedAt: '2026-11-25',
  role: 'primary',
};

const format = (value) => new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  useGrouping: 'always',
}).format(value);

const normalize = (value) => String(value || '').toLocaleLowerCase('es')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n');

const railInvestmentMaintenanceSnapshotFits = (claim) => {
  const text = normalize(claim);
  if (!/\b(?:ferroviar\w*|adif|ave|alta velocidad|cercanias|red convencional|trenes?)\b/.test(text)) return false;
  if (!/\b(?:inversion\w*|invert\w*|invirt\w*|gasto\w*|presupuest\w*|nuevas? lineas?|obras|construcc\w*|inaugur\w*)\b/.test(text)) return false;
  if (!/\b(?:manten\w*|conserv\w*|descuid\w*|abandon\w*|red convencional|cercanias)\b/.test(text)) return false;
  if (!/\b(?:mientras|frente a|menos|mas|mayor|menor|prioriz\w*|atencion|politic\w*|descuid\w*|abandon\w*|inaugur\w*)\b/.test(text)) return false;
  if (/\b(?:rodalies|metro|tranvia|media distancia|mercancias|puntual\w*|retras\w*|cancel\w*|pasajer\w*)\b/.test(text)) return false;
  const years = [...text.matchAll(/\b20\d{2}\b/g)].map(([year]) => year);
  if (years.some((year) => year !== '2023')) return false;
  if (/\b(?:desde|cada vez|cada ano|ultim\w* anos|tendencia|evoluci\w*|ha aumentado|ha crecido|ha bajado|ha caido|en el futuro)\b/.test(text)) return false;
  return requestedGeographyScopes(claim).every(({ id }) => id === 'ES');
};

const investmentByNetwork = `En España, en 2023, ADIF y ADIF AV ejecutaron ${format(1_429.8)} millones de euros en la red convencional y ${format(1_974.5)} millones en nuevas líneas y alta velocidad en explotación; ADIF calificó de récord la inversión convencional.`;
const maintenanceByNetwork = `En conservación y mantenimiento, el gasto de explotación fue ${format(974.3)} millones de euros: ${format(600.6)} en la red convencional y ${format(373.7)} en alta velocidad, sin IVA.`;

const investmentDimensions = {
  subject: 'inversión ejecutada en red convencional frente a nuevas líneas y red de alta velocidad en explotación',
  population: 'red ferroviaria gestionada por ADIF y ADIF AV',
  period: '2023',
  geography: 'España',
  denominator: 'importes totales ejecutados; no están normalizados por kilómetros, uso ni estado de los activos',
  unit: 'millones de euros, sin IVA',
};
const maintenanceDimensions = {
  ...investmentDimensions,
  subject: 'gastos de explotación en conservación y mantenimiento de las redes convencional y de alta velocidad',
  denominator: 'gasto total registrado; no está normalizado por kilómetros, tráfico ni necesidad de conservación',
};

export const RAIL_INVESTMENT_MAINTENANCE_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-25',
  asOf: '2026-11-25',
  expiresAt: '2027-10-31',
  refreshCommand: 'Revisar las cuentas y notas oficiales más recientes de ADIF y ADIF AV; separar inversión ejecutada de gastos de explotación en conservación, y confirmar red, ejercicio e IVA antes de sustituir este corte.',
  validationStatus: 'reviewed',
  territories: ['ES'],
  supportedScope: 'Contexto de inversión ejecutada y gasto de explotación en conservación y mantenimiento de redes ferroviarias de España durante 2023, según la nota de ADIF.',
  unsupportedScope: 'suficiencia del mantenimiento, estado o necesidad de renovación de activos, prioridad política, comparación de decisiones de inauguración, gasto por kilómetro o pasajero, evolución temporal, regiones o servicios concretos, puntualidad y retrasos.',
  when: railInvestmentMaintenanceSnapshotFits,
  directClaimEvidence: false,
  evidenceLabel: 'Inversión y mantenimiento ferroviario · España, 2023',
  dimensions: investmentDimensions,
  facts: [investmentByNetwork, maintenanceByNetwork],
  factSourceIds: [[adifSource.id], [adifSource.id]],
  factDimensions: [investmentDimensions, maintenanceDimensions],
  sources: [adifSource],
});

export const railInvestmentMaintenanceReply = ({ facts }) => [
  facts[0],
  facts[1],
  'Son partidas distintas: los totales no indican si el mantenimiento era suficiente ni qué prioridad recibió cada red. Para evaluarlo hay que comparar kilómetros, tráfico, estado y necesidades de conservación.',
].join('\n\n');
