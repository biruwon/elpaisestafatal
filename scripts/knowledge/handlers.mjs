import { hasCausalClaimLanguage } from './fallback-compiler.mjs';

const normalized = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n');

const includesAny = (value, words) => words.some((word) => value.includes(word));
const numericThreshold = (text) => /\b(?:mas de|menos de|supera|superan|excede|exceden|rebasa|rebasan|pasa de|pasan de|por encima de|por debajo de|al menos|como minimo|no llega a|no supera|no menos de|no baja de|no cae por debajo de|no es inferior a|no mas de|como maximo|a lo sumo)\b[\s\S]{0,28}\b\d[\d.,]*\b/.test(text);
const namesComparisonTarget = (text) => /\b(?:que|frente a|respecto a|comparad[oa]s? con|versus|vs\.?)\s+(?:(?:la|el|los|las|un|una)\s+)?(?:europa|ue|francia|alemania|italia|portugal|reino unido|estados unidos|inmigrantes|extranjeros|espanoles|hombres|mujeres|mayores|jubilados|jovenes|hogares|familias|otro grupo|resto|media|promedio)\b/.test(text);

export const handlerForInput = (input, claimType = '') => {
  const text = normalized([
    typeof input === 'string' ? input : input?.original || '',
    ...(input?.retrievalHints || []),
    ...(input?.entities || []),
  ].join(' '));
  const propositions = Array.isArray(input?.impliedPropositions)
    ? input.impliedPropositions
    : Array.isArray(input?.propositions) ? input.propositions : [];
  const impliedDefinition = propositions.some((item) => item && item.explicit === false && item.type === 'definition');
  const budgetDomain = includesAny(text, ['presupuesto', 'gasto', 'gastos', 'personal', 'nomina', 'nominas', 'credito', 'partida', 'educacion', 'presidencia', 'ministerio']);
  const explicitFinancialMovement = includesAny(text, ['transferencia', 'transfiere', 'transferir', 'mueve', 'mover', 'quita', 'quitar', 'recorta', 'recorte', 'destina', 'asigna'])
    && includesAny(text, ['millones', 'euros', 'dinero', 'credito']);
  const compressedPersonnelBudgetTransfer = includesAny(text, ['transferencia', 'transfiere', 'transferir'])
    && includesAny(text, ['educacion', 'presidencia', 'hacienda', 'ministerio'])
    && includesAny(text, ['personal', 'nomina', 'nominas', 'gastos'])
    && !includesAny(text, ['funcionario', 'funcionarios', 'plantilla', 'trabajador', 'trabajadores', 'empleado', 'empleados']);
  const budgetMovement = explicitFinancialMovement || budgetDomain
    && includesAny(text, ['se lleva', 'lleva', 'pierde', 'pierden', 'pasa', 'pasan']) || compressedPersonnelBudgetTransfer;
  const budgetSignal = includesAny(text, ['presupuesto', 'gasto de personal', 'recorte', 'partida', 'credito', 'capitulo']) || budgetMovement;
  if (budgetSignal) return 'budget_transfer';
  const governmentEventSignal = includesAny(text, ['gobierno', 'ministerio', 'presidencia', 'moncloa', 'consejo de ministros', 'boe', 'ayuntamiento', 'parlamento'])
    && includesAny(text, ['aprueba', 'aprobo', 'autoriza', 'autorizo', 'acuerda', 'acordo', 'nombra', 'designa', 'cesa', 'concede', 'conceder', 'subvencion', 'ayuda', 'decreto', 'resolucion', 'adjudica', 'adjudico']);
  if (governmentEventSignal) return 'government_event';
  // A numeric threshold is a measurement of one quantity. It becomes a group
  // comparison only when the claim also names a second population or territory.
  if (numericThreshold(text) && !namesComparisonTarget(text)) return 'quantity';
  const groupLanguageSignal = includesAny(text, ['inmigrante', 'extranjero', 'español', 'marroqui', 'rumano', 'latino', 'senegales', 'colombiano', 'venezolano', 'ayudas', 'beneficiarios', 'nacionalidad']);
  if (groupLanguageSignal && includesAny(text, ['desproporcion', 'más ayudas', 'mas ayudas', 'menos ayudas', 'reciben más', 'reciben mas', 'delinquen', 'cometen delitos'])) return 'group_comparison';
  const proportionSignal = includesAny(text, ['porcentaje', 'proporcion', 'mayoria', 'minoría', 'minoria', 'de cada', 'por cada', 'uno de cada', 'mitad', 'tercio', 'cuarto', '%']);
  if (proportionSignal) return 'proportion';
  if ((claimType === 'normative' && includesAny(text, ['deberia', 'deberian', 'justo', 'prioridad', 'merecen', 'debe tener', 'deben tener'])) || includesAny(text, ['deberia', 'deberian', 'justo', 'prioridad', 'merecen'])) return 'normative';
  if (claimType === 'legal' || includesAny(text, ['ley', 'legal', 'okupa', 'okupas', 'ocupante', 'ocupacion', 'desalojo', 'desahucio', 'puede desahuciar', 'obligatorio', 'prohibido', 'reutilizar', 'reutilizacion', 'documentos publicos', 'informacion publica', 'datos publicos'])) return 'legal_rule';
  if (claimType === 'causal' || hasCausalClaimLanguage(text) || includesAny(text, ['dispara', 'disparado', 'aumenta la', 'destruy'])) return 'causal';
  if (claimType === 'predictive' || includesAny(text, ['pasara', 'caera', 'caer', 'acabara', 'destruira', 'preve', 'pronostico', 'va a'])) return 'prediction';
  if (includesAny(text, ['densidad de poblacion', 'densidad poblacion', 'personas por kilometro', 'personas por km']) && includesAny(text, ['comunidad', 'region', 'madrid', 'andalucia'])) return 'ranking';
  if (claimType === 'trend') return 'trend';
  if (claimType === 'definition' || impliedDefinition) return 'definition';
  const groupSignal = includesAny(text, ['inmigrante', 'extranjero', 'español', 'marroqui', 'rumano', 'latino', 'senegales', 'colombiano', 'venezolano', 'patera', 'barco', 'ayudas', 'beneficiarios', 'hombres', 'mujeres', 'mayores', 'jubilados', 'politicos', 'trabajadores', 'hogares', 'jóvenes', 'jovenes']);
  const universalSignal = includesAny(text, ['todos', 'todas', 'todo', 'toda', 'nadie', 'ningun', 'ninguna', 'ninguno']);
  if (hasHouseholdArrangementContrast(text)) return 'group_comparison';
  if (groupSignal && universalSignal) return 'group_comparison';
  if (groupSignal) return 'group_comparison';
  if (universalSignal) return 'proportion';
  if (claimType === 'comparative') return 'ranking';
  if (claimType === 'comparative' || includesAny(text, ['mas que', 'menos que', 'mayor', 'menor', 'el que mas', 'europa'])) return 'ranking';
  if (includesAny(text, ['cada vez', 'sube', 'baja', 'crece', 'crecimiento', 'aumento', 'disminuye', 'record', 'historico', 'historia', 'nunca'])) return 'trend';
  if (includesAny(text, ['que significa', 'que se entiende por', 'significado de', 'que es', 'se considera', 'son parados', 'parados ocultos', 'fijos discontinuos', 'definicion'])) return 'definition';
  return 'quantity';
};

