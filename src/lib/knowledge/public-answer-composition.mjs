const meaningfulLimitation = (value) => {
  const limitation = String(value || '').trim();
  if (!limitation || /^no se ha localizado evidencia compatible en las fuentes revisadas disponibles/i.test(limitation)) return '';
  return limitation;
};

const joinNeeds = (values) => {
  if (values.length < 2) return values[0] || '';
  if (values.length === 2) return `${values[0]} y ${values[1]}`;
  return `${values.slice(0, -1).join('; ')}; y ${values.at(-1)}`;
};

/** Turn a structured evidence gap into a short, useful public answer. */
export const publicEvidenceGapReply = (plan, { attributionUnavailable = false } = {}) => {
  const gap = plan?.blocks?.find((block) => block?.type === 'evidence_gap');
  if (!gap || plan?.evidenceLevel !== 'insufficient') return undefined;

  const limitation = meaningfulLimitation(plan.limitation);
  const opening = attributionUnavailable
    ? limitation || 'No hemos podido vincular los hallazgos a fuentes consultables; por eso no los presentamos como prueba.'
    : limitation || String(plan.summary || '').trim() || 'No se ha localizado evidencia compatible para comprobar la afirmación.';
  const cautiousOpening = /\b(?:no demuestra|no permite confirmar|no confirma ni descarta|no se puede confirmar ni descartar)\b/i.test(opening)
    ? opening
    : `${opening} Esto no permite confirmar ni descartar la afirmación.`;
  const needs = (Array.isArray(gap.needed) && gap.needed.length ? gap.needed : gap.missing || [])
    .filter((item) => typeof item === 'string' && item.trim());
  const requirements = needs.length ? `Qué se necesita para comprobarla: ${joinNeeds(needs)}.` : '';
  const nextAction = typeof gap.nextAction === 'string' ? gap.nextAction.trim() : '';
  const action = nextAction ? `Siguiente paso: ${nextAction}` : '';
  return [cautiousOpening, requirements, action].filter(Boolean).join('\n\n');
};
