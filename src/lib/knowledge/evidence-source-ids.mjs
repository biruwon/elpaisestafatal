// Evidence IDs identify observations; source IDs identify documents. Keep
// the two distinct and only attach a source when the plan explicitly links it
// to the observation (or when the evidence ID itself is a source ID).
export const sourcesForEvidenceIds = (plan, evidenceIds = []) => {
  const requested = new Set(evidenceIds);
  const knownSources = new Set((plan?.sourceLinks || []).map((source) => source.id));
  const result = new Set([...requested].filter((id) => knownSources.has(id)));
  const add = (record) => {
    if (!(record?.evidenceIds || []).some((id) => requested.has(id))) return;
    for (const id of record.sourceIds || []) if (knownSources.has(id)) result.add(id);
  };
  for (const family of plan?.evidenceSummary?.families || []) {
    add(family);
    for (const criterion of family.criteria || []) add(criterion);
  }
  return [...result];
};