export const hasHouseholdArrangementContrast = (value) => {
  const text = normalized(value);
  const coupleHouseholds = /\bparej\w*\b/.test(text);
  const singlePersonHouseholds = /\b(?:personas?\s+solas?|quien(?:es)?\s+viven\s+solos?|los\s+que\s+viven\s+solos?|solter\w*|hogares?\s+unipersonales?)\b/.test(text);
  return coupleHouseholds && singlePersonHouseholds;
};

// Once the semantic compiler has selected a criteria profile, that profile is
// authoritative for evidence routing. The lexical handler remains only as a
// deterministic fallback when interpretation is unavailable.
export const handlerForSemanticProfile = (profile, fallback = 'quantity') => {
  const mapping = {
    'democratic-power': 'definition',
    'public-corruption': 'allegation',
    'specific-allegation': 'allegation',
    'performance-judgment': 'evaluation',
    'quantitative-measure': 'quantity',
    'causal-effect': 'causal',
  };
  return mapping[profile] || fallback;
};

// Generated paraphrases are for retrieval, not for reclassifying a reviewed
// answer. Route canonical visuals from the published title and claim type so
// a wrapper such as “¿Pasa esto ...?” cannot turn a count into a budget flow.
export const handlerForPublishedClaim = (claim) => handlerForInput(
  { retrievalHints: [String(claim?.title || '')] },
  String(claim?.claimType || ''),
);

export const visualBlockForHandler = (handler, visualId, evidenceIds = []) => {
  if (!visualId || !evidenceIds.length) return null;
  if (visualId === 'precios-hoteles-sube-junio-2026') return { type: 'comparison_chart', visualId, evidenceIds };
  if (visualId === 'espana-esta-sufriendo-un-reemplazo-poblacional') return {
    type: 'evidence_ladder',
    evidenceIds,
    steps: [
      { label: 'Aumenta la población nacida fuera', status: 'available', detail: 'La serie de Eurostat registra un aumento entre 2015 y 2025.' },
      { label: 'Cambia la estructura de edades', status: 'available', detail: 'Baja la proporción menor de 15 años y sube la de 65 años o más.' },
      { label: 'Existe una métrica única de “reemplazo”', status: 'missing', detail: 'La expresión no fija una población de referencia, una definición, un territorio ni un indicador único.' },
      { label: 'Hay una sustitución coordinada demostrada', status: 'missing', detail: 'Los indicadores agregados no demuestran por sí solos coordinación, intención política o una causa atribuida a un grupo.' },
    ],
  };
  if (handler === 'budget_transfer') return { type: 'money_flow', evidenceIds };
  if (handler === 'trend' || handler === 'prediction') return { type: 'line_chart', visualId, evidenceIds };
  if (handler === 'ranking' || handler === 'group_comparison') return { type: 'comparison_chart', visualId, evidenceIds };
  if (handler === 'causal') return { type: 'comparison_chart', visualId, evidenceIds };
  return null;
};
