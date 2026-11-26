const source = {
  id: 'ine-ecv-vivienda-familia-2025',
  title: 'Encuesta de Condiciones de Vida 2025 · dificultades de acceso a la vivienda',
  publisher: 'Instituto Nacional de Estadística',
  url: 'https://www.ine.es/dyngs/Prensa/es/m3ECV2025.htm',
  publishedAt: '2026-04-27',
  retrievedAt: '2026-11-26',
  role: 'primary',
};

const normalize = (value) => String(value || '').toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/ñ/g, 'n')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const requestedYearsFit = (claim) => [...String(claim || '').matchAll(/\b(?:19|20)\d{2}\b/g)]
  .map(([year]) => year)
  .every((year) => year === '2025');

export const asksINEHousingAccessRequirementsMeasure = (claim) => {
  const text = normalize(claim);
  const asksForMeasure = /\b(porcentaj\w*|proporcion\w*|tas\w*|cuant\w*|que parte|dato\w*|medid\w*|ecv|ine)\b/.test(text)
    || /\d+(?:[.,]\d+)?\s*%/.test(String(claim || ''));
  const mentionsHousingSearch = /\b(busc\w*|busqu\w*|solicit\w*)\b[\s\w]{0,90}\b(viviend\w*|alquil\w*|cas\w*|pis\w*|hogar\w*)\b/.test(text)
    || /\b(viviend\w*|alquil\w*)\b[\s\w]{0,70}\b(busc\w*|busqu\w*)\b/.test(text);
  const mentionsNoMove = /\b(sin (?:llegar a )?cambi\w*|sin mud\w*|no se mud\w*|no consigu\w* mud\w*|sin cambio de residencia|sin cambiar(?:se)? de residencia)\b/.test(text);
  const mentionsRequirementReason = /\b(condicion\w*|requisit\w*)\b[\s\w]{0,60}\b(alquil\w*|compr\w*|viviend\w*)\b/.test(text)
    || /\b(alquil\w*|compr\w*|viviend\w*)\b[\s\w]{0,60}\b(condicion\w*|requisit\w*)\b/.test(text);
  const saysRequirementsWereNotMet = /\bno (?:reuni\w*|cumpl\w*|alcanz\w*|podia(?:n)? cumplir|pud(?:o|ieron) cumplir|conseguia(?:n)? cumplir)\b/.test(text);
  const turnsItIntoAGroupOrCausalClaim = /\b(autonom\w*|tempor\w*|ingresos? irregulares?|nomina\w*|inquilin\w*|arrendatari\w*|exclu\w*|rechaz\w*|deneg\w*|penaliz\w*|impid\w*|caus\w*|provoc\w*)\b/.test(text);

  return asksForMeasure && mentionsHousingSearch && mentionsNoMove && mentionsRequirementReason
    && saysRequirementsWereNotMet && !turnsItIntoAGroupOrCausalClaim;
};

export const housingAccessBarriersFitRequest = requestedYearsFit;

export const INE_HOUSING_ACCESS_BARRIERS_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-26',
  asOf: '2026-11-26',
  expiresAt: '2027-04-27',
  refreshCommand: 'Recheck the INE ECV 2025 housing-access release for revisions; do not carry these values into another survey year.',
  validationStatus: 'reviewed',
  territories: ['ES'],
  when: (claim) => requestedYearsFit(claim),
  directClaimEvidence: asksINEHousingAccessRequirementsMeasure,
  claimVerdictFor: () => 'supported',
  evidenceLabel: 'Búsqueda de vivienda sin cambio de residencia · ECV 2025',
  explanationHeadline: 'El INE registró motivos declarados de búsqueda de vivienda sin mudanza',
  supportedScope: 'España; personas de 16 años o más que buscaron vivienda activamente en los 12 meses previos y no cambiaron de residencia; módulo ECV 2025',
  unsupportedScope: 'solicitudes y rechazos de alquiler; alquiler frente a compra por separado; requisitos concretos; situación laboral o estabilidad de ingresos; causalidad; tendencias de otros años o resultados de una comunidad autónoma',
  explanation: 'La ECV 2025 pregunta por el motivo principal por el que las personas que buscaron vivienda no llegaron a cambiar de residencia. Una parte dijo no reunir las condiciones exigidas para alquilar o comprar, pero la encuesta no identifica las solicitudes ni los perfiles laborales.',
  dimensions: {
    subject: 'motivo declarado de no cambiar de vivienda después de una búsqueda activa',
    population: 'personas de 16 años o más residentes en España; desglose adicional por grupos de edad',
    period: 'ECV 2025; búsqueda en los 12 meses previos',
    geography: 'España',
    denominator: '7,6 %: población de 16 años o más; 6,6 %: personas que buscaron vivienda sin cambiar de residencia; los porcentajes por edad se calculan dentro de cada grupo que buscó sin cambiarse',
    unit: 'porcentaje de personas',
  },
  facts: [
    'En la ECV 2025, el 7,6 % de las personas de 16 años o más buscó vivienda de forma activa en los 12 meses previos sin llegar a cambiar de residencia. Entre ellas, el 6,6 % señaló como motivo principal no reunir las condiciones exigidas para alquilar o comprar.',
    'Entre quienes buscaron vivienda sin cambiar de residencia, el 9,3 % de las personas de 16–29 años señaló como motivo principal no reunir esas condiciones; entre las de 65 años o más, fue el 1,8 %. Son porcentajes dentro de cada grupo de edad que no llegó a cambiarse.',
  ],
  factSourceIds: [[source.id], [source.id]],
  factDimensions: [
    {
      subject: 'búsqueda de vivienda sin cambio de residencia y motivo principal declarado',
      population: 'personas de 16 años o más residentes en España; para el motivo, solo quienes buscaron vivienda sin cambiar de residencia',
      period: 'ECV 2025; búsqueda en los 12 meses previos',
      geography: 'España',
      denominator: '7,6 %: total de personas de 16 años o más; 6,6 %: personas que buscaron vivienda sin cambiar de residencia',
      unit: 'porcentaje',
    },
    {
      subject: 'motivo principal de no cambio tras buscar vivienda, por grupo de edad',
      population: 'personas de 16–29 años y de 65 años o más que buscaron vivienda sin cambiar de residencia',
      period: 'ECV 2025; búsqueda en los 12 meses previos',
      geography: 'España',
      denominator: 'personas de cada grupo de edad que buscaron vivienda sin cambiar de residencia',
      unit: 'porcentaje',
    },
  ],
  limitation: 'La respuesta combina alquiler y compra y registra un motivo declarado, no una solicitud rechazada ni el requisito que faltaba. No desglosa por trabajo autónomo, contrato temporal o estabilidad de ingresos; tampoco demuestra que una garantía o un seguro causara la falta de acceso. Un dato de 2025 no mide cómo cambiaron los requisitos con el tiempo.',
  sources: [source],
});
