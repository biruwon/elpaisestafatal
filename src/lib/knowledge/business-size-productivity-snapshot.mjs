import { requestedGeographyScopes } from './geography-scope.mjs';

const datasetSource = {
  id: 'eurostat-business-size-apparent-productivity-spain-2024',
  title: 'Enterprise statistics by size class and NACE Rev. 2 activity · 2021–2024',
  publisher: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sbs_sc_ovw?freq=A&geo=ES&indic_sbs=LABPRY_TEUR&nace_r2=B-S_X_O_S94&sinceTimePeriod=2021',
  retrievedAt: '2026-11-25',
  role: 'primary',
};

const definitionSource = {
  id: 'eurostat-apparent-labour-productivity-definition',
  title: 'Glossary: Apparent labour productivity · Structural business statistics',
  publisher: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Glossary:Apparent_labour_productivity_-_SBS',
  retrievedAt: '2026-11-25',
  role: 'primary',
};

const coverageSource = {
  id: 'eurostat-structural-business-statistics-metadata',
  title: 'Structural business statistics · metadata',
  publisher: 'Eurostat',
  url: 'https://ec.europa.eu/eurostat/cache/metadata/en/sbs_essbs21_es.htm',
  retrievedAt: '2026-11-25',
  role: 'primary',
};

const sizeRows = Object.freeze([
  { size: '0–9 personas empleadas', value: 42.83 },
  { size: '10–19 personas empleadas', value: 49.46 },
  { size: '20–49 personas empleadas', value: 53.59 },
  { size: '50–249 personas empleadas', value: 64.81 },
  { size: '250 o más personas empleadas', value: 71.95 },
]);

const normalize = (value) => String(value || '').toLocaleLowerCase('es')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n');

const businessSizeProductivitySnapshotFits = (claim) => {
  const text = normalize(claim);
  if (!/\b(?:empresas? (?:espanolas? )?mas pequenas?|empresas? pequenas?|empresas? de menor tamano|pequenas? empresas?|pymes?|microempresas?|pequeno tamano|tamano empresarial|empresas? de mayor tamano|grandes? empresas?|empresas? (?:espanolas? )?mas grandes?|medianas? empresas?)\b/.test(text)) return false;
  const years = [...text.matchAll(/\b20\d{2}\b/g)].map(([year]) => year);
  if (years.some((year) => year !== '2024')) return false;
  if (/\b(desde|durante|cada vez|cada ano|en los ultimos|en la ultima|tendencia|evolucion|ha aumentado|ha crecido|ha bajado|ha caido|seguira|en el futuro)\b/.test(text)) return false;
  if (/\b(union europea|europa|europe[oa]s?|otros paises|internacional)\b/.test(text)) return false;
  if (/\b(industria|manufactur\w*|construccion|comercio|hosteleria|turismo|agricultur\w*|financier\w*|sanitari\w*|educativ\w*|transporte|sector primario)\b/.test(text)) return false;
  const requestedTerritories = requestedGeographyScopes(claim);
  if (requestedTerritories.some((scope) => scope.id !== 'ES')) return false;
  return true;
};

const productivityBySize = sizeRows.map(({ size, value }) => `${size}: ${new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} miles de euros`).join('; ');
const relativeDifference = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format((sizeRows.at(-1).value / sizeRows[0].value - 1) * 100);

const dimensions = {
  subject: 'productividad laboral aparente: valor añadido dividido por personas empleadas, por clase de tamaño empresarial',
  population: 'empresas de la economía empresarial cubierta por las estadísticas estructurales de empresas de Eurostat',
  period: '2024',
  geography: 'España',
  denominator: 'personas empleadas en empresas de cada clase de tamaño; incluye un recuento por personas, no un ajuste por horas trabajadas',
  unit: 'miles de euros de valor añadido por persona empleada',
};

const findings = [
  `En España, en 2024, la productividad laboral aparente publicada por Eurostat fue: ${productivityBySize}. La clase de 250 o más personas empleadas registró alrededor de un ${relativeDifference} % más de valor añadido por persona que la clase de 0–9; es una diferencia descriptiva entre grupos, no una estimación del efecto de hacer crecer una empresa.`,
  'Eurostat define la productividad laboral aparente como valor añadido dividido por personas empleadas. El dato no es un salario ni una medida por hora. El agregado B–S_X_O_S94 cubre actividades de mercado de industria, construcción y servicios, con las exclusiones indicadas en la clasificación; no incluye agricultura ni administración pública.',
];

export const BUSINESS_SIZE_PRODUCTIVITY_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-25',
  asOf: '2026-11-25',
  expiresAt: '2027-10-31',
  refreshCommand: 'Revisar la última actualización de Eurostat sbs_sc_ovw para España; confirmar año, códigos de actividad y tamaño, valores de LABPRY_TEUR y definición de personas empleadas antes de sustituir este corte.',
  validationStatus: 'reviewed',
  territories: ['ES'],
  supportedScope: 'Diferencias descriptivas de productividad laboral aparente por clases de personas empleadas en empresas de España; agregado de estadísticas estructurales de empresas; año 2024.',
  unsupportedScope: 'efecto causal del tamaño empresarial; inversión, adopción tecnológica, innovación, salarios, beneficios, empresas o sectores concretos; comparaciones con otros países; evolución temporal; productividad por hora o jornada equivalente.',
  when: businessSizeProductivitySnapshotFits,
  directClaimEvidence: false,
  evidenceLabel: 'Productividad aparente por clase de tamaño empresarial · España, 2024',
  dimensions,
  facts: findings,
  factSourceIds: [
    [datasetSource.id, definitionSource.id],
    [datasetSource.id, definitionSource.id, coverageSource.id],
  ],
  factDimensions: [
    dimensions,
    {
      ...dimensions,
      subject: 'definición y cobertura de las estadísticas estructurales de empresas de Eurostat',
      denominator: 'personas empleadas, incluidas las personas propietarias que trabajan en la empresa; no equivale a personas asalariadas ni a horas trabajadas',
      unit: 'definición metodológica y cobertura sectorial',
    },
  ],
  sources: [datasetSource, definitionSource, coverageSource],
});

export const businessSizeProductivityReply = ({ facts }) => [
  facts[0],
  'La comparación muestra una asociación entre clase de tamaño y productividad aparente en ese corte; no demuestra que el tamaño cause la diferencia. Tampoco mide inversión, tecnología o salarios por esas mismas clases, ni permite afirmar qué ocurriría si una empresa creciera.',
  'El indicador es valor añadido por persona empleada, no remuneración ni productividad por hora. El ámbito es el agregado español de actividades de mercado cubierto por Eurostat, no todas las actividades económicas.',
].join('\n\n');

export const firmWageCapacityProductivityContextReply = () => {
  const format = (value) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  return [
    `En España, en 2024, Eurostat registró ${format(sizeRows[0].value)} mil euros de valor añadido por persona empleada en empresas de 0–9 personas y ${format(sizeRows.at(-1).value)} mil euros en las de 250 o más; la diferencia es de alrededor del ${relativeDifference} %.`,
    'Es productividad aparente —valor añadido por persona empleada—, no un salario ni productividad por hora. El agregado cubre industria, construcción y servicios de mercado; excluye agricultura y administración pública.',
    'La diferencia compara grupos en un año, no decisiones salariales de las mismas empresas. No muestra cuánto podrían pagar las grandes empresas ni demuestra que contengan los salarios. Para comprobarlo hacen falta productividad y remuneración de las mismas empresas, junto con datos sobre sus decisiones de pago.',
  ].join('\n\n');
};
