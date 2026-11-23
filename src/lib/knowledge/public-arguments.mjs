import { sourcesForEvidenceIds } from './evidence-source-ids.mjs';

const stringArray = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string');
const argumentVerdicts = new Set(['supported', 'contradicted', 'mixed', 'insufficient', 'not_verifiable']);
export const publicClaimQualification = 'La evidencia no basta para confirmar toda la afirmación.';

export const requiresPublicClaimQualification = (plan, argumentsList) => {
  const breakdown = (Array.isArray(plan?.blocks) ? plan.blocks : []).find((block) => block?.type === 'claim_breakdown');
  const items = Array.isArray(breakdown?.items) ? breakdown.items : [];
  const explicit = items.flatMap((item, index) => item?.explicit === false ? [] : [breakdown.propositionIds?.[index] || `argument-${index + 1}`]);
  if (!explicit.length) return false;
  const publicById = new Map((argumentsList || []).map((argument) => [argument.id, argument]));
  if (explicit.some((id) => !publicById.has(id))) return true;
  return explicit.some((id) => {
    const argument = publicById.get(id);
    return argument.verdict !== 'supported' || !argument.evidenceIds.length || !argument.sourceIds.length;
  });
};

export const publicEvidenceLevelForArguments = (level, plan, argumentsList) => level === 'supported'
  && requiresPublicClaimQualification(plan, argumentsList)
  ? 'limited'
  : level;

export const qualifyPublicClaimReply = (reply) => {
  const text = String(reply || '').trim();
  if (!text) return publicClaimQualification;
  const alreadyStatesSpecificLimit = /\bno (?:demuestra|acredita|prueba|establece) que\b[^.!?]{0,180}\b(?:caus\w*|provoqu\w*|oblig\w*|empuj\w*|lleve?\w*|gener\w*|determin\w*|explique\w*)\b/i.test(text)
    || /\bno mide\b[^.!?]{0,120}\bsi\b[^.!?]{0,100}\b(?:caus\w*|provoqu\w*|oblig\w*|empuj\w*|lleve?\w*|gener\w*|urgencias?)\b/i.test(text);
  if (/no (?:permite|basta para) confirmar toda la afirmaci[oó]n|no demuestra toda la afirmaci[oó]n/i.test(text) || alreadyStatesSpecificLimit) return text;
  return `${publicClaimQualification}\n\n${text}`;
};

// Keep proposition evidence and its public source attribution consistent in
// the Pages response and the local preview response. A list of clauses alone
// is not a per-clause assessment; each item needs a finding, verdict or
// explicitly linked observation before it can be shown as a fact-check.
export const publicArgumentsFromPlan = (plan) => {
  const blocks = Array.isArray(plan?.blocks) ? plan.blocks : [];
  const breakdown = blocks.find((block) => block?.type === 'claim_breakdown');
  if (!Array.isArray(breakdown?.items) || !breakdown.items.length
    || !breakdown.items.every((item) => item && typeof item.text === 'string' && item.text.trim())) return [];
  const evidenceBlocks = blocks.filter((block) => block?.type === 'data_finding' || block?.type === 'confirmed');
  const evidenceByItem = breakdown.items.map((item, index) => {
    const propositionId = breakdown.propositionIds?.[index];
    const explicitEvidenceIds = stringArray(item.evidenceIds) ? item.evidenceIds : [];
    return explicitEvidenceIds.length ? explicitEvidenceIds : evidenceBlocks
      .filter((block) => stringArray(block.propositionIds) && block.propositionIds.includes(propositionId))
      .flatMap((block) => stringArray(block.evidenceIds) ? block.evidenceIds : []);
  });
  const everyItemHasAssessment = breakdown.items.every((item, index) => Boolean(item.verdict
    || typeof item.finding === 'string' && item.finding.trim()
    || evidenceByItem[index].length));
  if (!everyItemHasAssessment) return [];

  return breakdown.items.map((item, index) => {
    const evidenceIds = evidenceByItem[index];
    const relatedFamilySourceIds = (plan.evidenceSummary?.families || [])
      .filter((family) => stringArray(family.evidenceIds) && family.evidenceIds.some((id) => evidenceIds.includes(id)))
      .flatMap((family) => stringArray(family.sourceIds) ? family.sourceIds : []);
    const evidenceSourceIds = sourcesForEvidenceIds(plan, evidenceIds);
    const sourceIds = (stringArray(plan.sourceIds) ? plan.sourceIds : []).filter((sourceId) => (stringArray(item.sourceIds) && item.sourceIds.includes(sourceId))
      || evidenceIds.includes(sourceId) || relatedFamilySourceIds.includes(sourceId) || evidenceSourceIds.includes(sourceId));
    const proposedVerdict = item.verdict === undefined
      ? evidenceIds.length
        ? plan.evidenceLevel === 'supported' ? 'supported' : plan.evidenceLevel === 'limited' ? 'mixed' : 'insufficient'
        : 'insufficient'
      : argumentVerdicts.has(item.verdict) ? item.verdict : 'insufficient';
    const hasTraceableEvidence = evidenceIds.length > 0 && sourceIds.length > 0;
    const verdict = !hasTraceableEvidence && ['supported', 'contradicted', 'mixed'].includes(proposedVerdict)
      ? 'insufficient'
      : proposedVerdict;
    const matchingBlock = evidenceBlocks.find((block) => stringArray(block.evidenceIds) && evidenceIds.some((id) => block.evidenceIds.includes(id)));
    const finding = hasTraceableEvidence
      ? item.finding || (matchingBlock && Array.isArray(matchingBlock.points) && matchingBlock.points.length
        ? matchingBlock.points.join(' ')
        : plan.summary || plan.headline)
      : 'No se ha vinculado evidencia directa con una fuente consultable a esta parte.';

    return {
      id: breakdown.propositionIds?.[index] || `argument-${index + 1}`,
      claim: item.text,
      kind: typeof item.type === 'string' ? item.type : typeof plan.claimType === 'string' ? plan.claimType : 'specific_fact',
      verdict,
      evidenceLevel: !hasTraceableEvidence && verdict === 'insufficient'
        ? 'none'
        : item.evidenceLevel || (verdict === 'supported' ? 'strong' : verdict === 'mixed' ? 'limited' : 'none'),
      finding,
      evidenceIds,
      sourceIds,
      limitations: typeof plan.limitation === 'string' && plan.limitation ? [plan.limitation] : [],
    };
  });
};
