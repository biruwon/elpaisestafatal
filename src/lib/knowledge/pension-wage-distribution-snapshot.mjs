const sources = {
  pension: {
    id: 'aeat-retirement-pension-average-2025',
    title: 'Pensionistas y pensiones medias por tipo de pensión · ejercicio 2025',
    publisher: 'Agencia Tributaria',
    url: 'https://sede.agenciatributaria.gob.es/AEAT/Contenidos_Comunes/La_Agencia_Tributaria/Estadisticas/Publicaciones/sites/mercado/2025/jrubikf78c7caef270887d88d752256045367442c98eb36.html',
    retrievedAt: '2026-11-25',
    role: 'primary',
  },
  ageDeciles: {
    id: 'aeat-salaried-age-deciles-2025',
    title: 'Distribución de asalariados por decilas y tramos de edad · ejercicio 2025',
    publisher: 'Agencia Tributaria',
    url: 'https://sede.agenciatributaria.gob.es/AEAT/Contenidos_Comunes/La_Agencia_Tributaria/Estadisticas/Publicaciones/sites/mercado/2025/jrubikf136dec12ad8f682bb5ec5b902ae9a58895bb47d6.html',
    retrievedAt: '2026-11-25',
    role: 'primary',
  },
  decileRanges: {
    id: 'aeat-salary-decile-ranges-2025',
    title: 'Recorrido del Salario Medio Estimado en cada decila · ejercicio 2025',
    publisher: 'Agencia Tributaria',
    url: 'https://sede.agenciatributaria.gob.es/AEAT/Contenidos_Comunes/La_Agencia_Tributaria/Estadisticas/Publicaciones/sites/mercado/2025/jrubikf5f4ebce9f5b00b7b5197194930868034ab022902.html',
    retrievedAt: '2026-11-25',
    role: 'primary',
  },
  methodology: {
    id: 'aeat-labour-pension-statistics-methodology',
    title: 'Mercado de Trabajo y Pensiones en las Fuentes Tributarias · preguntas frecuentes y metodología',
    publisher: 'Agencia Tributaria',
    url: 'https://sede.agenciatributaria.gob.es/Sede/estadisticas/estadisticas-impuesto/mercado-trabajo-pensiones-fuentes-tributarias/metodologia/preguntas-frecuentes.html',
    retrievedAt: '2026-11-25',
    role: 'primary',
  },
};

const normalize = (value) => String(value || '').toLocaleLowerCase('es')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n');

const pensionWageDistributionFits = (claim) => {
  const text = normalize(claim);
  const years = [...text.matchAll(/\b20\d{2}\b/g)].map(([year]) => year);
  if (years.some((year) => year !== '2025')) return false;
  if (/\b(mensual\w*|al mes|por mes|net\w*|hora\w*|por hora|jornada parcial|media jornada|jornada completa|tiempo completo|smi|salario minimo|pais vasco|navarra|territorio foral)\b/.test(text)) return false;

  const wageMean = /\b(?:salari\w*|sueld\w*|remuner\w*)\b.{0,30}\b(?:medi\w*|promedi\w*)\b|\b(?:medi\w*|promedi\w*)\b.{0,30}\b(?:salari\w*|sueld\w*|remuner\w*)\b/.test(text);
  if (wageMean) return false;

  const pensionerShare = /\b(?:cuant\w*|cuantos?|porcentaje|proporcion|numero|cantidad|parte|mayoria)\b.{0,55}\b(?:pension\w*|jubil\w*)\b|\b(?:pension\w*|jubil\w*)\b.{0,55}\b(?:porcentaje|proporcion|numero|cantidad|cuantos?)\b/.test(text);
  const pensionerMajority = /\b(?:much\w*|mayoria|gran parte|varios)\b.{0,25}\b(?:pensionist\w*|jubilad\w*)\b/.test(text);
  if (pensionerShare || pensionerMajority) return false;

  const youngPopulation = /\b(joven\w*|juventud|26\s+a\s+35|26\s*[-–]\s*35)\b/.test(text);
  const scopedAssertion = /\b(hay|existe\w*|algun\w*|al menos|much\w*|gran parte|parte de)\b/.test(text);
  return youngPopulation && scopedAssertion;
};

