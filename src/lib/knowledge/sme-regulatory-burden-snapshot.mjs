const source = {
  id: 'eibis-spain-2025-regulatory-burden',
  title: 'EIB Investment Survey 2025: Spain overview',
  publisher: 'European Investment Bank',
  url: 'https://www.eib.org/files/publications/20250218-091225-econ-eibis-2025-spain-en.pdf',
  publishedAt: '2025-12-09',
  retrievedAt: '2026-11-26',
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
  'En la EIBIS 2025, basada en 601 entrevistas a empresas españolas de abril a julio (465 pymes de 5–249 empleados), el 84 % señaló la regulación empresarial como obstáculo para invertir: 55 % importante y 29 % menor. La pregunta se refiere a la inversión del ejercicio anterior.',
  'Sobre personal de cumplimiento, entre 421 pymes españolas de 5–249 empleados, el 32 % dedicaba más del 10 % de su plantilla, el 57 % hasta el 10 % y el 11 % nada. Entre 115 grandes empresas (250 o más empleados), los porcentajes fueron 3 %, 93 % y 4 %. La pregunta incluye normas obligatorias o voluntarias y tareas de información.',
];

const factDimensions = [
  {
    subject: 'empresas que califican la regulación empresarial como obstáculo para invertir',
    population: 'pymes encuestadas por EIBIS en España; empresas con 5–249 empleados (465 entrevistas SME en la muestra)',
    period: 'EIBIS 2025; pregunta sobre actividades de inversión del ejercicio financiero anterior; entrevistas de abril a julio de 2025',
    geography: 'España',
    denominator: 'respuestas de pymes; EIBIS publica porcentajes ponderados por valor añadido; incluye obstáculo importante (55 %) y menor (29 %)',
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
  createdAt: '2026-11-26',
  asOf: '2026-11-26',
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
      ? 'No se puede confirmar que muchos autónomos deban pagar una gestoría: el informe no mide esos honorarios y su grupo pyme empieza en cinco empleados.'
      : /\b(plataform\w*|tiendas?|comerci\w*|barrio)\b/.test(text)
        ? 'No se puede confirmar que un comercio soporte más que una plataforma: los grupos EIB no identifican plataformas ni comparan sus costes.'
        : /\b(autonom\w*|impuesto adicional|impuesto encubierto)\b/.test(text)
          ? 'No se puede concluir que la normativa equivalga a un impuesto: la encuesta no cuantifica costes en euros ni representa a autónomos sin empleados.'
        : 'No se puede cuantificar el gasto ni concluir que haya un impuesto adicional: el estudio mide respuestas y plantilla de cumplimiento.';

    return [
      'La EIBIS aporta contexto sobre obstáculos percibidos y personal dedicado a cumplir requisitos; no mide por sí sola el coste que afirma el enunciado.',
      facts[0],
      facts[1],
      `${specificLimit} La encuesta pondera los resultados por valor añadido.`,
    ].join('\n\n');
  },
});
