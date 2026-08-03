const normalise = (value) => String(value || '')
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/ñ/g, 'n')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const stopWords = new Set([
  'como', 'esta', 'este', 'para', 'pero', 'que', 'sus', 'tiene', 'una', 'uno', 'en', 'el', 'la', 'los', 'las', 'un', 'del', 'de', 'y', 'o', 'a', 'por', 'con', 'segun', 'dicen', 'dice', 'grupo', 'insiste', 'hay', 'datos', 'mas', 'menos', 'todo', 'va', 'peor', 'verdad', 'cierto', 'cierta', 'mi', 'me', 'creo', 'esto', 'eso', 'es', 'son', 'se', 'su',
]);
const tokens = (value) => [...new Set(normalise(value).split(' ').filter((token) => token.length > 2 && !stopWords.has(token)))];
const includesAny = (value, values) => values.some((item) => value.includes(item));
const containsPhrase = (value, phrase) => {
  const text = ` ${normalise(value)} `;
  const wanted = ` ${normalise(phrase)} `;
  return text.includes(wanted);
};
const hasNegation = (value) => /\b(?:no|nunca|jamas|nadie|ningun|ninguna)\b/i.test(normalise(value));

const entityAliases = [
  ['gobierno de España', ['gobierno', 'moncloa', 'sanchez', 'presidencia']],
  ['inmigración', ['inmigracion', 'inmigrante', 'inmigrantes', 'migrante', 'migrantes', 'extranjero', 'extranjeros', 'patera', 'pateras', 'asilo']],
  ['vivienda', ['vivienda', 'viviendas', 'alquiler', 'alquileres', 'hipoteca', 'hipotecas', 'piso', 'pisos', 'casa', 'casas']],
  ['empleo', ['empleo', 'trabajo', 'trabajos', 'paro', 'desempleo', 'salario', 'salarios', 'ocupado', 'ocupados']],
  ['impuestos', ['impuestos', 'tributos', 'fiscalidad', 'hacienda']],
  ['sanidad', ['sanidad', 'hospital', 'medico', 'salud', 'espera']],
  ['seguridad y delincuencia', ['delincuencia', 'delito', 'delitos', 'crimen', 'inseguridad', 'robos']],
  ['educación', ['educacion', 'colegio', 'escuela', 'becas', 'universidad']],
  ['Europa', ['europa', 'europeo', 'europea', 'ue']],
];

// These concepts are deliberately broader than editorial claim aliases. They
// give equivalent long-tail wording one stable family key without pretending
// that every semantically related sentence is the same published claim.
const semanticConceptAliases = [
  ['immigration', ['inmigracion', 'inmigrante', 'inmigrantes', 'migrante', 'migrantes', 'extranjero', 'extranjeros', 'patera', 'pateras', 'asilo']],
  ['crime', ['delincuencia', 'delito', 'delitos', 'crimen', 'inseguridad', 'inseguro', 'peligrosa', 'peligro', 'violencia', 'robos']],
  ['housing', ['vivienda', 'viviendas', 'alquiler', 'alquileres', 'hipoteca', 'hipotecas', 'piso', 'pisos', 'casa', 'casas', 'vacio', 'vacias']],
  ['employment', ['empleo', 'trabajo', 'trabajos', 'paro', 'desempleo', 'salario', 'salarios', 'ocupado', 'ocupados', 'trabajador', 'trabajadores']],
  ['taxes', ['impuestos', 'tributos', 'fiscalidad', 'hacienda', 'recaudacion', 'recaudación', 'presion fiscal']],
  ['healthcare', ['sanidad', 'hospital', 'medico', 'salud', 'espera', 'paciente', 'pacientes', 'lista de espera']],
  ['education', ['educacion', 'colegio', 'escuela', 'becas', 'universidad', 'alumnado']],
  ['prices', ['inflacion', 'inflación', 'precios', 'precio', 'ipc', 'coste', 'caro', 'cara']],
  ['benefits', ['ayudas', 'prestacion', 'prestaciones', 'pension', 'pensiones', 'subsidio', 'beneficio']],
  ['budget', ['presupuesto', 'presupuestos', 'millones', 'transferencia', 'gasto', 'gastos', 'recorta', 'recorte', 'quita']],
  ['politics', ['gobierno', 'ministerio', 'presidencia', 'sanchez', 'sánchez', 'partido', 'politica', 'política']],
];

const semanticConcepts = (value) => semanticConceptAliases
  .filter(([, aliases]) => aliases.some((alias) => containsPhrase(value, alias)))
  .map(([concept]) => concept);

