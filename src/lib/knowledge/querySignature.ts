const stopWords = new Set([
  'como', 'esta', 'este', 'para', 'pero', 'que', 'sus', 'tiene', 'una', 'uno',
  'unas', 'unos', 'en', 'el', 'la', 'los', 'las', 'un', 'del', 'de', 'y', 'o',
  'a', 'por', 'con', 'segun', 'dicen', 'hay', 'todo', 'todos', 'toda', 'cada',
  'vez', 'mi', 'mis', 'tu', 'tus', 'me', 'se', 'le', 'les', 'es', 'son', 'ser',
]);

const normalize = (value: string): string => value.toLocaleLowerCase('es').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();

const conceptAliases: Array<[string, string[]]> = [
  ['immigration', ['inmigracion', 'inmigrante', 'inmigrantes', 'migrante', 'migrantes', 'extranjero', 'extranjeros', 'llegada', 'llegadas', 'flujo', 'flujos', 'patera', 'pateras', 'asilo']],
  ['crime', ['delincuencia', 'delito', 'delitos', 'delictivo', 'delictiva', 'delictivos', 'crimen', 'inseguridad', 'inseguro', 'insegura', 'seguridad', 'peligrosa', 'peligro', 'violencia', 'violento', 'agresiones', 'hurtos', 'robos', 'estafas']],
  ['housing', ['vivienda', 'viviendas', 'alquiler', 'alquileres', 'hipoteca', 'hipotecas', 'piso', 'pisos', 'casa', 'casas', 'vacio', 'vacias']],
  ['employment', ['empleo', 'trabajo', 'trabajos', 'paro', 'desempleo', 'salario', 'salarios', 'ocupado', 'ocupados', 'trabajador', 'trabajadores']],
  ['taxes', ['impuestos', 'tributos', 'fiscalidad', 'hacienda', 'recaudacion', 'presion fiscal']],
  ['healthcare', ['sanidad', 'hospital', 'medico', 'salud', 'espera', 'paciente', 'pacientes', 'lista de espera']],
  ['education', ['educacion', 'colegio', 'escuela', 'becas', 'universidad', 'alumnado']],
  ['prices', ['inflacion', 'precios', 'precio', 'ipc', 'coste', 'caro', 'cara']],
  ['benefits', ['ayudas', 'prestacion', 'prestaciones', 'pension', 'pensiones', 'subsidio', 'beneficio']],
  ['budget', ['presupuesto', 'presupuestos', 'millones', 'transferencia', 'gasto', 'gastos', 'recorta', 'recorte', 'quita']],
  ['politics', ['gobierno', 'ministerio', 'presidencia', 'sanchez', 'partido', 'politica']],
];

const containsAlias = (text: string, alias: string): boolean => {
  const normalizedAlias = normalize(alias);
  return normalizedAlias.includes(' ')
    ? (' ' + text + ' ').includes(' ' + normalizedAlias + ' ')
    : text.split(' ').includes(normalizedAlias);
};

const claimType = (text: string): string => {
  if (/(deberia|deberian|justo|prioridad|merecen)/.test(text)) return 'normative';
  if (/(que significa|que se entiende por|significado de|(?:^|\s)que es(?:\s|$)|definicion|parados ocultos|fijos discontinuos)/.test(text)) return 'definition';
  if (/(causa|causan|causal|provoca|por culpa|genera|crea inseguridad|crean inseguridad|relaciona|relacionad|hace que|hacen que|vuelve insegur|trae|lleva|contribuye|influye|incrementa|aumenta la|reduce los|destruye|(?:a|con) mas .+ (?:hay|aumenta|sube) mas)/.test(text)) return 'causal';
  if (/(pasara|caera|destruira|preve|pronostico)/.test(text) || /\bva a (?:subir|bajar|caer|aumentar|disminuir|mejorar|empeorar|ser|estar)\b/.test(text)) return 'predictive';
  if (/(ley|legal|puede desalojar|obligatorio|prohibido|derecho)/.test(text)) return 'legal';
  if (/(cada vez|sube|baja|crece|crecimiento|aumento|aumenta|disminuye|dispara|disparado|encarece|empeora|mejora|no deja de|va a peor|va peor|va mejor|record|historico)/.test(text)) return 'trend';
  if (/(mas que|menos que|mayor|menor|por encima de|por debajo de|supera|inferior a|superior a|el que mas|el que menos|ranking|puesto|europa)/.test(text)) return 'comparative';
  return 'descriptive';
};

