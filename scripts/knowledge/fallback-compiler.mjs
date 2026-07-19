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

const entityAliases = [
  ['gobierno de España', ['gobierno', 'moncloa', 'sanchez', 'presidencia']],
  ['inmigración', ['inmigracion', 'inmigrante', 'migrante', 'extranjero', 'patera', 'asilo']],
  ['vivienda', ['vivienda', 'viviendas', 'alquiler', 'hipoteca', 'piso', 'casas']],
  ['empleo', ['empleo', 'trabajo', 'paro', 'desempleo', 'salario', 'ocupados']],
  ['impuestos', ['impuestos', 'tributos', 'fiscalidad', 'hacienda']],
  ['sanidad', ['sanidad', 'hospital', 'medico', 'salud', 'espera']],
  ['seguridad y delincuencia', ['delincuencia', 'delito', 'delitos', 'crimen', 'inseguridad', 'robos']],
  ['educación', ['educacion', 'colegio', 'escuela', 'becas', 'universidad']],
  ['Europa', ['europa', 'europeo', 'europea', 'ue']],
];

const regions = ['andalucia', 'aragon', 'asturias', 'baleares', 'canarias', 'cantabria', 'castilla la mancha', 'castilla y leon', 'cataluna', 'comunidad valenciana', 'extremadura', 'galicia', 'madrid', 'murcia', 'navarra', 'pais vasco', 'rioja', 'ceuta', 'melilla'];

const claimTypeFor = (value) => {
  const text = normalise(value);
  if (includesAny(text, ['deberia', 'deberian', 'justo', 'prioridad', 'merecen', 'deberia recibir'])) return 'normative';
  if (includesAny(text, ['causa', 'causan', 'causal', 'provoca', 'por culpa', 'genera', 'crea inseguridad', 'crean inseguridad', 'relaciona', 'aumenta la', 'reduce los', 'destruye'])) return 'causal';
  if (includesAny(text, ['pasara', 'caera', 'destruira', 'preve', 'pronostico', 'va a'])) return 'predictive';
  if (includesAny(text, ['ley', 'legal', 'puede desalojar', 'obligatorio', 'prohibido', 'derecho'])) return 'legal';
  if (includesAny(text, ['mas que', 'menos que', 'mayor', 'menor', 'el que mas', 'el que menos', 'ranking', 'puesto', 'europa'])) return 'comparative';
  return 'descriptive';
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
  return [];
};

export const deterministicFallbackCompiler = (text) => {
  const original = String(text || '').trim().slice(0, 300);
  const normalized = normalise(original);
  const claimType = claimTypeFor(original);
  const entities = entityAliases.filter(([, aliases]) => aliases.some((alias) => normalized.includes(alias))).map(([entity]) => entity);
  const geography = normalized.includes('espana') || normalized.includes('nacional')
    ? 'España'
    : regions.find((region) => normalized.includes(region)) || null;
  const years = [...normalized.matchAll(/\b(19\d{2}|20\d{2})\b/g)].map((match) => match[1]);
  const period = years.length ? [...new Set(years)].join('–') : /hace\s+(\d+)\s+anos?/.exec(normalized)?.[0] || null;
  const numbers = [...original.matchAll(/\b\d[\d.,%]*\b/g)].map((match) => match[0]).filter((value) => !/^(19|20)\d{2}$/.test(value)).slice(0, 12);
  const retrievalHints = [...new Set([...tokens(original).slice(0, 10), ...entities, ...(geography ? [geography] : [])])].slice(0, 12);
  const propositions = [
    ...(original ? [{ text: original, type: claimType, explicit: true }] : []),
    ...impliedFor(claimType, original),
  ];
  return {
    normalized: original || 'Afirmación vacía',
    claimType,
    propositions,
    entities,
    numbers,
    geography,
    period,
    retrievalHints,
    clarificationRequired: claimType === 'normative' || claimType === 'causal' || !original,
  };
};
