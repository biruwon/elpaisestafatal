import { sourcesForEvidenceIds } from './evidence-source-ids.mjs';

const stringArray = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string');

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
    const verdict = item.verdict || (evidenceIds.length
      ? plan.evidenceLevel === 'supported' ? 'supported' : plan.evidenceLevel === 'limited' ? 'mixed' : 'insufficient'
      : 'insufficient');
    const matchingBlock = evidenceBlocks.find((block) => stringArray(block.evidenceIds) && evidenceIds.some((id) => block.evidenceIds.includes(id)));
    const finding = matchingBlock && Array.isArray(matchingBlock.points) && matchingBlock.points.length
      ? matchingBlock.points.join(' ')
      : plan.summary || plan.headline;
    const relatedFamilySourceIds = (plan.evidenceSummary?.families || [])
      .filter((family) => stringArray(family.evidenceIds) && family.evidenceIds.some((id) => evidenceIds.includes(id)))
      .flatMap((family) => stringArray(family.sourceIds) ? family.sourceIds : []);
    const evidenceSourceIds = sourcesForEvidenceIds(plan, evidenceIds);

    return {
      id: breakdown.propositionIds?.[index] || `argument-${index + 1}`,
      claim: item.text,
      kind: typeof item.type === 'string' ? item.type : typeof plan.claimType === 'string' ? plan.claimType : 'specific_fact',
      verdict,
      evidenceLevel: item.evidenceLevel || (verdict === 'supported' ? 'strong' : verdict === 'mixed' ? 'limited' : 'none'),
      finding: item.finding || finding,
      evidenceIds,
      sourceIds: (stringArray(plan.sourceIds) ? plan.sourceIds : []).filter((sourceId) => (stringArray(item.sourceIds) && item.sourceIds.includes(sourceId))
        || evidenceIds.includes(sourceId) || relatedFamilySourceIds.includes(sourceId) || evidenceSourceIds.includes(sourceId)),
      limitations: typeof plan.limitation === 'string' && plan.limitation ? [plan.limitation] : [],
    };
  });
};
