// Banco de España's 2025 Annual Report, retrieved 2026-11-23. The values are
// national context for residential supply; they do not measure rent changes
// caused by construction, local availability, or homes affordable to renters.
const source = {
  id: 'bde-housing-supply-2025',
  title: 'Informe Anual 2025 · oferta y demanda de vivienda',
  publisher: 'Banco de España',
  url: 'https://www.bde.es/f/webbe/SES/Secciones/Publicaciones/PublicacionesAnuales/InformesAnuales/25/InfAnual_2025.pdf',
  retrievedAt: '2026-11-23',
  schedule: 'annual',
  trust: 'primary',
};

const yearsWithin = (claim, supportedYears) => {
  const years = [...String(claim || '').matchAll(/\b20\d{2}\b/g)].map(([year]) => year);
  return years.every((year) => supportedYears.includes(year));
};

export const HOUSING_COMPLETION_EVIDENCE = Object.freeze({
  expiresAt: '2027-04-30',
  territories: ['ES'],
  directClaimEvidence: true,
  claimVerdict: 'supported',
  when: (claim) => yearsWithin(claim, ['2025'])
    && !/\b(?:este ano|actualmente|en lo que va de ano|2026)\b/.test(claim),
  evidenceLabel: 'Viviendas residenciales nuevas terminadas',
  dimensions: {
    subject: 'viviendas residenciales nuevas terminadas',
    population: 'viviendas nuevas terminadas en España',
    period: '2025',
    geography: 'España',
    denominator: 'recuento anual de viviendas terminadas',
    unit: 'viviendas',
  },
  facts: [
    'El Banco de España cifra en 92.000 las viviendas nuevas terminadas en España en 2025, un 9 % menos que en 2024.',
  ],
  factSourceIds: [[source.id]],
  factDimensions: [{
    subject: 'viviendas residenciales nuevas terminadas',
    population: 'recuento nacional de viviendas residenciales nuevas terminadas',
    period: '2025',
    geography: 'España',
    denominator: 'recuento anual de viviendas terminadas',
    unit: 'viviendas',
  }],
  sources: [source],
});

export const HOUSING_SUPPLY_PRESSURE_EVIDENCE = Object.freeze({
  expiresAt: '2027-04-30',
  territories: ['ES'],
  when: (claim) => yearsWithin(claim, ['2021', '2025'])
    && !/\b(?:este ano|actualmente|en lo que va de ano|2026)\b/.test(claim),
  evidenceLabel: 'Producción de vivienda y crecimiento neto de hogares',
  dimensions: {
    subject: 'viviendas residenciales terminadas y crecimiento neto de hogares',
    population: 'hogares residentes y viviendas residenciales nuevas de España',
    period: '2021–2025; último año: 2025',
    geography: 'España; el informe señala concentración territorial',
    denominator: 'la brecha acumulada se calcula como viviendas residenciales terminadas menos creación neta de hogares; el 3,7 % usa el stock de hogares residentes en 2025',
    unit: 'hogares y viviendas',
  },
  facts: [
    'En 2025, el Banco de España estimó 240.000 hogares netos nuevos y 92.000 viviendas nuevas terminadas (un 9 % menos que en 2024).',
    'Entre 2021 y 2025, calculó una diferencia acumulada de 750.000 viviendas: la suma anual de viviendas terminadas menos hogares netos nuevos. Equivale al 3,7 % del stock de hogares de 2025; el 52,5 % se concentró en Madrid, Barcelona, Alicante, València, Murcia y Málaga.',
    'El Banco de España menciona trámites urbanísticos, capacidad y productividad, costes y falta de personal especializado; no mide cada efecto ni los plazos por municipio.',
  ],
  factSourceIds: [[source.id], [source.id], [source.id]],
  factDimensions: [
    {
      subject: 'creación neta de hogares y viviendas nuevas terminadas',
      population: 'hogares residentes y viviendas residenciales nuevas de España',
      period: '2025',
      geography: 'España',
      denominator: 'recuentos anuales; no son una tasa de disponibilidad de alquiler',
      unit: 'hogares y viviendas',
    },
    {
      subject: 'diferencia acumulada entre vivienda residencial terminada y creación neta de hogares',
      population: 'hogares residentes y viviendas residenciales de España',
      period: '2021–2025',
      geography: 'España; 52,5 % de la diferencia en seis provincias citadas',
      denominator: 'stock de hogares residentes de 2025 para el 3,7 %',
      unit: 'viviendas; porcentaje del stock de hogares',
    },
    {
      subject: 'factores que limitan la respuesta de la oferta residencial',
      population: 'sector residencial y procesos de desarrollo urbanístico',
      period: 'Informe Anual 2025',
      geography: 'España, con diferencias locales',
      denominator: 'no es una estimación del efecto individual de cada factor',
      unit: 'evidencia cualitativa',
    },
  ],
  sources: [source],
});