const semanticTermFallback = (value) => tokens(value).filter((token) => !['espana', 'pais', 'gente', 'cosas', 'problema', 'problemas'].includes(token)).slice(0, 4);

const relationStopWords = new Set(['cobra', 'paga', 'pagan', 'tiene', 'tienen', 'recibe', 'reciben', 'hay', 'es', 'son', 'esta', 'estan', 'sube', 'baja', 'crece', 'aumenta', 'aumentan', 'disminuye', 'disminuyen', 'reduce', 'reducen', 'genera', 'generan', 'crea', 'crean', 'causa', 'causan', 'provoca', 'provocan', 'destruye', 'destruyen', 'representa', 'representan']);

const relationShapeText = (value) => {
  const concepts = semanticConcepts(value);
  if (concepts.length) return [...new Set(concepts)].sort().join('+');
  const terms = tokens(value).filter((token) => !relationStopWords.has(token)).slice(0, 4);
  return terms.length ? [...new Set(terms)].sort().join('+') : 'unknown';
};

// Keep the compiler's intermediate representation small but directional. A
// topic-only signature is unsafe for comparisons: reversing the two groups
// can reverse the conclusion while leaving all the same vocabulary behind.
export const propositionShapeFor = (value) => {
  const text = normalise(value);
  const comparison = text.match(/^(.*?)\s+(mas|menos)\s+(.+?)\s+que\s+(.+)$/);
  if (comparison) {
    return {
      subject: relationShapeText(comparison[1]),
      predicate: comparison[2] === 'mas' ? 'more_than' : 'less_than',
      object: relationShapeText(comparison[4]),
    };
  }
  const causal = text.match(/^(.*?)\s+(causa|causan|provoca|provocan|genera|generan|crea|crean|aumenta|aumentan|reduce|reducen|destruye|destruyen)\s+(.+)$/);
  if (causal) {
    const predicate = /^(reduce|reducen|destruye|destruyen)$/.test(causal[2]) ? 'reduces' : 'causes';
    return {
      subject: relationShapeText(causal[1]),
      predicate,
      object: relationShapeText(causal[3]),
    };
  }
  return {};
};

export const semanticSignatureFor = ({ claimType, propositions = [], entities = [], geography = null, period = null, population = null, numbers = [], negated = false } = {}) => {
  const explicit = propositions.filter((item) => item && item.explicit !== false);
  const comparisonLike = claimType === 'comparative' || claimType === 'mixed' || explicit.some((item) => item.type === 'comparative');
  const propositionKeys = explicit.map((item) => {
    const concepts = semanticConcepts(item.text);
    const terms = concepts.length ? concepts : semanticTermFallback(item.text);
    const shape = item.subject && item.predicate && item.object ? item : propositionShapeFor(item.text);
    const relation = shape.subject && shape.predicate && shape.object
      ? `:${shape.predicate}:${shape.subject}:${shape.object}`
      : '';
    return `${item.type || 'mixed'}:${[...new Set(terms)].sort().join('+')}${relation}`;
  }).filter((value) => !value.endsWith(':'));
  const dimensions = [
    claimType || 'unknown',
    `polarity:${negated ? 'negative' : 'positive'}`,
    ...[...new Set(entities.flatMap((entity) => semanticConcepts(entity)))].map((value) => `entity:${value}`),
    ...(geography ? [`geo:${normalise(geography)}`] : []),
    ...(population && comparisonLike ? [`population:${normalise(population)}`] : []),
    ...(period ? [`period:${normalise(period)}`] : []),
    ...numbers.slice(0, 4).map((value) => `number:${normalise(value)}`),
    ...[...new Set(propositionKeys)].sort(),
  ];
  return [...new Set(dimensions)].join('|').slice(0, 600);
};

const regions = ['andalucia', 'aragon', 'asturias', 'baleares', 'canarias', 'cantabria', 'castilla la mancha', 'castilla y leon', 'cataluna', 'comunidad valenciana', 'extremadura', 'galicia', 'madrid', 'murcia', 'navarra', 'pais vasco', 'rioja', 'ceuta', 'melilla'];

