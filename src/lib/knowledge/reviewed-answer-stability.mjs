const normalizeLabel = (value) => String(value || '')
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const familiesFor = (response) => (response?.result?.evidenceSummary?.families || [])
  .map((family) => normalizeLabel(family.familyLabel || family.label))
  .filter(Boolean);

const visualsFor = (response) => [
  ...(response?.result?.visuals || []),
  ...(response?.result?.visual ? [response.result.visual] : []),
]
  .map((visual) => normalizeLabel(visual.title))
  .filter(Boolean);

// A completed enrichment is safe to show only when it preserves the reviewed
// answer's evidence families and every chart that made that answer useful.
// Otherwise keep the reviewed preview instead of changing scope during polling.
export const shouldRetainReviewedPreview = (preview, completed) => {
  const reviewedFamilies = familiesFor(preview);
  const completedFamilies = familiesFor(completed);
  if (reviewedFamilies.length && (reviewedFamilies.length !== completedFamilies.length
    || reviewedFamilies.some((family) => !completedFamilies.includes(family)))) return true;

  const reviewedVisuals = visualsFor(preview);
  const completedVisuals = visualsFor(completed);
  return reviewedVisuals.length > 0
    && reviewedVisuals.some((title) => !completedVisuals.includes(title));
};
