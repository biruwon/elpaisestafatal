const source = {
  id: 'mivau-social-housing-bulletin-2024',
  title: 'Observatorio de vivienda y suelo. Boletín especial Vivienda Social 2024',
  publisher: 'Ministerio de Vivienda y Agenda Urbana (MIVAU)',
  url: 'https://publicaciones.transportes.gob.es/downloadcustom/sample/3749',
  retrievedAt: '2026-11-24',
  role: 'primary',
};

const normalize = (value) => String(value || '').toLocaleLowerCase('es')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

const requestedYearsFit = (claim) => {
  const text = normalize(claim);
  const years = [...text.matchAll(/\b20\d{2}\b/g)].map(([year]) => year);
  return years.every((year) => year === '2023'
    || year === '2024' && /\b(boletin|informe|publicacion)\b/.test(text));
};

export const asksForPublicSocialStockCount = (claim) => {
  const text = normalize(claim);
  const housing = /\b(viviend\w*|parque|alquiler\w*)\b/.test(text);
  const socialOrPublic = /\b(social\w*|public\w*|titularidad publica)\b/.test(text);
  const asksForMeasure = /\b(cuant\w*|numero|cantidad|recuento|cobertura|porcentaje|proporcion|cuenta\w*|stock)\b/.test(text)
    || /\b318\s*000\b/.test(text)
    || /\b1\s*72\s*(?:%|por ciento)\b/.test(text);
  const asksAboutMarketEffect = /\b(precio\w*|mercado|influi\w*|impact\w*|efect\w*|caus\w*|provoc\w*)\b/.test(text)
    || /\b(renta\w*|alquil\w*)\b.{0,45}\b(influi\w*|impact\w*|efect\w*|caus\w*|provoc\w*|aument\w*|reduc\w*|encarec\w*)\b/.test(text)
    || /\b(influi\w*|impact\w*|efect\w*|caus\w*|provoc\w*|aument\w*|reduc\w*|encarec\w*)\b.{0,45}\b(renta\w*|alquil\w*)\b/.test(text);
  return housing && socialOrPublic && asksForMeasure && !asksAboutMarketEffect
    && !/\b(protegid\w*|vpo|precio limitado)\b/.test(text);
};

export const PUBLIC_SOCIAL_HOUSING_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-24',
  asOf: '2026-11-24',
  expiresAt: '2027-11-24',
  validationStatus: 'reviewed',
  territories: ['ES'],
  directClaimEvidence: asksForPublicSocialStockCount,
  claimVerdictFor: (claim) => asksForPublicSocialStockCount(claim) ? 'supported' : 'insufficient',
  when: requestedYearsFit,
  evidenceLabel: 'Parque de vivienda social de titularidad pública · España',
  dimensions: {
    subject: 'recuento y cobertura del parque de vivienda social de titularidad pública',
    population: 'viviendas públicas destinadas a hogares con dificultades para acceder al mercado',
    period: 'encuesta MIVAU remitida en noviembre de 2023; cobertura comparada con hogares del Censo de 2021',
    geography: 'España',
    denominator: '1,72 % de 18,5 millones de hogares; no es una proporción del total de viviendas',
    unit: 'viviendas; porcentaje de hogares',
  },
  facts: [
    'La encuesta de vivienda social remitida por MIVAU en noviembre de 2023 estimó unas 318.000 viviendas sociales de titularidad pública en España: unas 197.000 de comunidades autónomas y entidades dependientes, y 121.000 de ayuntamientos y entidades dependientes.',
    'MIVAU calculó que ese parque cubría el 1,72 % de los 18,5 millones de hogares contabilizados por el Censo de 2021. El denominador son hogares, no todas las viviendas.',
    'En el boletín, vivienda social significa vivienda de titularidad pública para alquiler, cesión u otra tenencia temporal, con límites de renta o venta y dirigida a personas u hogares con dificultades de acceso. Vivienda protegida es una categoría más amplia: también incluye vivienda de precio limitado, puede ser pública o privada y abarca distintos regímenes.',
  ],
  factSourceIds: [
    [source.id],
    [source.id],
    [source.id],
  ],
  factDimensions: [
    {
      subject: 'viviendas sociales estimadas por titularidad pública',
      population: 'viviendas de titularidad pública para alquiler, cesión u otra tenencia temporal',
      period: 'encuesta remitida en noviembre de 2023',
      geography: 'España',
      denominator: 'estimación a partir de respuestas autonómicas y datos municipales escalados; no es un censo exhaustivo de vivienda protegida',
      unit: 'viviendas',
    },
    {
      subject: 'cobertura del parque de vivienda social pública',
      population: 'hogares residentes en España',
      period: 'parque estimado en 2023; hogares del Censo de 2021',
      geography: 'España',
      denominator: '18,5 millones de hogares del Censo de 2021',
      unit: 'porcentaje de hogares',
    },
    {
      subject: 'definiciones de vivienda social y vivienda protegida usadas por MIVAU',
      population: 'viviendas sujetas a regímenes públicos de precio y tenencia',
      period: 'Boletín especial Vivienda Social 2024',
      geography: 'España',
      denominator: 'la cifra de 318.000 cuenta solo vivienda social de titularidad pública, no toda vivienda protegida',
      unit: 'alcance metodológico',
    },
  ],
  sources: [source],
});
