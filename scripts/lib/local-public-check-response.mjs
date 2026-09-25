import { deterministicApiFallback } from '../../src/lib/knowledge/deterministic-api-fallback.mjs';
import { broadDomainPacketsFor } from '../../src/lib/knowledge/broad-domain-snapshot.mjs';

const visualsFromPlan = (plan) => {
  const planned = plan.visuals?.length ? plan.visuals : plan.visual ? [plan.visual] : [];
  const valid = planned.filter((visual) => Array.isArray(visual.labels)
    && visual.labels.length > 0
    && Array.isArray(visual.values)
    && visual.labels.length === visual.values.length
    && visual.values.every(Number.isFinite))
    .map((visual) => ({
      type: visual.type,
      title: visual.title,
      unit: visual.unit,
      labels: visual.labels,
      values: visual.values,
      evidenceIds: visual.evidenceIds,
      sourceId: visual.sourceId,
      note: visual.note,
      interpretation: visual.interpretation,
      breakAfter: visual.breakAfter,
    }));
  if (valid.length) return valid;

  const series = plan.warehouseSeries;
  if (!series || !series.labels?.length || series.labels.length !== series.values?.length || series.values.some((value) => !Number.isFinite(value))) return [];
  return [{ type: series.labels.length === 2 ? 'comparison' : 'bar', title: series.label, unit: series.unit, labels: series.labels, values: series.values, evidenceIds: plan.evidenceIds }];
};

export const localPublicCheckResponse = (payload, claim = '') => {
  if (payload?.status === 'processing' && payload.requestId) {
    const fallback = broadDomainPacketsFor(claim).length ? deterministicApiFallback({ text: claim, inputType: 'text' }) : undefined;
    const preview = fallback?.status === 'complete'
      ? localPublicCheckResponse({ ...fallback, requestId: payload.requestId }, claim)
      : undefined;
    return { state: 'processing', id: payload.requestId, claim, ...(preview ? { preview } : {}) };
  }

  const plan = payload?.status === 'complete' ? payload.result : undefined;
  if (!plan || typeof plan !== 'object') return { state: 'unavailable', id: `local-${Date.now().toString(36)}`, claim, message: 'La comprobación local no pudo completarse.', retryable: true };

  const blocks = Array.isArray(plan.blocks) ? plan.blocks : [];
  const criteria = blocks
    .filter((block) => block?.type === 'confirmed' || block?.type === 'data_finding')
    .flatMap((block, blockIndex) => (Array.isArray(block.points) ? block.points : []).slice(0, 3).map((finding, pointIndex) => ({
      id: `evidence-${blockIndex + 1}-${pointIndex + 1}`,
      label: pointIndex ? 'Contexto' : 'Dato respaldado',
      finding,
      sourceIds: Array.isArray(block.evidenceIds) ? block.evidenceIds : [],
    })));
  const plannedVisuals = visualsFromPlan(plan);
  const shareableSourceIds = Array.isArray(plan.shareableSourceIds) ? plan.shareableSourceIds : [];
  const attributedIds = new Set([
    ...criteria.flatMap((item) => item.sourceIds || []),
    ...(plan.evidenceSummary?.families || []).flatMap((family) => [
      ...(family.sourceIds || []),
      ...(family.criteria || []).flatMap((criterion) => criterion.sourceIds || []),
    ]),
    ...plannedVisuals.flatMap((visual) => [...(visual.evidenceIds || []), ...(visual.sourceId ? [visual.sourceId] : [])]),
    ...shareableSourceIds,
  ]);
  const sources = (Array.isArray(plan.sourceLinks) ? plan.sourceLinks : [])
    .filter((source) => attributedIds.has(source.id))
    .map((source) => ({ id: source.id, title: source.title, publisher: source.publisher, url: source.url, publishedAt: source.publishedAt, retrievedAt: source.retrievedAt }));
  const composedReply = blocks.find((block) => block?.type === 'conversation_reply')?.text;
  const reply = plan.shareableReply?.trim() || composedReply || [criteria[0]?.finding, plan.summary].filter(Boolean).join(' ');
  const evidenceLevel = plan.evidenceLevel === 'supported' && criteria.length && sources.length ? 'supported' : plan.evidenceLevel === 'insufficient' ? 'insufficient' : 'limited';

  return {
    state: evidenceLevel,
    id: payload.requestId || `local-${Date.now().toString(36)}`,
    result: {
      claim,
      interpretation: plan.interpretation,
      reply,
      answer: reply || plan.summary || plan.headline,
      shareableReply: plan.shareableReply,
      shareableSourceIds: shareableSourceIds.length ? shareableSourceIds : undefined,
      keyFact: plan.headline,
      criteria,
      whatWeKnow: criteria.map((item) => item.finding),
      limitations: [plan.limitation].filter(Boolean),
      scope: { checkedAt: plan.asOf },
      sources,
      visual: plannedVisuals[0],
      visuals: plannedVisuals.length > 1 ? plannedVisuals : undefined,
      evidenceSummary: plan.evidenceSummary,
      evidenceLevel,
    },
  };
};
