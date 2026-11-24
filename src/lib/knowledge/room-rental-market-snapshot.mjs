const reportSource = {
  id: 'cje-emancipation-2025',
  title: 'Observatorio de Emancipación 2025 · balance general',
  publisher: 'Consejo de la Juventud de España',
  url: 'https://www.cje.org/download/313/ano-2025/23618/2025-balance-general.pdf',
  publishedAt: '2026-05-26',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

const normalize = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const thresholdScopeAppliesOnlyToWholeHomes = (text) => /\bno (?:se )?(?:aplic\w*|correspond\w*|rige\w*)\b[^.!?]{0,60}\bhabitacion\w*\b/.test(text)
  || /\b(?:correspond\w*|refier\w*|aplic\w*)\b[^.!?]{0,90}\b(?:viviend\w* complet\w*|hogar\w* complet\w*)\b[^.!?]{0,45}\bno a? habitacion\w*\b/.test(text)
  || /\b(?:solo|unicamente)\b[^.!?]{0,60}\b(?:viviend\w* complet\w*|hogar\w* complet\w*)\b/.test(text);
const roomRental = (text) => /\b(habitacion\w*|cuarto\w*|piso compartido|compartir piso|vivienda compartida|alquiler por habitaciones)\b/.test(text)
  && /\b(alquil\w*|arrendam\w*|renta\w*|precio\w*|cost\w*|habitacion\w*|cuarto\w*|compartir|piso compartido)\b/.test(text)
  && !/\b(hotel\w*|hostal\w*|hostel\w*|alojamiento turistico|vacacional\w*|turism\w*|turist\w*)\b/.test(text);

const requestedRoomMeasureFor = (claim) => {
  const rawText = String(claim || '');
  const text = normalize(claim);
  if (!roomRental(text)) return undefined;

  const asksPriceTrend = /\b(precio\w*|renta\w*|alquiler\w*)\b/.test(text)
    && /\b(aument\w*|sub\w*|crec\w*|increment\w*|vari\w*|encarec\w*|baj\w*|disminu\w*|reduc\w*|evolucion\w*|interanual)\b/.test(text);
  if (asksPriceTrend) return 'price-trend';

  const asksMedian = /\b(median\w*|mediana)\b/.test(text)
    && /\b(precio\w*|renta\w*|alquiler\w*|cuant\w*|cuest\w*|import\w*|euros?|eur|mensual\w*|al mes)\b/.test(text);
  if (asksMedian) return 'median';

  const asksForRoomPrice = /\b(cuant\w*|cuest\w*|precio\w*|renta\w*|euros?|eur|mensual\w*|al mes)\b/.test(text)
    && !/\b(aument\w*|sub\w*|crec\w*|increment\w*|vari\w*|encarec\w*|baj\w*|disminu\w*|reduc\w*|evolucion\w*|interanual)\b/.test(text);
  if (asksForRoomPrice) return 'median';

  const includesPercentage = /\b(porcent\w*|por ciento)\b/.test(text) || /\d+(?:[.,]\d+)?\s*%/i.test(rawText);
  const asksSalaryEffort = /\b(salari\w*|asalariad\w*|sueldo\w*|nomina\w*|ingres\w*)\b/.test(text)
    && (includesPercentage || /\b(parte|proporcion|esfuerzo|destin\w*|dedic\w*)\b/.test(text));
  if (asksSalaryEffort) return 'salary-effort';

  const asksThreshold = /\b(umbral\w*|limite\w*|criterio\w*|threshold)\b/.test(text)
    && /\b30\s*(?:%|por ciento)?\b/i.test(rawText);
  if (asksThreshold) return 'threshold';

  const asksOffers = /\b(ofert\w*|anuncios?|numero de habitaciones|cantidad de habitaciones)\b/.test(text)
    && /\b(cuant\w*|numero|aument\w*|sub\w*|crec\w*|increment\w*|vari\w*|ofert\w*|anuncios?)\b/.test(text);
  if (asksOffers) return 'offers';
  return undefined;
};

const directRoomMeasureFor = (claim) => {
  const text = normalize(claim);
  const years = [...text.matchAll(/\b20\d{2}\b/g)].map(([year]) => year);
  const kind = requestedRoomMeasureFor(claim);
  const roomOfferTrendHasSupportedPeriod = kind === 'offers' && requestedYearsFit(claim);
  const roomPriceTrendHasSupportedPeriod = kind === 'price-trend' && years.includes('2024') && years.includes('2025')
    && years.every((year) => year === '2024' || year === '2025');
  const salaryPopulationSpecified = /\b(joven\w*|juventud)\b/.test(text);
  const salarySpendClaimedAsObserved = kind === 'salary-effort'
    && /\b(gast(?:a|an|o|aron|aba|aban|ado|ados|adas)|pag(?:a|an|o|aron|aba|aban|ado|ados|adas)|desembols\w*|gasto observado)\b/.test(text);
  const latestMedianQuestion = kind === 'median' && years.length === 0
    && /\b(cuant\w*|cual|que precio|que renta)\b/.test(text)
    && !/\b(actual\w*|hoy|ahora|vigente|current)\b/.test(text);
  const latestThresholdReference = kind === 'threshold' && years.length === 0
    && !/\b(actual\w*|hoy|ahora|vigente|current)\b/.test(text);
  if (!roomRental(text) || !(years.includes('2025') || roomOfferTrendHasSupportedPeriod || roomPriceTrendHasSupportedPeriod || latestMedianQuestion || latestThresholdReference)
    || kind !== 'threshold' && /\b(adult\w*|trabajad\w*|emplead\w*|ocupad\w*|poblacion general)\b/.test(text)
    || kind === 'salary-effort' && (!salaryPopulationSpecified || salarySpendClaimedAsObserved)
    || /\b(unic\w*|sola? opcion|no queda otra|viable|alternativ\w*)\b/.test(text)) return undefined;
  return kind;
};

const requestedYearsFit = (claim) => {
  const text = normalize(claim);
  const years = [...text.matchAll(/\b20\d{2}\b/g)].map(([year]) => year);
  if (!years.length || years.every((year) => year === '2025')) return true;
  const asksRoomPriceTrend = roomRental(text)
    && /\b(precio\w*|renta\w*|alquiler\w*)\b/.test(text)
    && /\b(aument\w*|sub\w*|crec\w*|increment\w*|vari\w*|encarec\w*|baj\w*|disminu\w*|reduc\w*|evolucion\w*|interanual)\b/.test(text)
    && years.includes('2024') && years.includes('2025')
    && years.every((year) => year === '2024' || year === '2025');
  if (asksRoomPriceTrend) return true;
  const asksRoomOfferTrend = roomRental(text)
    && /\b(ofert\w*|anuncios?|numero de habitaciones)\b/.test(text)
    && /\b(aument\w*|sub\w*|crec\w*|increment\w*|vari\w*|desde|respecto|frente|comparad\w*|entre|mas|menos)\b/.test(text)
    && years.every((year) => ['2022', '2024', '2025'].includes(year));
  return asksRoomOfferTrend;
};

const findings = [
  'En España, en 2025, la renta mediana mensual anunciada para una habitación en un piso compartido fue de 400 euros (+5,3 % interanual). Se basa en anuncios de Idealista: es una mediana de oferta, no el alquiler que paga cada persona.',
  'En 2025 se ofertaron 101.984 habitaciones en pisos compartidos en España: un 20,0 % más que en 2024 y un 85,4 % más que en 2022. El recuento describe habitaciones ofertadas, no personas que las alquilaron ni el porcentaje de trabajadores que las necesitan.',
  'La renta mediana anunciada de una habitación subió un 5,3 % entre 2024 y 2025. Se trata de una variación del precio anunciado en la serie del CJE, no de la evolución de todos los alquileres pagados.',
  'El CJE estima que, en 2025, una persona joven asalariada de 16–29 años tendría que dedicar el 33,6 % de su salario al alquiler de una habitación. Es un cálculo de acceso, no un gasto observado. El CJE advierte que el umbral del 30 % corresponde a viviendas completas, no a habitaciones.',
  'En el Observatorio de 2025, el CJE advierte que el umbral del 30 % usado para estimar el acceso corresponde a una vivienda completa, no a una habitación compartida.',
  'El Observatorio se centra principalmente en la población de 16–29 años. Los anuncios de habitaciones no identifican la edad o situación laboral de quienes los publican o alquilan; las cifras no miden a todos los trabajadores adultos, cuántos solo pueden pagar una habitación ni qué otras opciones tienen. El propio CJE advierte que el umbral del 30 % se refiere al acceso a una vivienda, no a una habitación compartida.',
];

const factDimensions = [
  {
    subject: 'renta mediana mensual anunciada de una habitación en piso compartido',
    population: 'anuncios de pisos compartidos publicados en Idealista y facilitados al CJE; no personas arrendatarias',
    period: '2025; variación interanual frente a 2024',
    geography: 'España; los datos autonómicos solo cubren capitales provinciales',
    denominator: 'anuncios existentes de pisos compartidos en Idealista',
    unit: 'euros al mes, mediana; variación interanual en porcentaje',
  },
  {
    subject: 'número de habitaciones ofertadas en pisos compartidos',
    population: 'habitaciones ofertadas en anuncios de pisos compartidos recogidos por el CJE',
    period: '2025; variación frente a 2024 y 2022',
    geography: 'España',
    denominator: 'recuento de habitaciones ofertadas; no es una proporción de población',
    unit: 'habitaciones ofertadas; variación porcentual',
  },
  {
    subject: 'variación interanual de la renta mediana anunciada de una habitación',
    population: 'anuncios de pisos compartidos publicados en Idealista y facilitados al CJE',
    period: '2024–2025',
    geography: 'España; los datos autonómicos solo cubren capitales provinciales',
    denominator: 'renta mediana anunciada en 2024',
    unit: 'porcentaje de variación',
  },
  {
    subject: 'coste teórico de acceso al alquiler de una habitación frente al salario juvenil',
    population: 'persona joven asalariada según el indicador del CJE',
    period: '2025',
    geography: 'España',
    denominator: 'salario de una persona joven asalariada; cálculo con la renta mediana de mercado',
    unit: 'porcentaje del salario',
  },
  {
    subject: 'ámbito del umbral de asequibilidad del 30 %',
    population: 'indicador de acceso a la vivienda del CJE',
    period: 'informe 2025',
    geography: 'España',
    denominator: 'coste de acceso a una vivienda completa, no a una habitación compartida',
    unit: 'porcentaje del coste de acceso',
  },
  {
    subject: 'alcance de la fuente y límites de inferencia sobre trabajadores adultos',
    population: 'población joven de 16–29 años para los indicadores del Observatorio; anuncios de Idealista para el precio de habitaciones',
    period: 'informe 2025',
    geography: 'España; datos autonómicos de habitaciones limitados a capitales provinciales',
    denominator: 'no hay recuento de trabajadores adultos para quienes la habitación sea su única opción',
    unit: 'alcance y limitación metodológica',
  },
];

const directFindingIndex = (kind) => ({ median: 0, offers: 1, 'price-trend': 2, 'salary-effort': 3, threshold: 4 })[kind];

const claimVerdictFor = (claim, kind) => {
  const text = normalize(claim);
  const rawClaim = String(claim || '');
  const numeric = (expression) => {
    const match = rawClaim.match(expression);
    return match ? Number(match[1].replace(/\s/g, '').replace(/\./g, '').replace(',', '.')) : undefined;
  };
  const close = (actual, expected, tolerance = 0.05) => Math.abs(actual - expected) <= tolerance;
  const percentages = [...rawClaim.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:%|por ciento)/gi)]
    .map((match) => ({
      value: Number(match[1].replace(',', '.')),
      index: match.index,
      rawLength: match[0].length,
    }));

  if (kind === 'median') {
    const amount = numeric(/(\d[\d.\s,]*)\s*(?:€|euros?)/i);
    if (amount !== undefined && !close(amount, 400)) return 'contradicted';
    if (/\b(aument\w*|sub\w*|crec\w*|increment\w*|interanual)\b/.test(text)
      && percentages.some(({ value }) => !close(value, 5.3))) return 'contradicted';
    return 'supported';
  }
  if (kind === 'salary-effort') {
    const referencesThirtyPercentThreshold = percentages.some(({ value }) => close(value, 30))
      && /\b(umbral\w*|limite\w*|criterio\w*|asequib\w*|threshold)\b/.test(text);
    const comparesRatioToThreshold = /\b(supera\w*|exced\w*|rebasa\w*|por encima|por debajo)\b/.test(text);
    const appliesThresholdToRoom = /\b(aplic\w*|correspond\w*|rige\w*|sirve\w*)\b[^.!?]{0,90}\bhabitacion\w*\b/.test(text);
    if (referencesThirtyPercentThreshold && !thresholdScopeAppliesOnlyToWholeHomes(text)
      && (comparesRatioToThreshold || appliesThresholdToRoom)) return 'contradicted';
    const percent = numeric(/(\d+(?:[.,]\d+)?)\s*\s*(?:%|por ciento)/i);
    return percent === undefined || close(percent, 33.6) ? 'supported' : 'contradicted';
  }
  if (kind === 'threshold') {
    if (thresholdScopeAppliesOnlyToWholeHomes(text)) return 'supported';
    if (/\b(aplic\w*|correspond\w*|rige\w*|supera\w*|exced\w*|rebasa\w*|por encima)\b/.test(text)) return 'contradicted';
    return 'supported';
  }
  if (kind === 'price-trend') {
    if (percentages.some(({ value }) => !close(value, 5.3))) return 'contradicted';
    return /\b(baj\w*|disminu\w*|reduc\w*)\b/.test(text) ? 'contradicted' : 'supported';
  }
  for (const { value, index, rawLength } of percentages) {
    const beforePercent = normalize(rawClaim.slice(Math.max(0, index - 70), index));
    const afterPercent = normalize(rawClaim.slice(index + rawLength, index + rawLength + 70));
    const yearAfterPercent = afterPercent.match(/\b(?:mas que|respecto(?: a)?|frente(?: a)?|comparad\w* con|desde)(?: en)? (2022|2024)\b/);
    const yearBeforePercent = beforePercent.match(/\b(?:desde|respecto(?: a)?|frente(?: a)?|entre)\s+(?:el a[nñ]o\s+)?(2022|2024)\b/);
    const nearestBaseline = Number(yearAfterPercent?.[1] || yearBeforePercent?.[1]) || undefined;
    const expectedPercent = nearestBaseline === 2022 ? 85.4 : nearestBaseline === 2024 ? 20 : undefined;
    if (expectedPercent === undefined) return 'mixed';
    if (!close(value, expectedPercent)) return 'contradicted';
  }

  const reportedCount = [...rawClaim.matchAll(/\b(?:\d{1,3}(?:[.\s]\d{3})+|\d+(?:[.,]\d+)?)\b/g)]
    .map((match) => ({
      value: Number(match[0].replace(/[.\s]/g, '')),
      suffix: rawClaim.slice(match.index + match[0].length, match.index + match[0].length + 15),
    }))
    .find(({ value, suffix }) => ![2022, 2024, 2025].includes(value) && !/^\s*(?:%|por ciento|€|euros?)/i.test(suffix))?.value;
  if (reportedCount !== undefined && reportedCount !== 101984) return 'contradicted';
  return /\b(baj\w*|disminu\w*|reduc\w*)\b/.test(text) ? 'contradicted' : 'supported';
};

