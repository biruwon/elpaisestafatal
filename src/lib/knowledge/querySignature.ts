const stopWords = new Set([
  'como', 'esta', 'este', 'para', 'pero', 'que', 'sus', 'tiene', 'una', 'uno',
  'unas', 'unos', 'en', 'el', 'la', 'los', 'las', 'un', 'del', 'de', 'y', 'o',
  'a', 'por', 'con', 'segun', 'dicen', 'hay', 'todo', 'todos', 'toda', 'cada',
  'vez', 'mi', 'mis', 'tu', 'tus', 'me', 'se', 'le', 'les', 'es', 'son', 'ser',
]);

const normalize = (value: string): string => value.toLocaleLowerCase('es').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();

const conceptAliases: Array<[string, string[]]> = [
  ['immigration', ['inmigracion', 'inmigrante', 'inmigrantes', 'migrante', 'migrantes', 'migratoria', 'migratorio', 'extranjero', 'extranjeros', 'marroqui', 'marroquies', 'rumano', 'rumanos', 'latino', 'latinos', 'senegales', 'colombiano', 'colombianos', 'venezolano', 'venezolanos', 'llegada', 'llegadas', 'flujo', 'flujos', 'patera', 'pateras', 'asilo', 'invasion', 'invasión']],
  ['crime', ['delincuencia', 'delito', 'delitos', 'delictivo', 'delictiva', 'delictivos', 'crimen', 'inseguridad', 'inseguro', 'insegura', 'seguridad', 'seguro', 'segura', 'peligrosa', 'peligro', 'violencia', 'violento', 'agresiones', 'hurtos', 'robos', 'estafas']],
  ['housing', ['vivienda', 'viviendas', 'alquiler', 'alquileres', 'hipoteca', 'hipotecas', 'piso', 'pisos', 'casa', 'casas', 'vacio', 'vacias']],
  ['rental_housing', ['alquiler', 'alquileres', 'renta de alquiler', 'rentas de alquiler', 'rent']],
  ['employment', ['empleo', 'trabajo', 'trabajos', 'paro', 'desempleo', 'salario', 'salarios', 'ocupado', 'ocupados', 'trabajador', 'trabajadores']],
  ['unemployment', ['paro', 'desempleo', 'desempleado', 'desempleados', 'tasa de paro', 'tasa de desempleo', 'no encuentra trabajo', 'no encuentran trabajo']],
  ['taxes', ['impuestos', 'tributos', 'fiscalidad', 'hacienda', 'recaudacion', 'presion fiscal']],
  ['healthcare', ['sanidad', 'hospital', 'medico', 'salud', 'espera', 'paciente', 'pacientes', 'lista de espera']],
  ['education', ['educacion', 'colegio', 'escuela', 'becas', 'universidad', 'alumnado']],
  ['prices', ['inflacion', 'precios', 'precio', 'ipc', 'coste', 'caro', 'cara', 'encarecer', 'encarecerse', 'encarece', 'encarecen', 'encarecimiento', 'casa cuesta mas', 'vivienda cuesta mas', 'precio vivienda']],
  ['benefits', ['ayudas', 'prestacion', 'prestaciones', 'pension', 'pensiones', 'subsidio', 'beneficio']],
  ['budget', ['presupuesto', 'presupuestos', 'millones', 'transferencia', 'gasto', 'gastos', 'recorta', 'recorte', 'quita']],
  ['politics', ['gobierno', 'ministerio', 'presidencia', 'sanchez', 'partido', 'politica']],
  ['vote_purchase', ['compra votos', 'compra de votos', 'compran votos', 'pagan votos', 'pagar votos', 'compra votos con ayudas', 'paga a la gente para que le vote', 'pagar a la gente para que vote', 'comprar el voto']],
  ['cost_of_living', ['coste de vida', 'llegar a fin de mes', 'no llega para vivir', 'no alcanza para vivir', 'cesta de la compra', 'poder adquisitivo', 'encarecido', 'encarecida', 'caro', 'cara']],
  ['public_finance', ['deuda publica', 'deuda', 'endeudado', 'endeudada', 'quebrada', 'quiebra', 'bancarrota', 'impagable', 'no puede pagar', 'debe mas de lo que produce', 'deficit publico', 'presupuesto publico', 'recaudacion', 'gasto publico', 'presion fiscal', 'fiscalidad', 'gasta mas de lo que ingresa', 'gasto supera ingresos', 'ingresa menos de lo que gasta']],
  ['public_debt_stock', ['deuda publica en euros', 'deuda publica total', 'importe de la deuda publica', 'cuanto dinero debe espana', 'cuanto debe espana en euros', 'cuanto debe espana en dinero', 'deuda de espana en euros', 'deuda publica en millones', 'deuda nominal', 'billones de deuda']],
  ['public_debt_ratio', ['deuda sobre pib', 'deuda publica sobre el pib', 'porcentaje de deuda sobre el pib', 'deuda respecto al pib', 'ratio de deuda', 'deuda como porcentaje del pib']],
  ['income', ['renta', 'ingresos', 'salario', 'salarios', 'sueldo', 'sueldos', 'ingreso familiar', 'ingresos familiares']],
  ['health_access', ['lista de espera', 'listas de espera', 'cita medica', 'citas medicas', 'atencion primaria', 'colapsada', 'colapsado', 'saturada', 'saturado', 'saturadas', 'saturados', 'esperas largas', 'esperas enormes']],
  ['healthcare_collapse', ['sanidad publica colapsada', 'sanidad publica esta colapsada', 'sanidad esta colapsada', 'sanidad publica española colapsada', 'sanidad colapsada', 'sanidad se ha ido a pique', 'sanidad esta desbordada']],
  ['health_spending', ['gasto sanitario', 'gasto en sanidad', 'gasto en salud', 'dinero en sanidad', 'presupuesto sanitario']],
  ['demography', ['poblacion', 'habitantes', 'demografia', 'fecundidad', 'natalidad', 'envejecimiento', 'menores', 'jovenes', 'mayores']],
  ['education_outcomes', ['abandono escolar', 'resultados educativos', 'alumnado', 'colegios', 'escuelas', 'becas']],
  ['neet', ['ni estudian ni trabajan', 'ni estudia ni trabaja', 'ninis', 'jovenes ninis', 'fuera de estudio y empleo']],
  ['crime_reporting', ['cifras de delincuencia manipuladas', 'estadisticas de delincuencia manipuladas', 'hurtos se registran como extravios', 'hurtos como perdidas', 'esconden los hurtos']],
  ['minimum_income', ['ingreso minimo vital', 'imv']],
  ['immigration_legal_status', ['debe marcharse', 'tiene que irse', 'debe abandonar espana', 'abandonar espana']],
  ['political_concern', ['preocupacion por la politica', 'politica es la preocupacion', 'preocupacion de la mayoria', 'principal problema politico', 'preocupa la politica']],
  ['employment_record', ['record de ocupacion', 'record de empleo', 'pleno empleo', 'nunca tanta gente trabajando', 'nunca tantos trabajadores', 'tantos trabajadores', 'tanta gente trabajando', 'mas gente trabajando que nunca', 'mas empleo que nunca', 'nunca ha habido tanto empleo']],
  ['fixed_discontinuous', ['fijo discontinuo', 'fijos discontinuos', 'contrato fijo discontinuo', 'contratos fijos discontinuos', 'parado oculto', 'parados ocultos', 'parados encubiertos', 'esconden el paro', 'cuentan como empleados aunque no trabajen']],
  ['housing_price_ratio', ['cuesta casi tres veces', 'cuesta tres veces', 'vale el triple', 'se ha triplicado', 'triplica en tres anos']],
  ['law', ['ley', 'leyes', 'legal', 'derecho', 'derechos']],
  ['military_service', ['servicio militar', 'mili', 'personal y disciplina']],
  ['environmental_responsibility', ['reducir emisiones', 'china siga contaminando']],
  ['public_order', ['ley comun', 'barrios donde ya no rige']],
  ['amnesty_equality', ['amnistia', 'igualdad ante la ley']],
  ['gender_law', ['violencia de genero', 'discrimina a los hombres']],
  ['juvenile_justice', ['ley del menor', 'impunidad para delitos graves']],
  ['sexual_consent_law', ['solo si es si', 'agresores sexuales']],
  ['trans_law', ['ley trans', 'cambiar de sexo', 'ningun control']],
  ['religious_freedom', ['libertad religiosa', 'derechos fundamentales']],
  ['pretrial_detention', ['prision preventiva', 'castigo anticipado']],
  ['hate_speech', ['leyes contra el odio', 'opiniones legitimas']],
  ['squatting_law', ['okupa', 'ocupante ilegal', 'propietario', 'desalojar']],
  ['nationality_law', ['ley de nietos', 'nacionalidad']],
  ['gender_equality', ['hombres y mujeres', 'mismos derechos']],
  ['minimum_wage', ['salario minimo', 'smi', '1400 euros']],
  ['pension_system', ['pensiones', 'pension', 'pagar las pensiones', 'pagar la jubilacion']],
  ['pension_financing', ['pagan nuestras pensiones', 'pagaran nuestras pensiones', 'pagar nuestras pensiones', 'sirve para pagar las pensiones']],
  ['pension_dependency', ['sin inmigracion', 'imprescindible para pagar', 'quebraria las pensiones', 'se hunden las pensiones']],
  ['normative', ['deberia', 'deberian', 'deberia recuperar', 'deberia reducir']],
  ['environment', ['emisiones', 'contaminando']],
  ['justice', ['prision', 'prision preventiva']],
];

