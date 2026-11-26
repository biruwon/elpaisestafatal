const meaningfulLimitation = (value) => {
  const limitation = String(value || '').trim();
  if (!limitation || /^no se ha localizado evidencia compatible en las fuentes revisadas disponibles/i.test(limitation)) return '';
  return limitation;
};

const cleanNeeds = (values) => [...new Set(values
  .map((value) => String(value || '').trim().replace(/[.;!?]+$/u, ''))
  .filter(Boolean))];

/** Turn a structured evidence gap into a short, useful public answer. */
export const publicEvidenceGapReply = (plan, { attributionUnavailable = false, claim = '' } = {}) => {
  const gap = plan?.blocks?.find((block) => block?.type === 'evidence_gap');
  if (!gap || plan?.evidenceLevel !== 'insufficient' && !attributionUnavailable) return undefined;

  // Focused family composers can explain a measurement gap more precisely
  // than the generic checklist. Preserve that wording only when it carries no
  // evidence or source IDs, so it cannot publish unattributed numeric claims.
  const hasTraceableEvidence = Boolean(plan.evidenceIds?.length || plan.sourceIds?.length || plan.sourceLinks?.length
    || plan.shareableSourceIds?.length
    || plan.blocks.some((block) => block?.evidenceIds?.length
      || ['confirmed', 'data_finding'].includes(block?.type) && block?.points?.length)
    || plan.evidenceSummary?.families?.some((family) => family?.evidenceIds?.length || family?.sourceIds?.length || family?.data?.length));
  if (plan.answerScope?.family === 'tourism-urban-housing-cost'
    && !hasTraceableEvidence
    && typeof plan.shareableReply === 'string'
    && plan.shareableReply.trim()) {
    return plan.shareableReply.trim();
  }

  const limitation = meaningfulLimitation(plan.limitation);
  const opening = attributionUnavailable
    ? 'No hay observaciones compatibles suficientes. Eso no demuestra que la afirmación sea falsa; no se puede confirmar ni descartar con lo disponible.'
    : limitation || String(plan.summary || '').trim() || 'No se ha localizado evidencia compatible para comprobar la afirmación.';
  const cautiousOpening = /\b(?:no demuestra|no permite confirmar|no confirma ni descarta|no se puede confirmar ni descartar)\b/i.test(opening)
    ? opening
    : `${opening} Esto no permite confirmar ni descartar la afirmación.`;
  const needs = cleanNeeds((Array.isArray(gap.needed) && gap.needed.length ? gap.needed : gap.missing || [])
    .filter((item) => typeof item === 'string' && item.trim()));
  const normalizedClaim = String(claim || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n');
  const requestedStartYear = attributionUnavailable && /\bdesde\b/.test(normalizedClaim)
    ? normalizedClaim.match(/\bdesde\s+(?:el\s+)?(?:ano\s+)?(19\d{2}|20\d{2})\b/)?.[1]
    : undefined;
  const alreadyNamesStartYear = requestedStartYear && needs.some((item) => item.includes(requestedStartYear));
  const genericNeed = /^(?:acordar qu[eé] significa|definir qu[eé] se mide|localizar el documento o conjunto de datos|una fuente compatible con el indicador|una fuente p[uú]blica que mida directamente|poblaci[oó]n, territorio y periodo definidos)/i;
  const publicNeeds = requestedStartYear && !alreadyNamesStartYear
    ? [`serie del mismo indicador que incluya ${requestedStartYear} y el periodo final, con territorio y unidad compatibles`, ...needs.filter((item) => !genericNeed.test(item))]
    : needs;
  const requirements = publicNeeds.length
    ? `Qué se necesita para comprobarla:\n\n${cleanNeeds(publicNeeds).map((need) => `• ${need}`).join('\n\n')}`
    : '';
  const nextAction = requestedStartYear && !alreadyNamesStartYear
    ? `Buscar una serie del mismo indicador que incluya ${requestedStartYear} y comparar los periodos con la misma definición, territorio y unidad.`
    : typeof gap.nextAction === 'string' ? gap.nextAction.trim() : '';
  const action = nextAction ? `Siguiente paso: ${nextAction}` : '';
  return [cautiousOpening, requirements, action].filter(Boolean).join('\n\n');
};