const populationAliases = [
  ['personas inmigrantes o extranjeras', ['inmigrante', 'inmigrantes', 'extranjero', 'extranjeros', 'nacido en el extranjero']],
  ['personas residentes', ['residentes', 'poblacion', 'habitantes', 'personas que viven']],
  ['hogares', ['hogar', 'hogares', 'familias']],
  ['personas trabajadoras', ['trabajador', 'trabajadores', 'afiliados', 'ocupado', 'ocupados', 'empleados']],
  ['personas desempleadas', ['parado', 'parados', 'desempleado', 'desempleados', 'personas sin empleo']],
  ['personas beneficiarias', ['beneficiario', 'beneficiarios', 'beneficiaria', 'beneficiarias', 'perceptores', 'receptores de ayudas']],
  ['personas condenadas', ['condenado', 'condenados', 'sentencia firme']],
  ['personas detenidas o investigadas', ['detenido', 'detenidos', 'investigado', 'investigados']],
  ['alumnado', ['alumno', 'alumnos', 'estudiante', 'estudiantes', 'escolar']],
  ['pacientes', ['paciente', 'pacientes', 'personas en lista de espera']],
  ['personas jóvenes', ['joven', 'jovenes', 'jóvenes', 'menor', 'menores']],
  ['mujeres y hombres', ['mujeres', 'hombres', 'sexo']],
];

const claimTypeFor = (value) => {
  const text = normalise(value);
  if (includesAny(text, ['deberia', 'deberian', 'justo', 'prioridad', 'merecen', 'deberia recibir'])) return 'normative';
  if (['que significa', 'que se entiende por', 'significado de', 'que es'].some((phrase) => containsPhrase(text, phrase)) || includesAny(text, ['se considera', 'son parados', 'parados ocultos', 'fijos discontinuos', 'definicion'])) return 'definition';
  if (includesAny(text, ['causa', 'causan', 'causal', 'provoca', 'por culpa', 'genera', 'crea inseguridad', 'crean inseguridad', 'relaciona', 'aumenta la', 'reduce los', 'destruye'])) return 'causal';
  if (includesAny(text, ['pasara', 'caera', 'destruira', 'preve', 'pronostico', 'va a'])) return 'predictive';
  if (includesAny(text, ['ley', 'legal', 'puede desalojar', 'obligatorio', 'prohibido', 'derecho', 'reutilizar', 'reutilizacion', 'documentos publicos', 'informacion publica', 'datos publicos'])) return 'legal';
  if (includesAny(text, ['cada vez', 'sube', 'baja', 'crece', 'crecimiento', 'aumento', 'aumenta', 'disminuye', 'record', 'historico', 'se esta volviendo'])) return 'trend';
  if (includesAny(text, ['mas que', 'menos que', 'mayor', 'menor', 'el que mas', 'el que menos', 'ranking', 'puesto', 'europa'])) return 'comparative';
  return 'descriptive';
};

const cleanClause = (value) => String(value || '')
  .replace(/^[\s,;:]+|[\s,;:.!?]+$/g, '')
  .replace(/^(?:pero|aunque|sin embargo|mientras que|por eso|por tanto|por ello)\s+/i, '')
  .trim();

const hasIndependentPredicate = (value) => {
  const text = normalise(value);
  return includesAny(text, [
    ' es ', ' son ', ' hay ', ' tiene ', ' tienen ', ' recibe ', ' reciben ',
    ' causa ', ' causan ', ' genera ', ' generan ', ' crea ', ' crean ',
    ' sube ', ' baja ', ' crece ', ' aumenta ', ' disminuye ', ' reduce ',
    ' recorta ', ' quita ', ' transfiere ', ' llega ', ' llegan ',
    ' cobra ', ' cobran ', ' representa ', ' representan ', ' demuestra ',
  ]) || /^(?:es|son|hay|tiene|tienen|recibe|reciben|causa|causan|genera|generan|crea|crean|sube|baja|crece|aumenta|disminuye|reduce|recorta|quita|transfiere|llega|llegan|cobra|cobran|representa|representan|demuestra)\b/.test(text);
};

const splitExplicitClauses = (value) => {
  const original = String(value || '').trim();
  if (!original) return [];

  // First split only on discourse markers that usually join separate claims.
  // This deliberately avoids splitting every "y": lists such as "empleo,
  // vivienda y sanidad" are context, not three independent propositions.
  let clauses = original
    .replace(/\s*;\s*/g, ' | ')
    .replace(/\s*,?\s+(?:pero|aunque|sin embargo|mientras que|por eso|por tanto|por ello|así que)\s+/gi, ' | ')
    .split('|')
    .map(cleanClause)
    .filter((clause) => clause.length >= 8);

  // A bounded second pass handles the common two-claim form "X y Y" only
  // when both sides look like clauses. This prevents ordinary noun lists
  // from becoming noisy claim breakdowns.
  if (clauses.length === 1) {
    const match = clauses[0].match(/^(.*?)\s+y\s+(.*)$/i);
    if (match && match[1].length >= 8 && match[2].length >= 8 && hasIndependentPredicate(match[1]) && hasIndependentPredicate(match[2])) {
      clauses = [cleanClause(match[1]), cleanClause(match[2])].filter((clause) => clause.length >= 8);
    }
  }

  return clauses.length > 1 ? clauses.slice(0, 4) : [original];
};