const factSourceIds = {
  pension: sources.pension.id,
  ageDeciles: sources.ageDeciles.id,
  decileRanges: sources.decileRanges.id,
  methodology: sources.methodology.id,
};
const values = Object.freeze({
  publicRetirementPensioners: 5_983_366,
  publicRetirementPensionMean: 21_964,
  salariedAge26To35: 3_094_196,
  salariedAge26To35InDeciles1To3: 1_030_308,
  thirdDecileUpperEstimate: 21_778,
});
const integer = (value) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, useGrouping: true }).format(value);
const money = (value) => integer(value);
const lowerDecileShare = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(
  values.salariedAge26To35InDeciles1To3 / values.salariedAge26To35 * 100,
);

const pensionWageDistributionVerdictFor = (claim) => /\b(no|nunca)\b.{0,32}\b(hay|existe\w*|ningun\w*|ninguna\w*|pension\w*|jubil\w*)\b/.test(normalize(claim))
  ? 'contradicted'
  : 'supported';

export const PENSION_WAGE_DISTRIBUTION_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-25',
  asOf: '2026-11-25',
  expiresAt: '2027-06-30',
  refreshCommand: 'Revisar las tablas de pensiones y del módulo salarial anual de la AEAT para el nuevo ejercicio; comprobar que se mantienen los deciles, edades, ámbito territorial y exclusiones metodológicas.',
  validationStatus: 'reviewed',
  territories: ['ES'],
  when: pensionWageDistributionFits,
  supportedScope: 'Afirmaciones existenciales sobre pensiones públicas de jubilación por encima de los salarios de muchos trabajadores jóvenes; comparación agregada de 2025 para el territorio de régimen fiscal común, usando el grupo de 26–35 años incluido en el módulo de Salario Medio Estimado anual de la AEAT.',
  unsupportedScope: 'proporción o número de pensionistas cuya pensión supera un salario; comparación persona a persona; salarios netos, mensuales, por hora o por jornada concreta; salario medio de los jóvenes; SMI; otros años o territorios; todas las personas jóvenes o trabajadoras.',
  directClaimEvidence: true,
  claimVerdictFor: pensionWageDistributionVerdictFor,
  dimensions: {
    subject: 'pensión pública media de jubilación frente a la distribución anual estimada de salarios de trabajadores jóvenes',
    population: 'pensionistas con pensión pública de jubilación y asalariados de 26–35 años incluidos en el módulo SME',
    period: 'ejercicio 2025',
    geography: 'territorio de régimen fiscal común de España; excluye los territorios forales según el ámbito fiscal de la fuente',
    denominator: '5.983.366 pensionistas con jubilación pública; 3.094.196 asalariados de 26–35 años en el módulo SME; 1.030.308 en los tres deciles salariales inferiores',
    unit: 'euros por año; personas; proporción calculada sobre el total de asalariados de 26–35 años del módulo SME',
  },
  facts: [
    `AEAT, territorio de régimen fiscal común (2025): ${integer(values.publicRetirementPensioners)} pensionistas percibieron una pensión pública de jubilación; la media anual fue de ${money(values.publicRetirementPensionMean)} euros.`,
    `En el módulo de Salario Medio Estimado anual había ${integer(values.salariedAge26To35InDeciles1To3)} de ${integer(values.salariedAge26To35)} asalariados de 26–35 años (${lowerDecileShare} %) en los tres deciles inferiores. El techo del tercer decil fue ${money(values.thirdDecileUpperEstimate)} euros estimados al año, por debajo de la pensión media: al menos ese grupo tenía un salario estimado inferior. El porcentaje exacto puede ser mayor porque el siguiente decil cruza ese importe.`,
    `La media anual de jubilación pública (${money(values.publicRetirementPensionMean)} euros) supera en ${money(values.publicRetirementPensionMean - values.thirdDecileUpperEstimate)} euros el límite superior de esos tres deciles. Como la media excede ese límite, al menos un importe individual de pensión pública también lo supera; la fuente no indica quién ni qué proporción de pensionistas lo hace.`,
  ],
  factSourceIds: [
    [factSourceIds.pension, factSourceIds.methodology],
    [factSourceIds.ageDeciles, factSourceIds.decileRanges, factSourceIds.methodology],
    Object.values(factSourceIds),
  ],
  factDimensions: [
    {
      subject: 'importe medio anual de la pensión pública de jubilación',
      population: '5.983.366 perceptores de jubilación pública en el territorio fiscal común',
      period: 'ejercicio 2025',
      geography: 'territorio de régimen fiscal común de España',
      denominator: 'pensionistas con pensión pública de jubilación',
      unit: 'euros por pensionista y año',
    },
    {
      subject: 'salario medio estimado anual y posición en deciles',
      population: 'asalariados de 26–35 años incluidos en el módulo SME de la AEAT',
      period: 'ejercicio 2025',
      geography: 'territorio de régimen fiscal común de España',
      denominator: '3.094.196 asalariados incluidos en el módulo; 1.030.308 (33,3 %) se encuentran en los tres deciles inferiores; la fuente excluye del módulo SME salarios medios bajo el SMI',
      unit: 'personas, porcentaje calculado y euros anuales estimados; el SME anualiza a 360 días',
    },
    {
      subject: 'pensión pública media de jubilación comparada con el límite salarial del tercer decil',
      population: 'dos colectivos agregados distintos: pensionistas de jubilación pública y asalariados de 26–35 años en el módulo SME',
      period: 'ejercicio 2025',
      geography: 'territorio de régimen fiscal común de España',
      denominator: 'no hay emparejamiento entre personas; el promedio de pensión se compara con el límite superior de los tres deciles salariales inferiores',
      unit: 'euros por año; diferencia calculada de 186 euros',
    },
  ],
  sources: Object.values(sources),
});

