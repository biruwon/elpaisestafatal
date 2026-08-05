const normalise = (value) => String(value || '')
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/ñ/g, 'n')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const numberWordTokens = ['cero', 'uno', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciseis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa', 'cien', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
const textualNumberPattern = new RegExp(`\\b(?:${numberWordTokens.join('|')})(?:\\s+(?:y\\s+)?(?:${numberWordTokens.join('|')}|mil|mill[oó]n|millones|bill[oó]n|billones)){0,4}(?:\\s+por\\s+ciento)?\\b`, 'gi');
const textualNumberMatches = (value) => [...normalise(value).matchAll(textualNumberPattern)]
  .map((match) => match[0])
  .filter((match) => /(?:mil|millon|billon|por ciento)/.test(match));

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
const hasNegation = (value) => {
  const text = normalise(value);
  // In Spanish, “no deja/dejan de subir” describes a persistent rise; the
  // “no” is part of the idiom rather than a negation of the proposition.
  if (/\bno\s+(?:deja|dejan|para|paran)\s+de\s+(?:subir|aumentar|crecer|encarecer|encarecerse)\b/.test(text) || /\bno\s+da\s+abasto\b/.test(text)) return false;
  return /\b(?:no|nunca|jamas|nadie|ningun|ninguna)\b/i.test(text);
};

const entityAliases = [
  ['gobierno de España', ['gobierno', 'moncloa', 'sanchez', 'presidencia']],
  ['inmigración', ['inmigracion', 'inmigrante', 'inmigrantes', 'migrante', 'migrantes', 'migratoria', 'migratorio', 'extranjero', 'extranjera', 'extranjeros', 'extranjeras', 'marroqui', 'marroquies', 'rumano', 'rumanos', 'latino', 'latinos', 'llegada', 'llegadas', 'flujo', 'flujos', 'patera', 'pateras', 'asilo', 'invasion', 'invasión']],
  ['vivienda', ['vivienda', 'viviendas', 'alquiler', 'alquileres', 'hipoteca', 'hipotecas', 'piso', 'pisos', 'casa', 'casas']],
  ['empleo', ['empleo', 'trabajo', 'trabajos', 'paro', 'desempleo', 'salario', 'salarios', 'ocupado', 'ocupados']],
  ['impuestos', ['impuestos', 'tributos', 'fiscalidad', 'hacienda']],
  ['sanidad', ['sanidad', 'hospital', 'medico', 'salud', 'espera']],
  ['seguridad y delincuencia', ['delincuencia', 'delito', 'delitos', 'delinque', 'delinquen', 'delinquido', 'delictivo', 'delictiva', 'delictivos', 'crimen', 'inseguridad', 'inseguro', 'insegura', 'seguridad', 'seguro', 'segura', 'peligrosa', 'peligro', 'violencia', 'violento', 'agresiones', 'hurtos', 'robos', 'estafas']],
  ['educación', ['educacion', 'colegio', 'escuela', 'becas', 'universidad']],
  ['Europa', ['europa', 'europeo', 'europea', 'ue']],
];

// These concepts are deliberately broader than editorial claim aliases. They
// give equivalent long-tail wording one stable family key without pretending
// that every semantically related sentence is the same published claim.
const semanticConceptAliases = [
  ['immigration', ['inmigracion', 'inmigrante', 'inmigrantes', 'migrante', 'migrantes', 'migratoria', 'migratorio', 'extranjero', 'extranjera', 'extranjeros', 'extranjeras', 'marroqui', 'marroquies', 'rumano', 'rumanos', 'latino', 'latinos', 'senegales', 'colombiano', 'colombianos', 'venezolano', 'venezolanos', 'llegada', 'llegadas', 'flujo', 'flujos', 'patera', 'pateras', 'asilo', 'invasion', 'invasión']],
  ['crime', ['delincuencia', 'delito', 'delitos', 'delinque', 'delinquen', 'delinquido', 'delictivo', 'delictiva', 'delictivos', 'crimen', 'inseguridad', 'inseguro', 'insegura', 'seguridad', 'seguro', 'segura', 'peligrosa', 'peligro', 'violencia', 'violento', 'agresiones', 'hurtos', 'robos', 'estafas']],
  ['housing', ['vivienda', 'viviendas', 'alquiler', 'alquileres', 'hipoteca', 'hipotecas', 'piso', 'pisos', 'casa', 'casas', 'vacio', 'vacias']],
  ['rental_housing', ['alquiler', 'alquileres', 'renta de alquiler', 'rentas de alquiler', 'rent']],
  ['employment', ['empleo', 'trabajo', 'trabajos', 'paro', 'desempleo', 'salario', 'salarios', 'ocupado', 'ocupados', 'trabajador', 'trabajadores']],
  ['unemployment', ['paro', 'desempleo', 'desempleado', 'desempleados', 'tasa de paro', 'tasa de desempleo', 'no encuentra trabajo', 'no encuentran trabajo']],
  ['taxes', ['impuestos', 'tributos', 'fiscalidad', 'hacienda', 'recaudacion', 'recaudación', 'presion fiscal', 'asfixia fiscal', 'asfixian']],
  ['healthcare', ['sanidad', 'hospital', 'medico', 'salud', 'espera', 'paciente', 'pacientes', 'lista de espera']],
  ['education', ['educacion', 'colegio', 'escuela', 'becas', 'universidad', 'alumnado']],
  ['prices', ['inflacion', 'inflación', 'precios', 'precio', 'ipc', 'coste', 'caro', 'cara', 'encarecer', 'encarecerse', 'encarece', 'encarecen', 'encarecimiento', 'casa cuesta mas', 'vivienda cuesta mas', 'la vivienda cada vez cuesta', 'la vivienda cuesta', 'la casa cuesta', 'comprar una casa es mas caro', 'comprar vivienda es mas caro', 'precio vivienda']],
  ['benefits', ['ayudas', 'ayuditas', 'paguita', 'paguitas', 'prestacion', 'prestaciones', 'pension', 'pensiones', 'subsidio', 'beneficio', 'beneficios sociales', 'ventajas sociales']],
  ['budget', ['presupuesto', 'presupuestos', 'millones', 'transferencia', 'gasto', 'gastos', 'recorta', 'recorte', 'quita']],
  ['politics', ['gobierno', 'ministerio', 'presidencia', 'sanchez', 'sánchez', 'partido', 'politica', 'política']],
  ['vote_purchase', ['compra votos', 'compra votos dando ayudas', 'compra votos con ayudas', 'compra de votos', 'compran votos', 'pagan votos', 'pagar votos', 'paga a la gente para que le vote', 'pagar a la gente para que vote', 'comprar el voto']],
  ['cost_of_living', ['coste de vida', 'llegar a fin de mes', 'no llega para vivir', 'no alcanza para vivir', 'cesta de la compra', 'poder adquisitivo', 'encarecido', 'encarecida', 'caro', 'cara']],
  ['public_finance', ['deuda publica', 'deuda', 'endeudado', 'endeudada', 'quebrada', 'quiebra', 'bancarrota', 'impagable', 'no puede pagar', 'debe mas de lo que produce', 'deficit publico', 'presupuesto publico', 'recaudacion', 'gasto publico', 'presion fiscal', 'fiscalidad', 'gasta mas de lo que ingresa', 'gasto supera ingresos', 'ingresa menos de lo que gasta']],
  ['public_debt_stock', ['deuda publica en euros', 'deuda publica total', 'importe de la deuda publica', 'cuanto dinero debe espana', 'cuanto debe espana en euros', 'cuanto debe espana en dinero', 'deuda de espana en euros', 'deuda publica en millones', 'deuda nominal', 'billones de deuda']],
  ['public_debt_ratio', ['deuda sobre pib', 'deuda publica sobre el pib', 'porcentaje de deuda sobre el pib', 'deuda respecto al pib', 'ratio de deuda', 'deuda como porcentaje del pib']],
  ['income', ['renta', 'ingresos', 'salario', 'salarios', 'sueldo', 'sueldos', 'ingreso familiar', 'ingresos familiares']],
  ['health_access', ['lista de espera', 'listas de espera', 'lista sanitaria', 'listas sanitarias', 'cita medica', 'citas medicas', 'atencion primaria', 'colapsada', 'colapsado', 'saturada', 'saturado', 'saturadas', 'saturados', 'esperas largas', 'esperas enormes', 'espera mas', 'tardan mas en atender', 'tardar mas en atender', 'cada vez tardan mas', 'esperar mas', 'esperar para ser atendido']],
  ['healthcare_collapse', ['sanidad publica colapsada', 'sanidad publica esta colapsada', 'sanidad esta colapsada', 'sanidad publica española colapsada', 'sanidad colapsada', 'sanidad se ha ido a pique', 'sanidad esta desbordada', 'sanidad no da abasto', 'no da abasto', 'no da abasto con la sanidad']],
  ['health_spending', ['gasto sanitario', 'gasto en sanidad', 'gasto en salud', 'dinero en sanidad', 'presupuesto sanitario']],
  ['demography', ['poblacion', 'habitantes', 'demografia', 'fecundidad', 'natalidad', 'envejecimiento', 'menores', 'jovenes', 'joven', 'juvenil', 'juveniles', 'mayores']],
  ['education_outcomes', ['abandono escolar', 'resultados educativos', 'alumnado', 'colegios', 'escuelas', 'becas']],
  ['neet', ['ni estudian ni trabajan', 'ni estudia ni trabaja', 'ninis', 'jovenes ninis', 'fuera de estudio y empleo']],
  ['fixed_discontinuous', ['fijo discontinuo', 'fijos discontinuos', 'contrato fijo discontinuo', 'contratos fijos discontinuos', 'parado oculto', 'parados ocultos', 'parados encubiertos', 'esconden el paro', 'cuentan como empleados aunque no trabajen']],
  ['crime_reporting', ['cifras de delincuencia manipuladas', 'estadisticas de delincuencia manipuladas', 'hurtos se registran como extravios', 'hurtos como perdidas', 'esconden los hurtos']],
  ['minimum_income', ['ingreso minimo vital', 'imv']],
  ['immigration_legal_status', ['debe marcharse', 'tiene que irse', 'debe abandonar espana', 'abandonar espana']],
  ['political_concern', ['preocupacion por la politica', 'politica es la preocupacion', 'preocupacion de la mayoria', 'principal problema politico', 'preocupa la politica']],
  ['employment_record', ['record de ocupacion', 'record de empleo', 'pleno empleo', 'nunca tanta gente trabajando', 'nunca tantos trabajadores', 'nunca habia trabajado tanta gente', 'nunca había trabajado tanta gente', 'tantos trabajadores', 'tanta gente trabajando', 'mas gente trabajando que nunca', 'mas empleo que nunca', 'nunca ha habido tanto empleo']],
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
  ['pension_financing', ['pagan nuestras pensiones', 'pagaran nuestras pensiones', 'pagar nuestras pensiones', 'paga nuestras pensiones', 'sostiene nuestras pensiones', 'financia nuestras pensiones', 'sirve para pagar las pensiones']],
  ['pension_dependency', ['sin inmigracion', 'imprescindible para pagar', 'quebraria las pensiones', 'se hunden las pensiones', 'depende de que sigan llegando inmigrantes', 'dependen de que sigan llegando inmigrantes']],
  ['normative', ['deberia', 'deberian', 'deberia recuperar', 'deberia reducir']],
  ['environment', ['emisiones', 'contaminando']],
  ['justice', ['prision', 'prision preventiva']],
];

const semanticConcepts = (value) => {
  let concepts = semanticConceptAliases
    .filter(([, aliases]) => aliases.some((alias) => containsPhrase(value, alias)))
    .map(([concept]) => concept);
  // “Millones” expresses magnitude, not a budget event. Do not let a
  // population, GDP, debt, or any other numeric claim inherit the budget
  // evidence family unless fiscal/action language is also present.
  if (concepts.includes('budget') && !containsPhrase(value, 'presupuesto') && !containsPhrase(value, 'transferencia') && !containsPhrase(value, 'gasto') && !containsPhrase(value, 'recorte') && !containsPhrase(value, 'recorta') && !containsPhrase(value, 'quita') && !containsPhrase(value, 'partida') && !containsPhrase(value, 'personal')) {
    concepts = concepts.filter((concept) => concept !== 'budget');
  }
  if (concepts.includes('neet')) concepts = concepts.filter((concept) => !['demography', 'employment'].includes(concept));
  if (concepts.includes('unemployment')) concepts = concepts.filter((concept) => concept !== 'employment');
  if (concepts.includes('employment_record')) concepts = concepts.filter((concept) => concept !== 'employment');
  // “Housing becoming more expensive” is a housing-price proposition, not a
  // generic cost-of-living proposition. Keep one stable metric family so
  // paraphrases can reuse the reviewed housing-price evidence.
  if (concepts.includes('housing') && concepts.includes('cost_of_living') && !concepts.includes('prices')) concepts.push('prices');
  if (concepts.includes('housing') && concepts.includes('prices')) concepts = concepts.filter((concept) => concept !== 'cost_of_living');
  // Fiscal-pressure wording often also contains the broad public-finance
  // concept. Keep the narrower tax metric as the reusable family; debt and
  // deficit have their own explicit concepts below.
  if (concepts.includes('taxes') && concepts.includes('public_finance') && !containsPhrase(value, 'deuda') && !containsPhrase(value, 'deficit')) {
    concepts = concepts.filter((concept) => concept !== 'public_finance');
  }
  if (containsPhrase(value, 'deuda publica') && containsPhrase(value, 'pib')) concepts.push('public_debt_ratio');
  if (concepts.includes('public_debt_stock')) concepts = concepts.filter((concept) => !['public_finance', 'public_debt_ratio'].includes(concept));
  if (concepts.includes('public_debt_ratio')) concepts = concepts.filter((concept) => !['public_finance', 'public_debt_stock'].includes(concept));
  return concepts;
};

const semanticTermFallback = (value) => tokens(value).filter((token) => !['espana', 'pais', 'gente', 'cosas', 'problema', 'problemas'].includes(token)).slice(0, 4);

const relationStopWords = new Set(['cobra', 'paga', 'pagan', 'tiene', 'tienen', 'recibe', 'reciben', 'hay', 'existe', 'es', 'son', 'esta', 'estan', 'se', 'ha', 'han', 'sigue', 'siguen', 'cada', 'vez', 'no', 'deja', 'de', 'va', 'a', 'peor', 'mejor', 'sube', 'baja', 'crece', 'crecer', 'aumenta', 'aumentar', 'aumentan', 'incrementa', 'incrementan', 'disminuye', 'disminuyen', 'reduce', 'reducen', 'genera', 'generan', 'crea', 'crean', 'causa', 'causan', 'provoca', 'provocando', 'provocan', 'culpa', 'hace', 'hacen', 'vuelve', 'vuelven', 'trae', 'traen', 'lleva', 'llevan', 'favorece', 'favorecen', 'contribuye', 'contribuyen', 'influye', 'influyen', 'destruye', 'destruyen', 'representa', 'representan', 'dispara', 'disparado', 'disparada', 'encarece', 'encarecen', 'encareciendo', 'abarata', 'abaratan', 'mejora', 'mejoran', 'empeora', 'empeoran', 'cuesta', 'alcanza', 'llega', 'mas', 'menos', 'mayor', 'menor', 'supera', 'inferior', 'encima', 'debajo', 'relacion', 'relacionadas', 'relacionados', 'vinculo', 'vinculada', 'vinculados', 'asociacion', 'asociadas', 'asociados', 'correlacion', 'correlacionadas', 'correlacionados', 'entre', 'van', 'mano', 'que']);

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
  const pairedAssociation = text.match(/^(.*?)\s+(?:y|e)\s+(.*?)\s+(?:estan|son|parecen)\s+(?:relacionadas?|vinculadas?|asociadas?|correlacionadas?)(?:\s+en\s+.+)?$/);
  if (pairedAssociation) {
    return {
      subject: relationShapeText(pairedAssociation[1]),
      predicate: 'associated_with',
      object: relationShapeText(pairedAssociation[2]),
    };
  }
  const relationship = text.match(/^(?:hay|existe)\s+(?:una\s+)?(?:relacion|vinculo|asociacion|correlacion)\s+entre\s+(.+?)\s+(?:y|e)\s+(.+?)(?:\s+en\s+.+)?$/)
    || text.match(/^(.*?)\s+(?:esta|estan|tiene|tienen)\s+(?:relacionad[oa]s?|vinculad[oa]s?|asociad[oa]s?|correlacionad[oa]s?|relacion)\s+(?:con|a)\s+(.+)$/)
    || text.match(/^(.*?)\s+(?:se relaciona|se relacionan|se asocia|se asocian|guarda relacion|guardan relacion|tiene que ver|tienen que ver)\s+(?:con|entre)\s+(.+)$/)
    || text.match(/^(.*?)\s+(?:y|e)\s+(.*?)\s+(?:van|parecen ir)\s+de la mano(?:\s+en\s+.+)?$/);
  if (relationship) {
    return {
      subject: relationShapeText(relationship[1]),
      predicate: 'associated_with',
      object: relationShapeText(relationship[2]),
    };
  }
  const relativeComparison = text.match(/^(.*?)\s+(mejor|peor|igual|distinto)\s+que\s+(.+)$/);
  if (relativeComparison) {
    return {
      subject: relationShapeText(relativeComparison[1]),
      predicate: ({ mejor: 'better_than', peor: 'worse_than', igual: 'equal_to', distinto: 'different_from' })[relativeComparison[2]],
      object: relationShapeText(relativeComparison[3]),
    };
  }
  const positionalComparison = text.match(/^(.*?)\s+(?:esta|se encuentra|queda)\s+por\s+(encima|debajo)\s+de\s+(.+?)\s+en\s+(.+)$/) || text.match(/^(.*?)\s+(?:esta|se encuentra|queda)\s+por\s+(encima|debajo)\s+de\s+(.+)$/);
  if (positionalComparison) {
    return {
      subject: relationShapeText(positionalComparison[1]),
      predicate: positionalComparison[2] === 'encima' ? 'more_than' : 'less_than',
      object: relationShapeText(positionalComparison[3]),
      metric: positionalComparison[4] ? relationShapeText(positionalComparison[4]) : null,
    };
  }
  const superiorityComparison = text.match(/^(.*?)\s+(supera)\s+a\s+(.+?)\s+en\s+(.+)$/)
    || text.match(/^(.*?)\s+(supera|es\s+superior\s+(?:a|al)|es\s+inferior\s+(?:a|al))\s+(.+)$/);
  if (superiorityComparison) {
    return {
      subject: /\b(?:espana|espanol|espanola)\b/.test(text) ? 'espana' : relationShapeText(superiorityComparison[1]),
      predicate: /inferior/.test(superiorityComparison[2]) ? 'less_than' : 'more_than',
      object: /\b(?:europa|europeo|europea|ue)\b/.test(text) ? 'europa' : relationShapeText(superiorityComparison[3]),
    };
  }
  const comparison = text.match(/^(.*?)\s+(mas|menos)\s+(.+?)\s+que\s+(.+)$/);
  if (comparison) {
    return {
      subject: /\b(?:espana|espanol|espanola)\b/.test(text) ? 'espana' : relationShapeText(comparison[1]),
      predicate: comparison[2] === 'mas' ? 'more_than' : 'less_than',
      object: /\b(?:europa|europeo|europea|ue)\b/.test(text) ? 'europa' : relationShapeText(comparison[4]),
    };
  }
  const comparativeCausal = text.match(/^(?:a|con)\s+mas\s+(.+?)\s+(?:hay|aparece|aumenta|sube)\s+mas\s+(.+)$/)
    || text.match(/^cuanto\s+mas\s+(.+?),?\s+mas\s+(.+)$/)
    || text.match(/^desde\s+que\s+(?:hay|existe|llegaron|llego)\s+mas\s+(.+?),?\s+(?:hay|existe|aumenta|sube)\s+mas\s+(.+)$/);
  if (comparativeCausal) {
    return {
      subject: relationShapeText(comparativeCausal[1]),
      predicate: 'causes',
      object: relationShapeText(comparativeCausal[2]),
    };
  }
  const causedByClause = text.match(/^(.*?)\s+(?:esta|estan)\s+provocando\s+(.+)$/)
    || text.match(/^(.*?)\s+(?:porque|ya que|debido a que|por culpa de|por culpa del|por culpa de la)\s+(.+)$/)
    || text.match(/^(.*?)\s+(?:hace|hacen)\s+(?:crecer|aumentar|subir|bajar|disminuir)\s+(.+)$/)
    || text.match(/^(.*?)\s+tiene\s+la\s+culpa\s+de\s+(.+)$/)
    || text.match(/^(.*?)\s+(?:hace|hacen|ha hecho|han hecho)\s+que\s+(.+)$/)
    || text.match(/^(.*?)\s+(?:esta|estan)\s+detras\s+(?:de|del|la|los|las)\s+(.+)$/)
    || text.match(/^(.*?)\s+(?:es|son)\s+responsable(?:s)?\s+de\s+(.+)$/);
  if (causedByClause) {
    return {
      subject: relationShapeText(causedByClause[1]),
      predicate: 'causes',
      object: relationShapeText(causedByClause[2]),
    };
  }
  const causal = text.match(/^(.*?)\s+(causa|causan|provoca|provocan|genera|generan|crea|crean|aumenta|aumentan|incrementa|incrementan|reduce|reducen|destruye|destruyen|trae|traen|lleva|llevan|vuelve|vuelven|favorece|favorecen|contribuye|contribuyen|influye|influyen)\s+(.+)$/);
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

const trendDirectionFor = (value) => {
  const text = normalise(value);
  if (/\b(?:mejora|mejoran|va a mejor|van a mejor|va mejor|van mejor|esta mejorando|estan mejorando)\b/.test(text)) return 'improving';
  if (/\b(?:empeora|empeoran|va a peor|van a peor|va peor|van peor|esta empeorando|estan empeorando)\b/.test(text)) return 'worsening';
  if (/(?:cada vez hay|cada vez existen|cada vez se ven|cada vez)\s+menos|\b(?:baja|bajan|bajo|bajando|bajaron|ha bajado|han bajado|cae|caen|cayo|cayeron|disminuye|disminuyen|disminuyendo|ha disminuido|han disminuido|reduce|reducen|abarata|abaratan|sigue bajando|no para de bajar|va en descenso|va a la baja)\b/.test(text)) return 'falling';
  if (/(?:cada vez hay|cada vez existen|cada vez se ven|cada vez|cada vez llegan|cada vez llega)\s+mas|\b(?:llegan mas|llega mas|sube|suben|subio|subieron|ha subido|han subido|crece|crecen|aumenta|aumentan|aumentando|est[aá] aumentando|ha aumentado|han aumentado|incrementa|incrementan|dispara|disparado|disparada|se ha disparado|se ha encarecido|se han encarecido|encarece|encarecerse|encarecido|encarecida|encareciendo|encareciendose|cuesta mas|mas caro|mas cara|mucho mas caro|mucho mas cara|mas costoso|mas costosa|no alcanza|no llega para|sigue subiendo|no deja de subir|no dejan de subir|no para de subir|no paran de subir|no deja de crecer|no paran de crecer|va en aumento|va al alza)\b/.test(text)) return 'rising';
  return null;
};

const rankingDirectionFor = (value) => {
  const text = normalise(value);
  const ranking = text.match(/\b(?:paro|desempleo|impuestos|densidad|poblacion|población|salario|renta|ingresos|delincuencia|criminalidad|empleo|vivienda|alquileres?)\s+(?:mas|menos|mayor|menor)\b.*\b(?:de|entre)\b/)
    || text.match(/\b(?:pais|país|paises|países)\s+con\s+(?:mas|menos|mayor|menor)\b/)
    || text.match(/\b(?:primer|ultimo|último)\s+puesto\b/);
  if (/\b(?:lidera|encabeza|esta a la cabeza d(?:e|el)|se situa a la cabeza d(?:e|el))\b/.test(text)) return 'highest';
  if (!ranking) return null;
  return /\b(?:menos|menor|ultimo|último)\b/.test(ranking[0]) || /\b(?:mas|mayor)\s+(?:bajo|baja|bajos|bajas)\b/.test(ranking[0]) ? 'lowest' : 'highest';
};

const priorityDirectionFor = (value) => {
  const text = normalise(value);
  if (/\b(?:primero los espanoles|espanoles primero|los espanoles antes|prioridad para los espanoles)\b/.test(text)) return 'spanish_first';
  if (/\b(?:primero los extranjeros|extranjeros primero|los extranjeros antes|prioridad para los extranjeros)\b/.test(text)) return 'foreign_first';
  return null;
};

export const semanticSignatureFor = ({ claimType, propositions = [], entities = [], geography = null, period = null, population = null, numbers = [], negated = false } = {}) => {
  const explicit = propositions.filter((item) => item && item.explicit !== false);
  const comparisonLike = claimType === 'comparative' || claimType === 'mixed' || explicit.some((item) => item.type === 'comparative');
  const priorityClaim = claimType === 'normative' && explicit.some((item) => priorityDirectionFor(item.text));
  const propositionKeys = explicit.map((item) => {
    const concepts = semanticConcepts(item.text);
    const terms = concepts.length ? concepts : semanticTermFallback(item.text);
    const shape = item.subject && item.predicate && item.object ? item : propositionShapeFor(item.text);
    const trendRelation = item.type === 'trend' ? trendDirectionFor(item.text) : null;
    const rankingRelation = item.type === 'comparative' ? rankingDirectionFor(item.text) : null;
    const priorityRelation = item.type === 'normative' ? priorityDirectionFor(item.text) : null;
    const normalizedTerms = priorityRelation ? ['priority'] : terms;
    const associationPair = shape.predicate === 'associated_with' && shape.subject && shape.object
      ? [shape.subject, shape.object].sort()
      : null;
    const relation = trendRelation
      ? `:trend:${trendRelation}`
      : rankingRelation
        ? `:ranking:${rankingRelation}`
      : priorityRelation
        ? `:priority:${priorityRelation}`
      : associationPair
        ? `:${shape.predicate}:${associationPair[0]}:${associationPair[1]}`
      : shape.subject && shape.predicate && shape.object
        ? `:${shape.predicate}:${shape.subject}:${shape.object}`
        : '';
    return `${item.type || 'mixed'}:${[...new Set(normalizedTerms)].sort().join('+')}${relation}`;
  }).filter((value) => !value.endsWith(':'));
  const dimensions = [
    claimType || 'unknown',
    `polarity:${negated ? 'negative' : 'positive'}`,
    ...(priorityClaim ? [] : [...new Set(entities.flatMap((entity) => semanticConcepts(entity)))].map((value) => `entity:${value}`)),
    ...(geography ? [`geo:${normalise(geography)}`] : []),
    ...(population && comparisonLike ? [`population:${normalise(population)}`] : []),
    ...(period ? [`period:${normalise(period)}`] : []),
    ...numbers.slice(0, 4).map((value) => `number:${normalise(value)}`),
    ...[...new Set(propositionKeys)].sort(),
  ];
  return [...new Set(dimensions)].join('|').slice(0, 600);
};

const regions = [
  'andalucia', 'aragon', 'asturias', 'baleares', 'canarias', 'cantabria', 'castilla la mancha', 'castilla y leon', 'cataluna', 'comunidad valenciana', 'extremadura', 'galicia', 'madrid', 'murcia', 'navarra', 'pais vasco', 'rioja', 'ceuta', 'melilla',
  // Common province/city wording in everyday claims. This is a bounded
  // routing hint, not a substitute for the canonical geography registry.
  'barcelona', 'malaga', 'sevilla', 'valencia', 'alicante', 'zaragoza', 'bilbao', 'palma', 'valladolid', 'vigo', 'a coruna', 'granada', 'cordoba', 'salamanca', 'tarragona', 'girona', 'cadiz', 'jaen', 'almeria', 'toledo', 'santander', 'oviedo', 'pamplona',
];

const populationAliases = [
  ['personas inmigrantes o extranjeras', ['inmigrante', 'inmigrantes', 'extranjero', 'extranjeros', 'nacido en el extranjero']],
  ['personas de una nacionalidad concreta', ['marroqui', 'marroquies', 'rumano', 'rumanos', 'senegales', 'colombiano', 'colombianos', 'venezolano', 'venezolanos', 'latino', 'latinos']],
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
  // Keep comparative “mayor que” out of the older-population dimension. A
  // bare adjective is not enough to identify a population; require the
  // population phrase or an unambiguous demographic term instead.
  ['personas mayores', ['personas mayores', 'adultos mayores', 'tercera edad', '65 anos', 'jubilado', 'jubilados']],
];

const claimTypeFor = (value) => {
  const text = normalise(value);
  if (includesAny(text, ['deberia', 'deberian', 'justo', 'prioridad', 'merecen', 'deberia recibir', 'primero los espanoles', 'espanoles primero', 'los espanoles antes', 'prioridad para los espanoles'])) return 'normative';
  if (['que significa', 'que se entiende por', 'significado de', 'que es'].some((phrase) => containsPhrase(text, phrase)) || includesAny(text, ['se considera', 'son parados', 'parados ocultos', 'fijos discontinuos', 'definicion'])) return 'definition';
  if (includesAny(text, ['causa', 'causan', 'causal', 'porque', 'ya que', 'debido a', 'a causa de', 'por la poca', 'por la falta', 'por culpa', 'tiene la culpa', 'provoca', 'provocando', 'genera', 'crece la', 'hace crecer', 'hace aumentar', 'crea inseguridad', 'crean inseguridad', 'relacion', 'relaciona', 'relacionad', 'vinculo', 'vincula', 'vinculad', 'asociacion', 'asocia', 'asociad', 'correlacion', 'van de la mano', 'hace que', 'hacen que', 'ha hecho que', 'han hecho que', 'vuelve insegur', 'trae', 'lleva', 'contribuye', 'influye', 'incrementa', 'aumenta la', 'reduce los', 'destruye', 'expulsa', 'expulsando', 'esta detras de', 'es responsable de', 'desde que hay mas', 'desde que llegaron mas']) || /^(?:a|con) mas .+ (?:hay|aumenta|sube) mas/.test(text) || /^cuanto mas .+ mas /.test(text)) return 'causal';
  if (includesAny(text, ['pasara', 'caera', 'destruira', 'preve', 'pronostico']) || /\bva a (?:subir|bajar|caer|aumentar|disminuir|mejorar|empeorar|ser|estar)\b/.test(text)) return 'predictive';
  if (includesAny(text, ['ley', 'legal', 'puede desalojar', 'obligatorio', 'prohibido', 'derecho', 'reutilizar', 'reutilizacion', 'documentos publicos', 'informacion publica', 'datos publicos'])) return 'legal';
  if (includesAny(text, ['cada vez', 'sube', 'baja', 'crece', 'creciendo', 'crecimiento', 'aumento', 'aumenta', 'aumentando', 'está aumentando', 'esta aumentando', 'ha aumentado', 'han aumentado', 'ha subido', 'han subido', 'ha bajado', 'han bajado', 'disminuye', 'dispara', 'disparado', 'se ha disparado', 'encarece', 'encarecido', 'encareciendo', 'encareciendose', 'cuesta mas', 'cuesta menos', 'mas caro', 'mas cara', 'mucho mas caro', 'mucho mas cara', 'mas costoso', 'mas costosa', 'no alcanza', 'no llega para', 'empeora', 'mejora', 'no deja de', 'no dejan de', 'no para de', 'no paran de', 'sigue subiendo', 'sigue bajando', 'sigue creciendo', 'siguen creciendo', 'va en aumento', 'va en descenso', 'va al alza', 'va a la baja', 'va a peor', 'van a peor', 'va peor', 'van peor', 'va mejor', 'va a mejor', 'van mejor', 'record', 'historico', 'se esta volviendo'])) return 'trend';
  if ((includesAny(text, ['inmigracion', 'inmigrantes', 'extranjeros', 'extranjero']) && includesAny(text, ['ayuda', 'ayudas', 'prestacion', 'prestaciones', 'subsidio', 'beneficio']) && includesAny(text, ['mas', 'desproporcionad', 'mayor']))
    || includesAny(text, ['mas que', 'menos que', 'mejor que', 'peor que', 'igual que', 'distinto de', 'mayor', 'menor', 'desproporcionad', 'por encima de', 'por debajo de', 'supera', 'inferior a', 'superior a', 'el que mas', 'el que menos', 'pais con mas', 'pais con menos', 'primer puesto', 'ultimo puesto', 'ranking', 'puesto', 'lidera', 'encabeza', 'a la cabeza', 'europa']) || /\b(?:mas|menos|mayor|menor)\b.+\bque\b/.test(text)) return 'comparative';
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
    ' sigue ', ' siguen ', ' mantiene ', ' mantienen ', ' falta ', ' faltan ',
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
    .replace(/\s+(?:porque|ya que|debido a que|por culpa de(?:l| la)?)\s+/gi, ' | ')
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
  if (includesAny(text, ['destruida', 'destruido', 'fatal', 'colapsado', 'colapsada', 'caos', 'ruina', 'desastre', 'cuesta abajo', 'todo va peor', 'no se puede vivir'])) {
    return [{ text: 'La expresión usa una valoración amplia: hay que concretar qué resultado, periodo y territorio permitirían comprobarla.', type: 'definition', explicit: false }];
  }
  return [];
};

const periodFor = (normalized, years) => {
  if (years.length) {
    const quarter = normalized.match(/\b(?:trimestre|t)\s*([1-4])\s+(19\d{2}|20\d{2})\b/) || normalized.match(/\b(19\d{2}|20\d{2})\s*(?:t|q)\s*([1-4])\b/)
      || normalized.match(/\b(primer|segundo|tercer|cuarto)\s+trimestre\s+(?:de\s+)?(19\d{2}|20\d{2})\b/);
    if (quarter) {
      const ordinal = { primer: '1', segundo: '2', tercer: '3', cuarto: '4' }[quarter[1]];
      return ordinal ? `trimestre ${ordinal} ${quarter[2]}` : quarter[0].replace(/\s+/g, ' ').trim();
    }
    return [...new Set(years)].join('–');
  }
  const relative = normalized.match(/\b(?:el|este|durante el|en el)?\s*(?:ano pasado|ultimo ano|año pasado|último año|ano actual|este ano|este año|proximo ano|pr[oó]ximo año|ultimo trimestre|último trimestre|este trimestre|trimestre pasado|mes pasado|este mes)\b/);
  if (relative) return relative[0].replace(/\s+/g, ' ').trim();
  return /hace\s+(?:\d+|[a-z]+(?:\s+[a-z]+){0,2})\s+anos?/.exec(normalized)?.[0] || null;
};

// Keep the long-tail path useful even when the local model is unavailable.
// These are methodological requirements, not facts: they tell retrieval and
// the renderer what kind of evidence is needed without allowing the fallback
// compiler to invent a source, value, or conclusion.
export const evidenceNeedsFor = (value, claimType, propositions = []) => {
  const text = normalise(value);
  const needs = new Set(['metrica', 'periodo']);
  if (claimType === 'comparative' || claimType === 'mixed' || /\b(?:mas|menos|mayor|menor|supera|inferior|superior|ranking|europa)\b/.test(text)) {
    needs.add('comparacion');
    needs.add('denominador');
  }
  if (claimType === 'causal' || propositions.some((item) => item.type === 'causal')) {
    needs.add('causa');
    needs.add('comparacion');
  }
  if (claimType === 'legal') {
    needs.add('norma');
    needs.add('fuente');
  }
  if (claimType === 'normative') needs.add('definicion');
  if (claimType === 'predictive') {
    needs.add('fecha');
    needs.add('metrica');
  }
  if (/\b(?:programa|ayuda|prestacion|beca|subsidio|vivienda publica)\b/.test(text)) needs.add('programa');
  if (/\b(?:presupuesto|millones|transferencia|recorta|recorte|quita|gasto|partida|personal)\b/.test(text)) {
    needs.add('importe');
    needs.add('partida');
    needs.add('impacto');
  }
  if (/\b(?:porcentaje|tasa|proporcion|mayoria|minor[ií]a|por cada|uno de cada|mitad|tercio|cuarto|por habitante)\b/.test(text)) {
    needs.add('tasa');
    needs.add('denominador');
  }
  if (/\b(?:donde|local|municipio|provincia|comunidad|barrio|espana|europa|nacional)\b/.test(text)) needs.add('territorio');
  if (/\b(?:inmigrante|extranjero|residentes|hogares|trabajadores|beneficiarios|alumnos|pacientes|jovenes|mujeres|hombres)\b/.test(text)) needs.add('poblacion');
  if (/\b(?:ejecucion|gastado|gastados|cumplido|entregado|realizado)\b/.test(text)) needs.add('ejecucion');
  if (/\b(?:categoria|tipo de delito|delito concreto|renta|salario|edad)\b/.test(text)) needs.add('categoria');
  return [...needs].slice(0, 8);
};

export const deterministicFallbackCompiler = (text) => {
  const original = String(text || '').trim().slice(0, 300);
  // Conversation wrappers are presentation, not claim semantics. Strip a
  // bounded set before extracting entities, propositions, and family keys so
  // “¿Es verdad que X?” reuses exactly the same evidence as “X”.
  const routingText = original
    .replace(/^[¿?\s]*(?:es verdad que|de verdad que|segun los datos|en el grupo dicen que|mi cunado insiste en que|no me creo que|que hay de cierto en que)\s+/i, '')
    .replace(/[?¿!¡]+$/g, '')
    .trim();
  const normalized = normalise(routingText);
  const explicitTexts = splitExplicitClauses(routingText);
  const explicitPropositions = explicitTexts.map((clause) => ({ text: clause, type: claimTypeFor(clause), explicit: true, ...propositionShapeFor(clause) }));
  const explicitTypes = [...new Set(explicitPropositions.map((item) => item.type))];
  const causalConnector = /\b(?:porque|ya que|debido a que|por culpa de(?:l| la)?)\b/.test(normalized);
  const claimType = causalConnector ? 'causal' : (explicitTypes.length > 1 ? 'mixed' : (explicitTypes[0] || claimTypeFor(routingText)));
  const entities = entityAliases.filter(([, aliases]) => aliases.some((alias) => containsPhrase(normalized, alias))).map(([entity]) => entity);
  const geography = normalized.includes('espana') || normalized.includes('espanol') || normalized.includes('espanola') || normalized.includes('nacional')
    ? 'España'
    : regions.find((region) => normalized.includes(region)) || null;
  const population = populationAliases.find(([, aliases]) => aliases.some((alias) => containsPhrase(normalized, alias)))?.[0] || null;
  const years = [...normalized.matchAll(/\b(19\d{2}|20\d{2})\b/g)].map((match) => match[1]);
  const period = periodFor(normalized, years);
  const numbers = [...new Set([
    ...[...routingText.matchAll(/\b\d[\d.,%]*\b/g)].map((match) => match[0]).filter((value) => !/^(19|20)\d{2}$/.test(value)),
    ...textualNumberMatches(routingText),
  ])].slice(0, 12);
  const retrievalHints = [...new Set([...tokens(routingText).slice(0, 10), ...entities, ...(geography ? [geography] : [])])].slice(0, 12);
  const impliedPropositions = [...new Map(
    explicitTypes
    .flatMap((type) => impliedFor(type, routingText))
      .map((item) => [item.text, item]),
  ).values()];
  const propositions = [
    ...explicitPropositions,
    ...impliedPropositions,
  ];
  const evidenceNeeds = evidenceNeedsFor(routingText, claimType, propositions);
  const signaturePropositions = causalConnector
    ? [...propositions, { text: routingText, type: 'causal', explicit: true }]
    : propositions;
  return {
    normalized: routingText || 'Afirmación vacía',
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
    evidenceNeeds,
    semanticSignature: semanticSignatureFor({ claimType, propositions: signaturePropositions, entities, geography, period, population, numbers, negated: hasNegation(routingText) }),
    clarificationRequired: claimType === 'normative' || claimType === 'causal' || impliedPropositions.length > 0 || !routingText,
  };
};