const containsAlias = (text: string, alias: string): boolean => {
  const normalizedAlias = normalize(alias);
  return normalizedAlias.includes(' ')
    ? (' ' + text + ' ').includes(' ' + normalizedAlias + ' ')
    : text.split(' ').includes(normalizedAlias);
};

const claimType = (text: string): string => {
  if (/(deberia|deberian|justo|prioridad|merecen|primero los espanoles|espanoles primero|los espanoles antes|prioridad para los espanoles)/.test(text)) return 'normative';
  if (/(que significa|que se entiende por|significado de|(?:^|\s)que es(?:\s|$)|definicion|parados ocultos|fijos discontinuos)/.test(text)) return 'definition';
  if (/(causa|causan|causal|porque|ya que|debido a que|por culpa|tiene la culpa|provoca|provocando|genera|crece la|hace crecer|hace aumentar|crea inseguridad|crean inseguridad|relacion|relaciona|relacionad|vinculo|vincula|vinculad|asociacion|asocia|asociad|correlacion|van de la mano|hace que|hacen que|ha hecho que|han hecho que|vuelve insegur|trae|lleva|contribuye|influye|incrementa|aumenta la|reduce los|destruye|esta detras de|es responsable de|desde que hay mas|desde que llegaron mas|cuanto mas .+ mas|(?:a|con) mas .+ (?:hay|aumenta|sube) mas)/.test(text)) return 'causal';
  if (/(pasara|caera|destruira|preve|pronostico)/.test(text) || /\bva a (?:subir|bajar|caer|aumentar|disminuir|mejorar|empeorar|ser|estar)\b/.test(text)) return 'predictive';
  if (/(ley|legal|puede desalojar|obligatorio|prohibido|derecho)/.test(text)) return 'legal';
  if (/(cada vez|sube|baja|crece|crecimiento|aumento|aumenta|ha aumentado|han aumentado|ha subido|han subido|ha bajado|han bajado|disminuye|dispara|disparado|se ha disparado|encarece|encarecido|encareciendo|encareciendose|cuesta mas|cuesta menos|no alcanza|no llega para|empeora|mejora|no deja de|no dejan de|no para de|no paran de|sigue subiendo|sigue bajando|va en aumento|va en descenso|va al alza|va a la baja|va a peor|va peor|va mejor|record|historico)/.test(text)) return 'trend';
  if ((/(inmigracion|inmigrantes|extranjeros?|ayudas?|prestaciones?|subsidios?|beneficios?)/.test(text) && /(mas|desproporcionad|mayor)/.test(text)) || /(mas que|menos que|mejor que|peor que|igual que|distinto de|mayor|menor|desproporcionad|por encima de|por debajo de|supera|inferior a|superior a|el que mas|el que menos|pais con mas|pais con menos|primer puesto|ultimo puesto|ranking|puesto|lidera|encabeza|a la cabeza|europa)/.test(text)) return 'comparative';
  return 'descriptive';
};

