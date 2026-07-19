const normalized = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n');

const includesAny = (value, words) => words.some((word) => value.includes(word));

export const handlerForInput = (input, claimType = '') => {
  const text = normalized([input, ...(input?.retrievalHints || []), ...(input?.entities || [])].join(' '));
  const budgetSignal = includesAny(text, ['presupuesto', 'transferencia', 'ministerio', 'gasto de personal', 'recorte', 'partida', 'credito', 'capitulo'])
    || (includesAny(text, ['quita', 'recorta']) && includesAny(text, ['gobierno', 'educacion', 'presidencia']));
  if (budgetSignal) return 'budget_transfer';
  if (claimType === 'normative' || includesAny(text, ['deberia', 'deberian', 'justo', 'prioridad', 'merecen'])) return 'normative';
  if (claimType === 'legal' || includesAny(text, ['ley', 'legal', 'puede desahuciar', 'obligatorio', 'prohibido'])) return 'legal_rule';
  if (claimType === 'causal' || includesAny(text, ['causa', 'provoca', 'por culpa', 'genera', 'aumenta la', 'destruy'])) return 'causal';
  if (claimType === 'predictive' || includesAny(text, ['pasara', 'caera', 'caer', 'acabara', 'destruira', 'preve', 'pronostico', 'va a'])) return 'prediction';
  if (includesAny(text, ['inmigrante', 'extranjero', 'español', 'patera', 'barco', 'ayudas', 'beneficiarios', 'hombres', 'mujeres'])) return 'group_comparison';
  if (includesAny(text, ['porcentaje', 'proporcion', 'mayoria', 'minoría', 'minoria', 'de cada', '%'])) return 'proportion';
  if (claimType === 'comparative' || includesAny(text, ['mas que', 'menos que', 'mayor', 'menor', 'el que mas', 'europa'])) return 'ranking';
  if (includesAny(text, ['cada vez', 'sube', 'baja', 'aumento', 'disminuye', 'record', 'historico', 'historia', 'nunca'])) return 'trend';
  if (includesAny(text, ['significa', 'que es', 'se considera', 'son parados', 'parados ocultos', 'fijos discontinuos', 'definicion'])) return 'definition';
  return 'quantity';
};

export const visualBlockForHandler = (handler, visualId, evidenceIds = []) => {
  if (!visualId || !evidenceIds.length) return null;
  if (handler === 'budget_transfer') return { type: 'money_flow', evidenceIds };
  if (handler === 'trend' || handler === 'prediction') return { type: 'line_chart', visualId, evidenceIds };
  if (handler === 'ranking' || handler === 'group_comparison') return { type: 'comparison_chart', visualId, evidenceIds };
  if (handler === 'causal') return { type: 'comparison_chart', visualId, evidenceIds };
  return null;
};
