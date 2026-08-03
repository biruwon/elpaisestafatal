const normalized = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n');

const includesAny = (value, words) => words.some((word) => value.includes(word));

export const handlerForInput = (input, claimType = '') => {
  const text = normalized([input, ...(input?.retrievalHints || []), ...(input?.entities || [])].join(' '));
  const propositions = Array.isArray(input?.impliedPropositions)
    ? input.impliedPropositions
    : Array.isArray(input?.propositions) ? input.propositions : [];
  const impliedDefinition = propositions.some((item) => item && item.explicit === false && item.type === 'definition');
  const budgetMovement = includesAny(text, ['transferencia', 'transfiere', 'transferir', 'mueve', 'mover', 'se lleva', 'lleva', 'quita', 'quitar', 'recorta', 'recorte', 'pierde', 'pierden', 'pasa', 'pasan', 'destina', 'asigna', 'recibe'])
    && includesAny(text, ['presupuesto', 'millones', 'dinero', 'gasto', 'gastos', 'personal', 'nomina', 'nominas', 'credito', 'partida', 'educacion', 'presidencia', 'ministerio']);
  const budgetSignal = includesAny(text, ['presupuesto', 'transferencia', 'ministerio', 'gasto de personal', 'recorte', 'partida', 'credito', 'capitulo']) || budgetMovement;
  if (budgetSignal) return 'budget_transfer';
  if (claimType === 'normative' || includesAny(text, ['deberia', 'deberian', 'justo', 'prioridad', 'merecen'])) return 'normative';
  if (claimType === 'legal' || includesAny(text, ['ley', 'legal', 'puede desahuciar', 'obligatorio', 'prohibido', 'reutilizar', 'reutilizacion', 'documentos publicos', 'informacion publica', 'datos publicos'])) return 'legal_rule';
  if (claimType === 'causal' || includesAny(text, ['causa', 'provoca', 'por culpa', 'genera', 'aumenta la', 'destruy'])) return 'causal';
  if (claimType === 'predictive' || includesAny(text, ['pasara', 'caera', 'caer', 'acabara', 'destruira', 'preve', 'pronostico', 'va a'])) return 'prediction';
  if (claimType === 'trend') return 'trend';
  if (claimType === 'definition' || impliedDefinition) return 'definition';
  if (includesAny(text, ['inmigrante', 'extranjero', 'español', 'patera', 'barco', 'ayudas', 'beneficiarios', 'hombres', 'mujeres'])) return 'group_comparison';
  if (claimType === 'comparative') return 'ranking';
  if (includesAny(text, ['porcentaje', 'proporcion', 'mayoria', 'minoría', 'minoria', 'de cada', '%'])) return 'proportion';
  if (claimType === 'comparative' || includesAny(text, ['mas que', 'menos que', 'mayor', 'menor', 'el que mas', 'europa'])) return 'ranking';
  if (includesAny(text, ['cada vez', 'sube', 'baja', 'crece', 'crecimiento', 'aumento', 'disminuye', 'record', 'historico', 'historia', 'nunca'])) return 'trend';
  if (includesAny(text, ['que significa', 'que se entiende por', 'significado de', 'que es', 'se considera', 'son parados', 'parados ocultos', 'fijos discontinuos', 'definicion'])) return 'definition';
  return 'quantity';
};

export const visualBlockForHandler = (handler, visualId, evidenceIds = []) => {
  if (!visualId || !evidenceIds.length) return null;
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