const semanticTokens = (text: string): string[] => [...new Set(
  text.split(' ').filter((token) => token.length > 3 && !stopWords.has(token) && !['espana', 'pais', 'gente', 'cosas', 'problema', 'problemas'].includes(token)),
)].slice(0, 4);

const relationStopWords = new Set(['cobra', 'paga', 'pagan', 'tiene', 'tienen', 'recibe', 'reciben', 'hay', 'existe', 'es', 'son', 'esta', 'estan', 'se', 'ha', 'han', 'sigue', 'siguen', 'cada', 'vez', 'no', 'deja', 'de', 'va', 'a', 'peor', 'mejor', 'sube', 'baja', 'crece', 'crecer', 'aumenta', 'aumentar', 'aumentan', 'incrementa', 'incrementan', 'disminuye', 'disminuyen', 'reduce', 'reducen', 'genera', 'generan', 'crea', 'crean', 'causa', 'causan', 'provoca', 'provocando', 'provocan', 'culpa', 'hace', 'hacen', 'vuelve', 'vuelven', 'trae', 'traen', 'lleva', 'llevan', 'favorece', 'favorecen', 'contribuye', 'contribuyen', 'influye', 'influyen', 'destruye', 'destruyen', 'representa', 'representan', 'dispara', 'disparado', 'disparada', 'encarece', 'encarecen', 'encareciendo', 'encareciendose', 'abarata', 'abaratan', 'mejora', 'mejoran', 'empeora', 'empeoran', 'cuesta', 'alcanza', 'llega', 'mas', 'menos', 'mayor', 'menor', 'supera', 'inferior', 'encima', 'debajo', 'relacion', 'relacionadas', 'relacionados', 'vinculo', 'vinculada', 'vinculados', 'asociacion', 'asociadas', 'asociados', 'correlacion', 'correlacionadas', 'correlacionados', 'entre', 'van', 'mano', 'que']);

