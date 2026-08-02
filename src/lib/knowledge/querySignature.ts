const stopWords = new Set([
  'como', 'esta', 'este', 'para', 'pero', 'que', 'sus', 'tiene', 'una', 'uno',
  'unas', 'unos', 'en', 'el', 'la', 'los', 'las', 'un', 'del', 'de', 'y', 'o',
  'a', 'por', 'con', 'segun', 'dicen', 'hay', 'todo', 'todos', 'toda', 'cada',
  'vez', 'mi', 'mis', 'tu', 'tus', 'me', 'se', 'le', 'les', 'es', 'son', 'ser',
]);

const normalize = (value: string): string => value.toLocaleLowerCase('es').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();

const conceptAliases: Array<[string, string[]]> = [
  ['immigration', ['inmigracion', 'inmigrante', 'inmigrantes', 'migrante', 'migrantes', 'extranjero', 'extranjeros', 'patera', 'pateras', 'asilo']],
  ['crime', ['delincuencia', 'delito', 'delitos', 'crimen', 'inseguridad', 'inseguro', 'peligrosa', 'peligro', 'violencia', 'robos']],
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
  if (/(causa|causan|causal|provoca|por culpa|genera|crea inseguridad|crean inseguridad|relaciona|aumenta la|reduce los|destruye)/.test(text)) return 'causal';
  if (/(pasara|caera|destruira|preve|pronostico|va a)/.test(text)) return 'predictive';
  if (/(ley|legal|puede desalojar|obligatorio|prohibido|derecho)/.test(text)) return 'legal';
  if (/(cada vez|sube|baja|crece|crecimiento|aumento|aumenta|disminuye|record|historico)/.test(text)) return 'trend';
  if (/(mas que|menos que|mayor|menor|el que mas|el que menos|ranking|puesto|europa)/.test(text)) return 'comparative';
  return 'descriptive';
};

const semanticTokens = (text: string): string[] => [...new Set(
  text.split(' ').filter((token) => token.length > 3 && !stopWords.has(token) && !['espana', 'pais', 'gente', 'cosas', 'problema', 'problemas'].includes(token)),
)].slice(0, 4);

const relationStopWords = new Set(['cobra', 'paga', 'pagan', 'tiene', 'tienen', 'recibe', 'reciben', 'hay', 'es', 'son', 'esta', 'estan', 'sube', 'baja', 'crece', 'aumenta', 'aumentan', 'disminuye', 'disminuyen', 'reduce', 'reducen', 'genera', 'generan', 'crea', 'crean', 'causa', 'causan', 'provoca', 'provocan', 'destruye', 'destruyen', 'representa', 'representan']);

const relationShape = (value: string): string => {
  const concepts = conceptAliases.filter(([, aliases]) => aliases.some((alias) => containsAlias(normalize(value), alias))).map(([concept]) => concept);
  if (concepts.length) return [...new Set(concepts)].sort().join('+');
  const terms = normalize(value).split(' ').filter((token) => token.length > 2 && !stopWords.has(token) && !relationStopWords.has(token) && !['pais', 'gente', 'cosas', 'problema', 'problemas'].includes(token)).slice(0, 4);
  return terms.length ? terms.sort().join('+') : 'unknown';
};

const directionalRelation = (text: string): string | null => {
  const comparison = text.match(/^(.*?)\s+(mas|menos)\s+(.+?)\s+que\s+(.+)$/);
  if (comparison) return `comparison:${comparison[2]}:${relationShape(comparison[1])}:${relationShape(comparison[4])}`;
  const causal = text.match(/^(.*?)\s+(causa|causan|provoca|provocan|genera|generan|crea|crean|aumenta|aumentan|reduce|reducen|destruye|destruyen)\s+(.+)$/);
  if (causal) {
    const predicate = /^(reduce|reducen|destruye|destruyen)$/.test(causal[2]) ? 'reduces' : 'causes';
    return `causal:${predicate}:${relationShape(causal[1])}:${relationShape(causal[3])}`;
  }
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