const impliedFor = (claimType, value) => {
  const text = normalise(value);
  if (includesAny(text, ['transferencia', 'millones', 'presupuesto', 'gastos de personal', 'quita', 'recorta']) && includesAny(text, ['gobierno', 'ministerio', 'educacion', 'presidencia'])) {
    return [{ text: 'La formulación puede implicar un recorte de servicios o una asignación concreta de personal, que necesita partidas y ejecución presupuestaria específicas.', type: 'mixed', explicit: false }];
  }
  if (claimType === 'causal') return [{ text: 'La relación causal propuesta necesita evidencia que distinga asociación, mecanismo y otras explicaciones.', type: 'causal', explicit: false }];
  if (claimType === 'comparative') return [{ text: 'La comparación necesita una métrica, población, periodo y ámbito comunes.', type: 'comparative', explicit: false }];
  if (claimType === 'normative') return [{ text: 'La frase contiene una preferencia sobre prioridades públicas, además de cualquier afirmación factual.', type: 'normative', explicit: false }];
  if (claimType === 'predictive') return [{ text: 'La predicción necesita un plazo, indicador y condición que permitan comprobarla.', type: 'predictive', explicit: false }];
  if (claimType === 'legal') return [{ text: 'La respuesta jurídica depende del supuesto concreto, la jurisdicción y la norma vigente.', type: 'legal', explicit: false }];
  if (includesAny(text, ['destruida', 'destruido', 'fatal', 'colapsado', 'colapsada', 'caos', 'ruina', 'todo va peor', 'no se puede vivir'])) {
    return [{ text: 'La expresión usa una valoración amplia: hay que concretar qué resultado, periodo y territorio permitirían comprobarla.', type: 'definition', explicit: false }];
  }
  return [];
};

export const deterministicFallbackCompiler = (text) => {
  const original = String(text || '').trim().slice(0, 300);
  const normalized = normalise(original);
  const explicitTexts = splitExplicitClauses(original);
  const explicitPropositions = explicitTexts.map((clause) => ({ text: clause, type: claimTypeFor(clause), explicit: true, ...propositionShapeFor(clause) }));
  const explicitTypes = [...new Set(explicitPropositions.map((item) => item.type))];
  const claimType = explicitTypes.length > 1 ? 'mixed' : (explicitTypes[0] || claimTypeFor(original));
  const entities = entityAliases.filter(([, aliases]) => aliases.some((alias) => containsPhrase(normalized, alias))).map(([entity]) => entity);
  const geography = normalized.includes('espana') || normalized.includes('nacional')
    ? 'España'
    : regions.find((region) => normalized.includes(region)) || null;
  const population = populationAliases.find(([, aliases]) => aliases.some((alias) => containsPhrase(normalized, alias)))?.[0] || null;
  const years = [...normalized.matchAll(/\b(19\d{2}|20\d{2})\b/g)].map((match) => match[1]);
  const period = years.length ? [...new Set(years)].join('–') : /hace\s+(\d+)\s+anos?/.exec(normalized)?.[0] || null;
  const numbers = [...original.matchAll(/\b\d[\d.,%]*\b/g)].map((match) => match[0]).filter((value) => !/^(19|20)\d{2}$/.test(value)).slice(0, 12);
  const retrievalHints = [...new Set([...tokens(original).slice(0, 10), ...entities, ...(geography ? [geography] : [])])].slice(0, 12);
  const impliedPropositions = [...new Map(
    explicitTypes
      .flatMap((type) => impliedFor(type, original))
      .map((item) => [item.text, item]),
  ).values()];
  const propositions = [
    ...explicitPropositions,
    ...impliedPropositions,
  ];
  return {
    normalized: original || 'Afirmación vacía',
    claimType,
    propositions,
    entities,
    numbers,
    geography,
    period,
    population,
    explicitPropositions,
    impliedPropositions,
    retrievalHints,
    semanticSignature: semanticSignatureFor({ claimType, propositions, entities, geography, period, population, numbers, negated: hasNegation(original) }),
    clarificationRequired: claimType === 'normative' || claimType === 'causal' || impliedPropositions.length > 0 || !original,
  };
};
