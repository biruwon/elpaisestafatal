const source = {
  id: 'eibis-spain-2025-regulatory-burden',
  title: 'EIB Investment Survey 2025: Spain overview',
  publisher: 'European Investment Bank',
  url: 'https://www.eib.org/files/publications/20250218-091225-econ-eibis-2025-spain-en.pdf',
  publishedAt: '2025-12-09',
  retrievedAt: '2026-11-25',
  role: 'primary',
};

const normalise = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9%]+/g, ' ').trim();

const measureRequested = (claim) => {
  const text = normalise(claim);
  const asksForValue = /\b(cuant\w*|que porcentaje|que proporcion|que parte|cual es el porcentaje|cual es la proporcion)\b/.test(text);
  if (!asksForValue) return undefined;
  if (/\b(plantill\w*|personal|trabajador\w*|emplead\w*)\b/.test(text)
    && /\b(cumpl\w*|normativ\w*|regulaci\w*|requisit\w*|inform\w*|report\w*)\b/.test(text)) return 'compliance-staff';
  if (/\b(regulaci\w*|normativ\w*|reglas? empresariales?)\b/.test(text)
    && /\b(obstacul\w*|barrera\w*|dificultad\w*)\b/.test(text)
    && /\b(invert\w*|inversion\w*)\b/.test(text)) return 'investment-obstacle';
  return undefined;
};

const claims = {
  'investment-obstacle': {
    index: 0,
    verdict: 'supported',
  },
  'compliance-staff': {
    index: 1,
    verdict: 'supported',
  },
};

const facts = [
  'En la EIBIS 2025, el 84 % de las pymes españolas (5–249 empleados) calificó la regulación empresarial como obstáculo para invertir durante el último ejercicio financiero. La base incluyó 465 pymes; el porcentaje combina obstáculos importantes y menores y está ponderado por valor añadido. Las entrevistas se hicieron entre abril y julio de 2025.',
  'Sobre personal dedicado a evaluar y cumplir requisitos regulatorios y estándares, y a preparar los informes relacionados, entre 421 pymes españolas (5–249 empleados) el 32 % destinaba más del 10 % de su plantilla, el 57 % hasta el 10 % y el 11 % nada. Entre 115 grandes empresas (250 o más empleados), los porcentajes fueron 3 %, 93 % y 4 %. La pregunta incluye requisitos obligatorios o voluntarios; la base excluye no sabe/no contesta y los porcentajes se ponderan por valor añadido.',
];

const factDimensions = [
  {
    subject: 'empresas que califican la regulación empresarial como obstáculo para invertir',
    population: 'pymes encuestadas por EIBIS en España; empresas con 5–249 empleados (465 entrevistas SME en la muestra)',
    period: 'EIBIS 2025; pregunta sobre actividades de inversión del ejercicio financiero anterior; entrevistas de abril a julio de 2025',
    geography: 'España',
    denominator: '465 pymes; porcentaje que combina obstáculo importante y menor; ponderado por valor añadido',
    unit: 'porcentaje de empresas encuestadas',
  },
  {
    subject: 'proporción de plantilla que las empresas asignan a cumplimiento regulatorio, estándares e informes',
    population: 'pymes encuestadas por EIBIS en España (5–249 empleados; n=421) y grandes empresas (250 o más; n=115)',
    period: 'EIBIS 2025; entrevistas de abril a julio de 2025',
    geography: 'España',
    denominator: 'respuestas a la pregunta de 421 pymes y 115 grandes empresas, excluidos no sabe y no contesta; EIBIS publica porcentajes ponderados por valor añadido',
    unit: 'porcentaje de empresas por tramo de plantilla dedicada; grupos de tamaño separados',
  },
];

export const SME_REGULATORY_BURDEN_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-25',
  asOf: '2026-11-25',
  expiresAt: '2026-12-09',
  validationStatus: 'reviewed',
  territories: ['ES'],
  when: (claim) => [...String(claim || '').matchAll(/\b20\d{2}\b/g)].every(([year]) => year === '2025'),
  directClaimEvidence: (claim) => Boolean(measureRequested(claim)),
  claimVerdictFor: (claim) => claims[measureRequested(claim)]?.verdict || 'insufficient',
  selectForClaim: ({ claim }) => {
    const requested = measureRequested(claim);
    if (!requested) return SME_REGULATORY_BURDEN_SNAPSHOT;
    const index = claims[requested].index;
    return {
      ...SME_REGULATORY_BURDEN_SNAPSHOT,
      facts: [facts[index]],
      factSourceIds: [[source.id]],
      factDimensions: [factDimensions[index]],
      dimensions: factDimensions[index],
    };
  },
  dimensions: {
    subject: 'reported business-regulation obstacles and staff allocated to compliance',
    population: 'pymes encuestadas por EIBIS en España; definición del informe: empresas con 5–249 empleados',
    period: 'edición EIBIS 2025; entrevistas telefónicas entre abril y julio de 2025',
    geography: 'España',
    denominator: 'respuestas de empresas; bases distintas según la pregunta; porcentajes ponderados por valor añadido',
    unit: 'porcentaje de empresas y tramo de plantilla',
  },
  facts,
  factSourceIds: facts.map(() => [source.id]),
  factDimensions,
  sources: [source],
  shareableReplyForContext: ({ claim }) => {
    const requested = measureRequested(claim);
    if (requested) return facts[claims[requested].index];

    const text = normalise(claim);
    const specificLimit = /\b(gestori\w*|asesori\w*)\b/.test(text)
      ? 'No se puede confirmar que autónomos sin empleados necesiten contratar una gestoría: el estudio no mide esos honorarios y su muestra pyme empieza en cinco empleados.'
      : /\b(plataform\w*|tiendas?|comerci\w*|barrio)\b/.test(text)
        ? 'No se puede afirmar que un comercio soporte menos regulación que una plataforma: la encuesta no identifica plataformas ni compara costes por tipo de negocio.'
        : /\b(autonom\w*|impuesto adicional|impuesto encubierto|impuesto oculto)\b/.test(text)
          ? 'No se puede concluir que la regulación sea un impuesto: la encuesta mide percepciones y personal, no costes en euros, y no incluye autónomos sin empleados.'
          : 'No se puede confirmar un coste monetario: la encuesta aporta percepciones y datos de plantilla, pero no mide gastos en euros.';

    return [
      'La EIBIS 2025 entrevistó a 601 empresas españolas entre abril y julio. De 465 pymes (5–249 empleados), el 84 % señaló la regulación como obstáculo para invertir en el último ejercicio; los resultados se ponderan por valor añadido.',
      'En la pregunta sobre personal dedicado a evaluar y cumplir requisitos, estándares e informes, entre 421 pymes el 32 % empleaba más del 10 % de su plantilla, el 57 % hasta el 10 % y el 11 % nada. Entre 115 grandes (250 o más empleados), fueron 3 %, 93 % y 4 %.',
      specificLimit,
    ].join('\n\n');
  },
});