const semanticTokens = (text: string): string[] => [...new Set(
  text.split(' ').filter((token) => token.length > 3 && !stopWords.has(token) && !['espana', 'pais', 'gente', 'cosas', 'problema', 'problemas'].includes(token)),
)].slice(0, 4);

const relationStopWords = new Set(['cobra', 'paga', 'pagan', 'tiene', 'tienen', 'recibe', 'reciben', 'hay', 'es', 'son', 'esta', 'estan', 'se', 'ha', 'han', 'sigue', 'siguen', 'cada', 'vez', 'no', 'deja', 'de', 'va', 'a', 'peor', 'mejor', 'sube', 'baja', 'crece', 'aumenta', 'aumentan', 'incrementa', 'incrementan', 'disminuye', 'disminuyen', 'reduce', 'reducen', 'genera', 'generan', 'crea', 'crean', 'causa', 'causan', 'provoca', 'provocan', 'hace', 'hacen', 'vuelve', 'vuelven', 'trae', 'traen', 'lleva', 'llevan', 'favorece', 'favorecen', 'contribuye', 'contribuyen', 'influye', 'influyen', 'destruye', 'destruyen', 'representa', 'representan', 'dispara', 'disparado', 'disparada', 'encarece', 'encarecen', 'abarata', 'abaratan', 'mejora', 'mejoran', 'empeora', 'empeoran', 'mas', 'menos', 'mayor', 'menor', 'supera', 'inferior', 'encima', 'debajo', 'que']);

const relationShape = (value: string): string => {
  const concepts = conceptAliases.filter(([, aliases]) => aliases.some((alias) => containsAlias(normalize(value), alias))).map(([concept]) => concept);
  if (concepts.length) return [...new Set(concepts)].sort().join('+');
  const terms = normalize(value).split(' ').filter((token) => token.length > 2 && !stopWords.has(token) && !relationStopWords.has(token) && !['pais', 'gente', 'cosas', 'problema', 'problemas'].includes(token)).slice(0, 4);
  return terms.length ? terms.sort().join('+') : 'unknown';
};

const rankingDirection = (text: string): string | null => {
  const ranking = text.match(/\b(?:mas|menos|mayor|menor)\b.*\b(?:de|entre)\b/);
  if (!ranking) return null;
  return /\b(?:menos|menor)\b/.test(ranking[0]) || /\b(?:mas|mayor)\s+(?:bajo|baja|bajos|bajas)\b/.test(ranking[0]) ? 'lowest' : 'highest';
};