const relationShape = (value: string): string => {
  let concepts = conceptAliases.filter(([, aliases]) => aliases.some((alias) => containsAlias(normalize(value), alias))).map(([concept]) => concept);
  if (concepts.includes('neet')) concepts = concepts.filter((concept) => !['demography', 'employment'].includes(concept));
  if (concepts.includes('unemployment')) concepts = concepts.filter((concept) => concept !== 'employment');
  if (concepts.length) return [...new Set(concepts)].sort().join('+');
  const terms = normalize(value).split(' ').filter((token) => token.length > 2 && !stopWords.has(token) && !relationStopWords.has(token) && !['pais', 'gente', 'cosas', 'problema', 'problemas'].includes(token)).slice(0, 4);
  return terms.length ? terms.sort().join('+') : 'unknown';
};

const rankingDirection = (text: string): string | null => {
  const ranking = text.match(/\b(?:paro|desempleo|impuestos|densidad|poblacion|población|salario|renta|ingresos|delincuencia|criminalidad|empleo|vivienda|alquileres?)\s+(?:mas|menos|mayor|menor)\b.*\b(?:de|entre)\b/)
    || text.match(/\b(?:pais|país|paises|países)\s+con\s+(?:mas|menos|mayor|menor)\b/)
    || text.match(/\b(?:primer|ultimo|último)\s+puesto\b/);
  if (/\b(?:lidera|encabeza|esta a la cabeza d(?:e|el)|se situa a la cabeza d(?:e|el))\b/.test(text)) return 'highest';
  if (!ranking) return null;
  return /\b(?:menos|menor|ultimo|último)\b/.test(ranking[0]) || /\b(?:mas|mayor)\s+(?:bajo|baja|bajos|bajas)\b/.test(ranking[0]) ? 'lowest' : 'highest';
};

const priorityDirection = (text: string): string | null => {
  if (/\b(?:primero los espanoles|espanoles primero|los espanoles antes|prioridad para los espanoles)\b/.test(text)) return 'spanish_first';
  if (/\b(?:primero los extranjeros|extranjeros primero|los extranjeros antes|prioridad para los extranjeros)\b/.test(text)) return 'foreign_first';
  return null;
};

const associationRelation = (text: string): string | null => {
  const paired = text.match(/^(.*?)\s+(?:y|e)\s+(.*?)\s+(?:estan|son|parecen)\s+(?:relacionadas?|vinculadas?|asociadas?|correlacionadas?)(?:\s+en\s+.+)?$/)
    || text.match(/^(?:hay|existe)\s+(?:una\s+)?(?:relacion|vinculo|asociacion|correlacion)\s+entre\s+(.+?)\s+(?:y|e)\s+(.+?)(?:\s+en\s+.+)?$/)
    || text.match(/^(.*?)\s+(?:esta|estan|tiene|tienen)\s+(?:relacionad[oa]s?|vinculad[oa]s?|asociad[oa]s?|correlacionad[oa]s?|relacion)\s+(?:con|a)\s+(.+)$/)
    || text.match(/^(.*?)\s+(?:se relaciona|se relacionan|se asocia|se asocian|guarda relacion|guardan relacion|tiene que ver|tienen que ver)\s+(?:con|entre)\s+(.+)$/)
    || text.match(/^(.*?)\s+(?:y|e)\s+(.*?)\s+(?:van|parecen ir)\s+de la mano(?:\s+en\s+.+)?$/);
  if (!paired) return null;
  const pair = [relationShape(paired[1]), relationShape(paired[2])].sort();
  return `association:associated:${pair[0]}:${pair[1]}`;
};

