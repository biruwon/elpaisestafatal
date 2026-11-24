import { requestedGeographyScopes } from './geography-scope.mjs';

const madridPunctuality2024Source = {
  id: 'renfe-cercanias-madrid-punctuality-2024',
  title: 'Cumplimiento de compromisos de Cercanías Madrid, 2024 · puntualidad por línea',
  publisher: 'Renfe Cercanías Madrid',
  url: 'https://www.renfe.com/es/es/cercanias/cercanias-madrid/atencion-al-cliente/carta-servicios/cumplimiento-compromisos/ano-2024',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

const madridPunctuality2025Source = {
  id: 'renfe-cercanias-madrid-punctuality-2025',
  title: 'Cumplimiento de compromisos de Cercanías Madrid, 2025 · puntualidad por línea',
  publisher: 'Renfe Cercanías Madrid',
  url: 'https://www.renfe.com/es/es/cercanias/cercanias-madrid/atencion-al-cliente/carta-servicios/cumplimiento-compromisos/ano-2025',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

const lines = [
  { line: 'C1', y2024: 95.15, y2025: 98.37 },
  { line: 'C2', y2024: 95.09, y2025: 91.76 },
  { line: 'C3', y2024: 96.31, y2025: 94.29 },
  { line: 'C4a', y2024: 95.48, y2025: 94.10 },
  { line: 'C4b', y2024: 94.62, y2025: 94.11 },
  { line: 'C5', y2024: 96.86, y2025: 95.11 },
  { line: 'C7', y2024: 92.58, y2025: 89.81 },
  { line: 'C8a', y2024: 95.72, y2025: 93.17 },
  { line: 'C8b', y2024: 95.00, y2025: 91.64 },
  { line: 'C10', y2024: 96.14, y2025: 90.75 },
];

const format = (value) => new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(value);
const changes = lines.map((item) => ({ ...item, points: item.y2025 - item.y2024 }));
const declines = changes.filter((item) => item.points < 0);
const largestDecline = Math.abs(Math.min(...declines.map((item) => item.points)));
const smallestDecline = Math.abs(Math.max(...declines.map((item) => item.points)));
const improved = changes.find((item) => item.points > 0);
const lineDetails = changes.map(({ line, y2024, y2025 }) => `${line}: ${format(y2024)} % → ${format(y2025)} %`).join('; ');

const scopeForFact = {
  subject: 'porcentaje de trenes puntuales por línea',
  population: 'servicios de Cercanías Madrid en las diez líneas publicadas por Renfe',
  period: 'años naturales 2024 y 2025',
  geography: 'Cercanías Madrid; no es una estimación nacional',
  denominator: 'trenes de cada línea; los suprimidos o no circulados se consideran impuntuales',
  unit: 'porcentaje de trenes que llegaron a destino con cinco minutos o menos de retraso',
};

const normalizedClaim = (claim) => String(claim || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();
const hasMadridLineTrend = (claim) => {
  const text = normalizedClaim(claim);
  const years = new Set([...text.matchAll(/\b20\d{2}\b/g)].map(([year]) => year));
  const namesMadrid = /\b(?:madrid|madril\w*)\b/.test(text);
  const specifiesLines = /\blineas?\b/.test(text);
  const specifiesLineAggregate = /\b(?:9 de (?:las? )?10|nueve de (?:cada )?diez|mayoria|mayor parte|mas de la mitad|todas?(?: las| sus)? lineas?|cada (?:una de (?:las|sus) )?linea|las diez lineas?|10 de 10 lineas?)\b/.test(text);
  const specifiesDirection = /\b(?:baj\w*|cay\w*|descend\w*|disminu\w*|empeor\w*|perd\w*|mejor\w*|sub\w*|aument\w*|increment\w*|gan\w*)\b/.test(text);
  return namesMadrid && specifiesLines && specifiesLineAggregate && specifiesDirection && years.has('2024') && years.has('2025');
};
const railPunctualityClaimVerdict = (claim) => {
  if (!hasMadridLineTrend(claim)) return undefined;
  const text = normalizedClaim(claim);
  const saysDecline = /\b(?:baj\w*|cay\w*|descend\w*|disminu\w*|empeor\w*|perd\w*)\b/.test(text);
  const saysImprovement = /\b(?:mejor\w*|sub\w*|aument\w*|increment\w*|gan\w*)\b/.test(text);
  const saysEveryLineDeclined = /\b(?:todas?(?: las| sus)? lineas?|cada (?:una de (?:las|sus) )?linea|las diez lineas?|10 de 10 lineas?)\b/.test(text) && saysDecline;
  if (saysEveryLineDeclined || saysImprovement && !saysDecline) return 'contradicted';
  return saysDecline ? 'supported' : undefined;
};

const punctualityEvidenceFitsClaim = (claim) => {
  const years = [...claim.matchAll(/\b20\d{2}\b/g)].map(([year]) => year);
  const namesMadrid = /\b(?:madrid|madril\w*)\b/.test(claim);
  const unsupportedScope = requestedGeographyScopes(claim).some(({ type, id }) => type === 'region' && id.toLocaleLowerCase('es') !== 'madrid');
  const asksForNationalScope = requestedGeographyScopes(claim).some(({ type, id }) => type === 'country' && id === 'ES') && !namesMadrid
    || /\b(?:en (?:toda )?espana|por toda espana|a escala nacional|nacional(?:es)?|toda la red|red nacional)\b/.test(claim);
  const asksForOtherService = /\b(ave|alta velocidad|media distancia|larga distancia|rodalies)\b/.test(claim);
  const asksForOtherMeasures = /\b(compens\w*|indemniz\w*|reembols\w*|cancel\w*|suprimid\w*|pasajer\w*|viajer\w*|horas? perdid\w*|tiempo perdido|minutos? de espera|(?:retraso|demora) med\w*|duraci[oó]n del retraso)\b/.test(claim)
    || /\bperder\w*\b.{0,30}\b(?:minutos?|horas?|tiempo)\b/.test(claim);
  const asksForCausality = /\b(caus\w*|provoc\w*|debido a|por culpa de|responsable de|hace que|lleva a)\b/.test(claim);
  const asksForAnotherPeriod = years.length > 0
    && (years.some((year) => !['2024', '2025'].includes(year)) || !years.includes('2025'));
  return !unsupportedScope && !asksForNationalScope && !asksForOtherService && !asksForOtherMeasures && !asksForCausality && !asksForAnotherPeriod;
};

export const RAIL_PUNCTUALITY_EVIDENCE = Object.freeze({
  directClaimEvidence: (claim) => railPunctualityClaimVerdict(claim) !== undefined,
  claimVerdictFor: railPunctualityClaimVerdict,
  expiresAt: '2027-12-31',
  territories: ['ES', 'madrid'],
  when: punctualityEvidenceFitsClaim,
  evidenceLabel: 'Puntualidad anual publicada por línea en Cercanías Madrid',
  dimensions: scopeForFact,
  facts: [
    `En Cercanías Madrid, el porcentaje de trenes que llegó con cinco minutos o menos de retraso bajó entre 2024 y 2025 en ${declines.length} de las ${lines.length} líneas publicadas. Las caídas fueron de ${format(smallestDecline)} a ${format(largestDecline)} puntos porcentuales; la ${improved.line} subió ${format(improved.points)} puntos.`,
    `Puntualidad por línea, 2024 → 2025: ${lineDetails}.`,
    'Renfe define este indicador como la proporción de trenes que llega a destino con cinco minutos o menos de retraso; los trenes suprimidos o no circulados cuentan como impuntuales. Es un dato de trenes de Madrid, no de minutos perdidos por pasajeros ni de toda la red de Cercanías de España.',
  ],
  dimensionsForClaim: () => scopeForFact,
  factSourceIds: [
    [madridPunctuality2024Source.id, madridPunctuality2025Source.id],
    [madridPunctuality2024Source.id, madridPunctuality2025Source.id],
    [madridPunctuality2024Source.id, madridPunctuality2025Source.id],
  ],
  factDimensions: [scopeForFact, scopeForFact, scopeForFact],
  sources: [madridPunctuality2024Source, madridPunctuality2025Source],
});

export const railPunctualityShareableReply = ({ claim, facts }) => {
  const verdict = railPunctualityClaimVerdict(claim);
  const findings = [facts[0], facts[2]].filter(Boolean);
  if (verdict === 'contradicted' && findings.length) findings[0] = `La serie no respalda esa dirección. ${findings[0]}`;
  if (!verdict) findings.push('Esta serie no permite confirmar toda la afirmación: mide la puntualidad de trenes por línea, no la experiencia o percepción de cada pasajero.');
  return findings.join('\n\n');
};
