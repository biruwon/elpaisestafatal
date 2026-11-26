const taxRevenueSource = {
  id: 'ec-taxation-trends-spain-2025',
  title: 'Taxation Trends in the European Union · Spain country table',
  publisher: 'European Commission, Directorate-General for Taxation and Customs Union',
  url: 'https://taxation-customs.ec.europa.eu/document/download/5afc4182-d362-4635-9ffb-8bfba8fe8548_en?filename=Summary-tables-by-country-List-of-tables.pdf',
  publishedAt: '2025-02',
  retrievedAt: '2026-11-26',
  role: 'primary',
};

const cis2012Results = {
  id: 'cis-public-services-quality-2012-study-2950',
  title: 'Calidad de los servicios públicos (VII) · Estudio CIS 2950',
  publisher: 'Centro de Investigaciones Sociológicas',
  url: 'https://www.cis.es/documents/20117/1555296/Es2950pdf.pdf/76b18566-3f91-10d3-be6d-e7c216390c86?t=1696365139065&version=1.0',
  publishedAt: '2012-07-04',
  retrievedAt: '2026-11-26',
  role: 'primary',
};

const cis2012Method = {
  id: 'cis-public-services-quality-2012-methodology',
  title: 'Ficha técnica · Estudio CIS 2950',
  publisher: 'Centro de Investigaciones Sociológicas',
  url: 'https://www.cis.es/documents/20117/1555296/Ft2950pdf.pdf/a3553273-edea-bd22-03d0-409b9c0a1a6e?t=1696365140022&version=1.0',
  publishedAt: '2012-07-04',
  retrievedAt: '2026-11-26',
  role: 'primary',
};

const cis2023Results = {
  id: 'cis-public-services-quality-2023-study-3430',
  title: 'Calidad de los servicios públicos (XIV) · Estudio CIS 3430',
  publisher: 'Centro de Investigaciones Sociológicas',
  url: 'https://www.cis.es/documents/d/cis/es3430sdmt_a',
  publishedAt: '2023-12-26',
  retrievedAt: '2026-11-26',
  role: 'primary',
};

const cis2023Method = {
  id: 'cis-public-services-quality-2023-methodology',
  title: 'Ficha técnica · Estudio CIS 3430',
  publisher: 'Centro de Investigaciones Sociológicas',
  url: 'https://www.cis.es/documents/d/guest/es3430marmt_a',
  publishedAt: '2023-12-26',
  retrievedAt: '2026-11-26',
  role: 'primary',
};

const evidenceFitsPeriod = (claim) => {
  if (/\b(hoy|ahora|actual(?:mente)?|en la actualidad|a dia de hoy)\b/.test(claim)) return false;
  const years = [...claim.matchAll(/\b20\d{2}\b/g)].map(([year]) => Number(year));
  return years.every((year) => year === 2012 || year === 2023);
};

const taxShareFact = 'La tabla española de Taxation Trends de la Comisión Europea registra los ingresos totales por impuestos y cotizaciones sociales en el 32,3 % del PIB en 2012 y el 36,5 % en 2023. Es una ratio de ingresos públicos respecto al PIB; no mide la factura fiscal de una persona media.';
const satisfaction2012Fact = 'En el estudio CIS 2950, realizado en junio-julio de 2012, el 47,3 % respondió que los servicios públicos funcionaban de forma muy o bastante satisfactoria (2,9 % + 44,4 %; n=2.480). El universo era población residente de 18 años o más y las entrevistas se hicieron en los domicilios.';
const satisfaction2023Fact = 'En el estudio CIS 3430, realizado en noviembre-diciembre de 2023, el 45,3 % respondió que los servicios públicos funcionaban de forma muy o bastante satisfactoria (3,8 % + 41,5 %; n=10.306). El universo era población española de 18 años o más; la muestra se ponderó y las entrevistas se hicieron por teléfono.';
const comparabilityFact = 'La diferencia entre los porcentajes de satisfacción es de 2 puntos porcentuales, pero las encuestas no tuvieron el mismo universo ni el mismo modo de entrevista. Sus márgenes de error publicados para el total fueron ±2,0 puntos en 2012 y ±1,0 en 2023, calculados bajo el supuesto de muestreo aleatorio simple. Esta diferencia por sí sola no demuestra un deterioro significativo de la percepción.';