const directionalRelation = (text: string): string | null => {
  const priority = priorityDirection(text);
  if (priority) return `priority:${priority}`;
  const ranking = rankingDirection(text);
  if (ranking) return `ranking:${ranking}:${relationShape(text)}`;
  const association = associationRelation(text);
  if (association) return association;
  const relativeComparison = text.match(/^(.*?)\s+(mejor|peor|igual|distinto)\s+que\s+(.+)$/);
  if (relativeComparison) return `comparison:${({ mejor: 'better', peor: 'worse', igual: 'equal', distinto: 'different' } as Record<string, string>)[relativeComparison[2]]}:${relationShape(relativeComparison[1])}:${relationShape(relativeComparison[3])}`;
  const positionalComparison = text.match(/^(.*?)\s+(?:esta|se encuentra|queda)\s+por\s+(encima|debajo)\s+de\s+(.+?)\s+en\s+(.+)$/) || text.match(/^(.*?)\s+(?:esta|se encuentra|queda)\s+por\s+(encima|debajo)\s+de\s+(.+)$/);
  if (positionalComparison) return `comparison:${positionalComparison[2] === 'encima' ? 'more' : 'less'}:${relationShape(positionalComparison[1])}:${relationShape(positionalComparison[3])}`;
  const superiorityComparison = text.match(/^(.*?)\s+(supera|es\s+superior\s+(?:a|al)|es\s+inferior\s+(?:a|al))\s+(.+)$/);
  if (superiorityComparison) return `comparison:${/inferior/.test(superiorityComparison[2]) ? 'less' : 'more'}:${relationShape(superiorityComparison[1])}:${relationShape(superiorityComparison[3])}`;
  const trendLead = /^(?:cada vez hay|cada vez existen|cada vez se ven|cada vez)\s+(?:mas|menos)\b/.test(text);
  const comparison = trendLead ? null : text.match(/^(.*?)\s+(mas|menos)\s+(.+?)\s+que\s+(.+)$/);
  if (comparison) return `comparison:${comparison[2] === 'mas' ? 'more' : 'less'}:${relationShape(comparison[1])}:${relationShape(comparison[4])}`;
  const comparativeCausal = text.match(/^(?:a|con)\s+mas\s+(.+?)\s+(?:hay|aparece|aumenta|sube)\s+mas\s+(.+)$/)
    || text.match(/^cuanto\s+mas\s+(.+?),?\s+mas\s+(.+)$/)
    || text.match(/^desde\s+que\s+(?:hay|existe|llegaron|llego)\s+mas\s+(.+?),?\s+(?:hay|existe|aumenta|sube)\s+mas\s+(.+)$/);
  if (comparativeCausal) return `causal:causes:${relationShape(comparativeCausal[1])}:${relationShape(comparativeCausal[2])}`;
  const causedByClause = text.match(/^(.*?)\s+(?:esta|estan)\s+provocando\s+(.+)$/)
    || text.match(/^(.*?)\s+(?:porque|ya que|debido a que|por culpa de|por culpa del|por culpa de la)\s+(.+)$/)
    || text.match(/^(.*?)\s+(?:hace|hacen)\s+(?:crecer|aumentar|subir|bajar|disminuir)\s+(.+)$/)
    || text.match(/^(.*?)\s+tiene\s+la\s+culpa\s+de\s+(.+)$/)
    || text.match(/^(.*?)\s+(?:hace|hacen|ha hecho|han hecho)\s+que\s+(.+)$/)
    || text.match(/^(.*?)\s+(?:esta|estan)\s+detras\s+(?:de|del|la|los|las)\s+(.+)$/)
    || text.match(/^(.*?)\s+(?:es|son)\s+responsable(?:s)?\s+de\s+(.+)$/);
  if (causedByClause) return `causal:causes:${relationShape(causedByClause[1])}:${relationShape(causedByClause[2])}`;
  const causal = text.match(/^(.*?)\s+(causa|causan|provoca|provocan|genera|generan|crea|crean|aumenta|aumentan|incrementa|incrementan|reduce|reducen|destruye|destruyen|trae|traen|lleva|llevan|vuelve|vuelven|favorece|favorecen|contribuye|contribuyen|influye|influyen)\s+(.+)$/);
  if (causal) {
    const predicate = /^(reduce|reducen|destruye|destruyen)$/.test(causal[2]) ? 'reduces' : 'causes';
    return `causal:${predicate}:${relationShape(causal[1])}:${relationShape(causal[3])}`;
  }
  if (/(?:cada vez hay|cada vez existen|cada vez se ven|cada vez)\s+menos|\b(?:baja|bajan|bajo|bajaron|ha bajado|han bajado|cae|caen|cayo|cayeron|disminuye|disminuyen|disminuyendo|ha disminuido|han disminuido|reduce|reducen|abarata|abaratan|sigue bajando|no deja de bajar|no dejan de bajar|no para de bajar|no paran de bajar|va en descenso|va a la baja)\b/.test(text)) return `trend:falling:${relationShape(text)}`;
  if (/(?:cada vez hay|cada vez existen|cada vez se ven|cada vez)\s+mas|\b(?:sube|suben|subio|subieron|ha subido|han subido|crece|crecen|aumenta|aumentan|ha aumentado|han aumentado|incrementa|incrementan|dispara|disparado|disparada|se ha disparado|se han disparado|encarece|encarecido|encarecida|encareciendo|encareciendose|cuesta mas|no alcanza|no llega para|sigue subiendo|no deja de subir|no dejan de subir|no para de subir|no paran de subir|no deja de crecer|no paran de crecer|va en aumento|va al alza)\b/.test(text)) return `trend:rising:${relationShape(text)}`;
  if (/\b(?:mejora|mejoran|va a mejor|van a mejor|va mejor|van mejor|esta mejorando|estan mejorando)\b/.test(text)) return `trend:improving:${relationShape(text)}`;
  if (/\b(?:empeora|empeoran|va a peor|van a peor|va peor|van peor|esta empeorando|estan empeorando)\b/.test(text)) return `trend:worsening:${relationShape(text)}`;
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
  const priority = priorityDirection(text);
  let concepts = conceptAliases
    .filter(([, aliases]) => aliases.some((alias) => containsAlias(text, alias)))
    .map(([concept]) => concept);
  if (priority) concepts = [];
  if (concepts.includes('neet')) concepts = concepts.filter((concept) => !['demography', 'employment'].includes(concept));
  if (containsAlias(text, 'deuda publica') && containsAlias(text, 'pib')) concepts.push('public_debt_ratio');
  if (concepts.includes('public_debt_stock')) concepts = concepts.filter((concept) => !['public_finance', 'public_debt_ratio'].includes(concept));
  if (concepts.includes('public_debt_ratio')) concepts = concepts.filter((concept) => !['public_finance', 'public_debt_stock'].includes(concept));
  const fallback = priority || concepts.length ? [] : semanticTokens(text);
  const idiomaticRise = /\bno\s+(?:deja|dejan|para|paran)\s+de\s+(?:subir|aumentar|crecer|encarecer|encarecerse)\b/.test(text);
  const polarity = !idiomaticRise && /\b(no|nunca|jamas|nadie|ningun|ninguna)\b/.test(text) ? 'negative' : 'positive';
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

/** Reusable, proposition-specific keys for static claim routing. */
export const semanticFamilyKeys = (signature: string): string[] => {
  const parts = String(signature || '').split('|').filter(Boolean);
  const type = parts.find((part) => part.startsWith('type:')) || '';
  const polarity = parts.find((part) => part.startsWith('polarity:')) || '';
  const relation = parts.find((part) => part.startsWith('relation:')) || '';
  const concepts = parts.filter((part) => part.startsWith('concept:')).sort();
  const terms = parts.filter((part) => part.startsWith('term:')).sort();
  const dimensions = parts.filter((part) => /^(geo|period|population):/.test(part)).sort();
  if (!type || !polarity || (!relation && concepts.length < 2 && terms.length < 2)) return [];
  // Preserve the complete normalized proposition payload. Direction-only
  // keys collapse unrelated rankings such as tax, health, and education.
  const payload = [...new Set([relation, ...concepts, ...terms, ...dimensions].filter(Boolean))].sort();
  if (!payload.length) return [];
  const keys = [`${type}|${polarity}|${payload.join('|')}`];
  // Also emit proposition-specific subset keys. This lets “la vivienda se
  // encarece” reuse a published “el precio de la vivienda sube” family when
  // one wording exposes an extra concept, while the uniqueness guard prevents
  // an ambiguous shared topic from becoming a strong match.
  if (relation && concepts.length > 1) {
    for (const concept of concepts) keys.push(`${type}|${polarity}|${[relation, concept, ...dimensions].sort().join('|')}`);
  }
  return [...new Set(keys)];
};
