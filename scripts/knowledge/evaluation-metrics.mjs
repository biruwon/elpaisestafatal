export const traceabilityFor = (result) => {
  const plan = result?.result;
  if (!plan || !Array.isArray(plan.blocks)) return { checked: false, passed: true };
  const evidenceIds = new Set(Array.isArray(plan.evidenceIds) ? plan.evidenceIds : []);
  const evidenceBlocks = plan.blocks.filter((block) => Array.isArray(block?.evidenceIds) || typeof block?.evidenceId === 'string');
  const references = evidenceBlocks.flatMap((block) => [
    ...(Array.isArray(block.evidenceIds) ? block.evidenceIds : []),
    ...(typeof block.evidenceId === 'string' ? [block.evidenceId] : []),
  ]);
  const referencesExist = references.every((id) => evidenceIds.has(id));
  const sourcesValid = references.length === 0 || (Array.isArray(plan.sourceLinks) && plan.sourceLinks.length > 0 && plan.sourceLinks.every((source) => /^https:\/\//i.test(String(source?.url || ''))));
  return { checked: evidenceBlocks.length > 0, passed: referencesExist && sourcesValid };
};

export const evaluateOutcome = ({ item, result, latencyMs }) => {
  const claims = Array.isArray(result?.relatedClaims) ? result.relatedClaims : [];
  // The public resolver exposes the selected reviewed claim in `primary`;
  // older fixture responses used `relatedClaims`.  Evaluate the shared
  // contract, not one transport representation, so corpus results are not
  // falsely reported as misses when the browser/Pages payload is valid.
  const primarySlug = result?.primary?.slug || claims[0]?.slug;
  const known = item.expected.status === 'known';
  const safeScorecard = item.expected.status === 'unknown'
    && result?.status === 'complete'
    && result?.result?.answerMode === 'scorecard'
    && claims.length === 0;
  const safeRelatedContext = item.expected.status === 'unknown'
    && result?.status === 'related'
    && claims.length === 0
    && !result?.primary?.slug;
  const irrelevantMatch = item.expected.status === 'unknown' && (claims.length > 0 || Boolean(result?.primary?.slug));
  const knownPass = !known || primarySlug === item.expected.slug;
  const unknownPass = item.expected.status !== 'unknown' || safeScorecard || safeRelatedContext || (['uncovered', 'draft'].includes(result?.status) && !irrelevantMatch);
  const traceability = traceabilityFor(result);
  const breakdown = Array.isArray(result?.result?.blocks) && result.result.blocks.some((block) => block.type === 'claim_breakdown');
  return {
    id: item.id,
    expected: item.expected,
    status: result?.status || 'error',
    primarySlug,
    knownPass,
    unknownPass,
    irrelevantMatch,
    traceabilityChecked: traceability.checked,
    traceabilityPass: traceability.passed,
    propositionBreakdown: breakdown,
    coverage: result?.result?.coverage || result?.status || 'unknown',
    latencyMs,
  };
};
