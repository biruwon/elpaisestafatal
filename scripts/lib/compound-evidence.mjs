// Keep each outcome aligned with the proposition that launched it. Removing
// failed outcomes before attribution shifts later evidence to the wrong claim.
export const alignPropositionOutcomes = (items, outcomes) => items.map((item, index) => {
  const outcome = outcomes[index];
  const plan = outcome?.status === 'fulfilled' ? outcome.value?.result : undefined;
  if (!plan) return item;
  return { ...item, evidenceIds: plan.evidenceIds || [], sourceIds: plan.sourceIds || [],
    verdict: plan.evidenceLevel === 'supported' ? 'supported' : plan.evidenceLevel === 'limited' ? 'mixed' : 'insufficient',
    evidenceLevel: plan.evidenceLevel === 'supported' ? 'strong' : plan.evidenceLevel === 'limited' ? 'limited' : 'none',
    finding: plan.summary || plan.headline };
});
