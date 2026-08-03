export const validateMaterializationRecords = ({ answer = {}, slug = '', knownEvidence = new Set(), knownSources = new Set(), knownPropositions = new Map() } = {}) => {
  const evidenceIds = Array.isArray(answer.evidenceIds) ? answer.evidenceIds.filter((id) => typeof id === 'string') : [];
  const sourceRefs = Array.isArray(answer.sourceIds) ? answer.sourceIds.filter((id) => typeof id === 'string') : [];
  const propositionIds = Array.isArray(answer.propositionIds) ? answer.propositionIds.filter((id) => typeof id === 'string') : [];
  const missingEvidence = evidenceIds.filter((id) => !knownEvidence.has(id));
  const missingSources = sourceRefs.filter((id) => !knownSources.has(id));
  const missingPropositions = propositionIds.filter((id) => !knownPropositions.has(id));
  const wrongClaimPropositions = propositionIds.filter((id) => knownPropositions.get(id)?.claimSlug && knownPropositions.get(id).claimSlug !== slug);
  const unlinkedEvidence = propositionIds.flatMap((id) => (knownPropositions.get(id)?.evidenceIds || []).filter((evidenceId) => !evidenceIds.includes(evidenceId)).map((evidenceId) => `${id}:${evidenceId}`));
  return { evidenceIds, sourceRefs, propositionIds, missingEvidence, missingSources, missingPropositions, wrongClaimPropositions, unlinkedEvidence };
};
