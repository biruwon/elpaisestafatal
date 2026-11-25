const sourceReferences = (value) => {
  if (!value || typeof value !== 'object') return [];
  const source = value.source && typeof value.source === 'object' ? value.source : value;
  return [
    source.id,
    source.url,
    value.sourceId,
    value.sourceUrl,
    ...(Array.isArray(value.sourceIds) ? value.sourceIds : []),
  ].filter((item) => typeof item === 'string' && item.trim());
};

const intersects = (left, right) => left.some((item) => right.includes(item));

// Sources discovered before population/scope filtering may only remain in the
// answer when a retained observation points back to them. If a selected row
// has its own source metadata, prefer that copy; it is the provenance of the
// evidence that survived the claim-scope checks.
export const sourceForScopedObservations = (candidateSources = [], observations = []) => {
  const retained = Array.isArray(observations) ? observations : [];
  const candidates = (Array.isArray(candidateSources) ? candidateSources : [candidateSources]).filter(Boolean);

  for (const candidate of candidates) {
    const candidateRefs = sourceReferences(candidate);
    if (!candidateRefs.length) continue;
    const matchingObservation = retained.find((observation) => intersects(candidateRefs, sourceReferences(observation)));
    if (matchingObservation) return matchingObservation.source || candidate;
  }

  return retained.find((observation) => observation?.source && typeof observation.source === 'object')?.source;
};