export const pensionWageDistributionReply = ({ claim }) => {
  const negativeExistence = /\b(no|nunca)\b.{0,32}\b(hay|existe\w*|ningun\w*|ninguna\w*)\b/.test(normalize(claim));
  const conclusion = negativeExistence
    ? 'La evidencia contradice negar que exista una pensión pública por encima de esos salarios.'
    : 'En este alcance, la afirmación existencial está respaldada.';
  const annualAmountAbovePensionMean = values.publicRetirementPensionMean > values.thirdDecileUpperEstimate;
  const pensionLimitDifference = values.publicRetirementPensionMean - values.thirdDecileUpperEstimate;
  return [
    `AEAT (territorio de régimen fiscal común, 2025): la pensión pública media anual de jubilación fue ${money(values.publicRetirementPensionMean)} euros para ${integer(values.publicRetirementPensioners)} pensionistas.`,
    `En el módulo de salario anual estimado, ${integer(values.salariedAge26To35InDeciles1To3)} de ${integer(values.salariedAge26To35)} asalariados de 26–35 años (${lowerDecileShare} %) estaban en los tres deciles inferiores, cuyo límite fue ${money(values.thirdDecileUpperEstimate)} euros al año. Al menos ese grupo tenía un salario estimado inferior a la pensión media; el porcentaje exacto puede ser mayor.`,
    `La pensión media supera ese límite en ${money(pensionLimitDifference)} euros${annualAmountAbovePensionMean ? '; por eso, al menos una pensión pública individual también superó ese importe' : ''}. ${conclusion} No se sabe qué proporción de pensionistas supera esos salarios. El SME anualiza a 360 días y excluye estimaciones bajo el SMI.`,
  ].join('\n\n');
};