export const roomRentalMarketDirectMeasureFor = (claim) => directRoomMeasureFor(claim);
export const roomRentalMarketRequestedMeasureFor = (claim) => requestedRoomMeasureFor(claim);

export const ROOM_RENTAL_MARKET_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-24',
  asOf: '2026-11-24',
  expiresAt: '2027-05-26',
  validationStatus: 'reviewed',
  territories: ['ES'],
  directClaimEvidence: false,
  when: requestedYearsFit,
  evidenceLabel: 'Habitaciones en pisos compartidos: anuncios, renta mediana y coste teórico · España, 2025',
  supportedScope: 'España; anuncios de alquiler de habitaciones en pisos compartidos y estimación de acceso de una persona joven asalariada, informe CJE 2025',
  unsupportedScope: 'rentas pagadas por cada inquilino; prevalencia entre personas adultas trabajadoras; proporción para quienes compartir habitación es la única opción; ciudades distintas de capitales provinciales en datos autonómicos; causalidad',
  dimensions: {
    subject: 'oferta y renta mediana anunciada de habitaciones en pisos compartidos; coste teórico para una persona joven asalariada',
    population: 'anuncios de Idealista facilitados al CJE; indicador salarial juvenil del Observatorio',
    period: '2025; comparaciones de oferta frente a 2024 y 2022; precio frente a 2024',
    geography: 'España; datos autonómicos limitados a capitales provinciales',
    denominator: 'anuncios para la renta mediana; salario de una persona joven asalariada para el coste teórico',
    unit: 'euros al mes, número de habitaciones y porcentajes',
  },
  facts: findings,
  factSourceIds: findings.map(() => [reportSource.id]),
  factDimensions,
  sources: [reportSource],
  selectForClaim: ({ claim }) => {
    const kind = directRoomMeasureFor(claim);
    if (!kind) return undefined;
    const index = directFindingIndex(kind);
    return {
      ...ROOM_RENTAL_MARKET_SNAPSHOT,
      directClaimEvidence: true,
      claimVerdictFor: (submittedClaim) => claimVerdictFor(submittedClaim, kind),
      facts: [findings[index]],
      factSourceIds: [[reportSource.id]],
      factDimensions: [factDimensions[index]],
      evidenceLabel: kind === 'median' ? 'Renta mediana anunciada de una habitación en un piso compartido'
        : kind === 'offers' ? 'Habitaciones ofertadas en pisos compartidos'
          : kind === 'price-trend' ? 'Variación de la renta mediana anunciada de una habitación'
            : kind === 'salary-effort' ? 'Coste teórico de alquilar una habitación para una persona joven asalariada'
              : 'Ámbito del umbral de asequibilidad del 30 %',
    };
  },
});
