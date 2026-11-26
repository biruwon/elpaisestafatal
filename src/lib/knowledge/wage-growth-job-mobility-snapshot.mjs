const source = {
  id: 'oecd-employment-outlook-2025-job-mobility',
  title: 'OECD Employment Outlook 2025 · Reviving growth in a time of workforce ageing: The role of job mobility',
  publisher: 'OECD',
  url: 'https://www.oecd.org/en/publications/oecd-employment-outlook-2025_194a947b-en/full-report/reviving-growth-in-a-time-of-workforce-ageing-the-role-of-job-mobility_6fdecf3a.html',
  publishedAt: '2025-07-09',
  retrievedAt: '2026-11-26',
  role: 'primary',
};

const evidenceFitsPeriod = (claim) => {
  if (/\b(hoy|ahora|actual(?:mente)?|en la actualidad|a dia de hoy)\b/.test(claim)) return false;
  const years = [...claim.matchAll(/\b20\d{2}\b/g)].map(([year]) => Number(year));
  return years.length === 0 || (years.length === 2 && years[0] === 2000 && years[1] === 2019);
};

export const WAGE_GROWTH_JOB_MOBILITY_SNAPSHOT = {
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-26',
  expiresAt: '2027-11-26',
  validationStatus: 'reviewed',
  directClaimEvidence: false,
  claimVerdict: 'insufficient',
  territories: ['ES'],
  when: evidenceFitsPeriod,
  evidenceLabel: 'Descomposición agregada del crecimiento salarial y la movilidad entre empresas · OCDE',
  dimensions: {
    subject: 'contribución de la movilidad entre empresas y de la reasignación total al crecimiento salarial y de productividad agregado',
    population: 'datos enlazados de trabajadores y empresas de 17 países de la OCDE, incluida España',
    period: '2000–2019; la muestra española MCVL-CDF cubre 2006–2019',
    geography: '17 países de la OCDE; incluye un resultado agregado para España',
    denominator: 'puntos porcentuales del crecimiento agregado anual; promedio entre países, no variación salarial de una persona',
    unit: 'puntos porcentuales anuales',
  },
  facts: [
    'La OCDE estudió datos enlazados de trabajadores y empresas de 17 países, España incluida, durante 2000–2019. En ese promedio entre países, los cambios directos entre empresas aportaron 0,9 puntos porcentuales al crecimiento anual agregado de salarios y productividad.',
    'Al sumar los movimientos de entrada y salida del empleo, la contribución neta de toda la reasignación fue 0,3 puntos porcentuales anuales. El resto del crecimiento se produjo dentro de relaciones trabajador-empresa que continuaron.',
    'España aparece entre los países de bajo crecimiento salarial, donde la contribución total de la reasignación fue pequeña o negativa. La base española fue MCVL-CDF: muestra aleatoria del 4 % de trabajadores, 2006–2019.',
  ],
  factSourceIds: [[source.id], [source.id], [source.id]],
  factDimensions: [
    {
      subject: 'contribución de los cambios directos entre empresas al crecimiento agregado de salarios y productividad',
      population: 'trabajadores y empresas de 17 países de la OCDE, incluida España',
      period: '2000–2019',
      geography: 'promedio entre 17 países de la OCDE',
      denominator: 'puntos porcentuales del crecimiento agregado anual; no es un aumento individual',
      unit: '0,9 puntos porcentuales anuales',
    },
    {
      subject: 'contribución neta de la movilidad entre empresas y de la movilidad de entrada o salida del empleo',
      population: 'trabajadores y empresas de 17 países de la OCDE, incluida España',
      period: '2000–2019',
      geography: 'promedio entre 17 países de la OCDE',
      denominator: 'puntos porcentuales del crecimiento agregado anual; incluye movilidad entre empresas y entrada o salida del empleo',
      unit: '0,3 puntos porcentuales anuales; el resto corresponde a crecimiento dentro de relaciones trabajador-empresa continuadas',
    },
    {
      subject: 'resultado agregado de España y fuente de datos enlazados española',
      population: 'muestra aleatoria del 4 % de trabajadores de la MCVL-CDF',
      period: '2006–2019',
      geography: 'España',
      denominator: 'no ofrece una estimación del aumento salarial personal por cambiar de empresa',
      unit: 'resultado agregado cualitativo y descripción de la muestra',
    },
  ],
  sources: [source],
  shareableReplyForContext: ({ facts }) => [
    'Estos agregados no permiten confirmar que cambiar de empresa sea la única vía ni calcular cuánto gana una persona al hacerlo.',
    ...facts,
    'Los puntos porcentuales describen el crecimiento agregado, no una subida salarial personal ni el efecto causal de cambiar de empresa.',
  ].join('\n\n'),
};