export const PUBLIC_TAX_SERVICE_PERCEPTION_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-26',
  expiresAt: '2027-11-26',
  validationStatus: 'reviewed',
  directClaimEvidence: false,
  claimVerdict: 'insufficient',
  territories: ['ES'],
  when: evidenceFitsPeriod,
  evidenceLabel: 'Ingresos públicos agregados y encuestas CIS sobre la satisfacción general con los servicios públicos',
  dimensions: {
    subject: 'ingresos agregados por impuestos y cotizaciones sociales y percepción general del funcionamiento de los servicios públicos',
    population: 'ingresos del conjunto de las administraciones públicas; encuestas CIS a personas adultas en España',
    period: 'ingresos: 2012 y 2023; satisfacción: junio-julio de 2012 y noviembre-diciembre de 2023',
    geography: 'España',
    denominator: 'ingresos agregados como porcentaje del PIB; respuestas de todas las personas encuestadas (n=2.480 en 2012 y n=10.306 en 2023)',
    unit: 'porcentaje del PIB; porcentaje de personas encuestadas; puntos porcentuales',
  },
  facts: [taxShareFact, satisfaction2012Fact, satisfaction2023Fact, comparabilityFact],
  factSourceIds: [
    [taxRevenueSource.id],
    [cis2012Results.id, cis2012Method.id],
    [cis2023Results.id, cis2023Method.id],
    [cis2012Method.id, cis2023Method.id],
  ],
  factDimensions: [
    {
      subject: 'ingresos totales por impuestos y cotizaciones sociales',
      population: 'conjunto de las administraciones públicas',
      period: '2012 y 2023',
      geography: 'España',
      denominator: 'producto interior bruto (PIB); no es una media por contribuyente',
      unit: 'porcentaje del PIB: 32,3 % en 2012 y 36,5 % en 2023',
    },
    {
      subject: 'satisfacción general declarada con el funcionamiento de los servicios públicos',
      population: 'población residente de ambos sexos de 18 años o más',
      period: 'junio-julio de 2012',
      geography: 'España',
      denominator: 'respuestas de toda la muestra, n=2.480; entrevistas personales en domicilios',
      unit: 'porcentaje que respondió muy o bastante satisfactoria: 47,3 %',
    },
    {
      subject: 'satisfacción general declarada con el funcionamiento de los servicios públicos',
      population: 'población española de ambos sexos de 18 años o más',
      period: 'noviembre-diciembre de 2023',
      geography: 'España',
      denominator: 'respuestas de toda la muestra ponderada, n=10.306; entrevistas telefónicas CATI',
      unit: 'porcentaje que respondió muy o bastante satisfactoria: 45,3 %',
    },
    {
      subject: 'comparabilidad de dos estimaciones de satisfacción general',
      population: 'dos muestras nacionales de personas adultas con distinto universo y modo de entrevista',
      period: '2012 y 2023',
      geography: 'España',
      denominator: 'márgenes de error CIS para cada muestra, bajo supuesto de muestreo aleatorio simple',
      unit: 'diferencia descriptiva de 2 puntos porcentuales; márgenes publicados de ±2,0 y ±1,0 puntos',
    },
  ],
  sources: [taxRevenueSource, cis2012Results, cis2012Method, cis2023Results, cis2023Method],
  shareableReplyForContext: () => [
    'En España, la Comisión Europea registra impuestos y cotizaciones sociales por el 32,3 % del PIB en 2012 y el 36,5 % en 2023. Es recaudación total, no lo que paga una persona media.',
    'Según el CIS, calificó el funcionamiento general de los servicios públicos como muy o bastante satisfactorio el 47,3 % de residentes adultos en 2012 (n=2.480) y el 45,3 % de la población adulta española en 2023 (n=10.306). La diferencia es de 2 puntos porcentuales. Las encuestas fueron presenciales y telefónicas; sus márgenes publicados son ±2 y ±1 puntos, bajo supuesto de muestreo aleatorio simple. El cambio no demuestra por sí solo una caída significativa ni mide la calidad objetiva.',
    'Las fuentes no vinculan pagos individuales con opiniones ni prueban deterioro. Harían falta pagos, encuestas y resultados objetivos comparables para ambos años.',
  ].join('\n\n'),
});