const directionalRelation = (text: string): string | null => {
  const ranking = rankingDirection(text);
  if (ranking) return `ranking:${ranking}:${relationShape(text)}`;
  const positionalComparison = text.match(/^(.*?)\s+(?:esta|se encuentra|queda)\s+por\s+(encima|debajo)\s+de\s+(.+?)\s+en\s+(.+)$/) || text.match(/^(.*?)\s+(?:esta|se encuentra|queda)\s+por\s+(encima|debajo)\s+de\s+(.+)$/);
  if (positionalComparison) return `comparison:${positionalComparison[2] === 'encima' ? 'more' : 'less'}:${relationShape(positionalComparison[1])}:${relationShape(positionalComparison[3])}`;
  const superiorityComparison = text.match(/^(.*?)\s+(supera|es\s+superior\s+a|es\s+inferior\s+a)\s+(.+)$/);
  if (superiorityComparison) return `comparison:${/inferior/.test(superiorityComparison[2]) ? 'less' : 'more'}:${relationShape(superiorityComparison[1])}:${relationShape(superiorityComparison[3])}`;
  const comparison = text.match(/^(.*?)\s+(mas|menos)\s+(.+?)\s+que\s+(.+)$/);
  if (comparison) return `comparison:${comparison[2] === 'mas' ? 'more' : 'less'}:${relationShape(comparison[1])}:${relationShape(comparison[4])}`;
  const comparativeCausal = text.match(/^(?:a|con)\s+mas\s+(.+?)\s+(?:hay|aparece|aumenta|sube)\s+mas\s+(.+)$/);
  if (comparativeCausal) return `causal:causes:${relationShape(comparativeCausal[1])}:${relationShape(comparativeCausal[2])}`;
  const causedByClause = text.match(/^(.*?)\s+(?:hace|hacen)\s+que\s+(.+)$/);
  if (causedByClause) return `causal:causes:${relationShape(causedByClause[1])}:${relationShape(causedByClause[2])}`;
  const causal = text.match(/^(.*?)\s+(causa|causan|provoca|provocan|genera|generan|crea|crean|aumenta|aumentan|incrementa|incrementan|reduce|reducen|destruye|destruyen|trae|traen|lleva|llevan|vuelve|vuelven|favorece|favorecen|contribuye|contribuyen|influye|influyen)\s+(.+)$/);
  if (causal) {
    const predicate = /^(reduce|reducen|destruye|destruyen)$/.test(causal[2]) ? 'reduces' : 'causes';
    return `causal:${predicate}:${relationShape(causal[1])}:${relationShape(causal[3])}`;
  }
  if (/(?:cada vez hay|cada vez existen|cada vez se ven)\s+menos|\b(?:baja|bajan|bajo|bajaron|cae|caen|cayo|cayeron|disminuye|disminuyen|reduce|reducen|abarata|abaratan)\b/.test(text)) return `trend:falling:${relationShape(text)}`;
  if (/(?:cada vez hay|cada vez existen|cada vez se ven)\s+mas|\b(?:sube|suben|subio|subieron|crece|crecen|aumenta|aumentan|incrementa|incrementan|dispara|disparado|disparada|encarece|encarecen)\b|no deja de subir|no paran de subir/.test(text)) return `trend:rising:${relationShape(text)}`;
  if (/\b(?:mejora|mejoran|va a mejor|va mejor|esta mejorando|estan mejorando)\b/.test(text)) return `trend:improving:${relationShape(text)}`;
  if (/\b(?:empeora|empeoran|va a peor|va peor|esta empeorando|estan empeorando)\b/.test(text)) return `trend:worsening:${relationShape(text)}`;
  return null;
};

export const canonicalQuerySignature = (value: string): string => [...new Set(
  normalize(value).split(' ').filter((token) => token.length > 2 && !stopWords.has(token)),
)].sort().join(' ').slice(0, 12000);

/**
 * A coarse, deterministic family key for operational clustering.
 *
 * This is deliberately less specific than the local compiler's richer
 * signature: it must be safe to calculate in a Pages Function and in the
 * browser without loading a model. It groups equivalent surface wording,
 * while retaining claim type and polarity so opposites do not collapse.
 */
export const semanticQuerySignature = (value: string): string => {
  const text = normalize(value);
  if (!text) return '';
  const concepts = conceptAliases
    .filter(([, aliases]) => aliases.some((alias) => containsAlias(text, alias)))
    .map(([concept]) => concept);
  const fallback = concepts.length ? [] : semanticTokens(text);
  const polarity = /\b(no|nunca|jamas|nadie|ningun|ninguna)\b/.test(text) ? 'negative' : 'positive';
  const relation = directionalRelation(text);
  const signature = [
    'type:' + claimType(text),
    'polarity:' + polarity,
    ...(relation ? ['relation:' + relation] : []),
    ...[...new Set(concepts)].sort().map((concept) => 'concept:' + concept),
    ...fallback.sort().map((token) => 'term:' + token),
  ];
  return signature.join('|').slice(0, 600);
};
