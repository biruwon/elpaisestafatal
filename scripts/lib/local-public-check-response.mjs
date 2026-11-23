import { deterministicApiFallback } from '../../src/lib/knowledge/deterministic-api-fallback.mjs';
import { broadDomainPacketsFor } from '../../src/lib/knowledge/broad-domain-snapshot.mjs';
import { isBroadGovernmentScorecardClaim } from '../../src/lib/knowledge/scorecard-interpretation.mjs';
import { claimFocusFor } from '../../src/lib/knowledge/claim-focus.mjs';
import { attachExtraction, extractedClaim, publicExtraction } from '../../src/lib/knowledge/submission.mjs';
import { sourcesForEvidenceIds } from '../../src/lib/knowledge/evidence-source-ids.mjs';
import { publicArgumentsFromPlan, publicEvidenceLevelForArguments, qualifyPublicClaimReply, requiresPublicClaimQualification } from '../../src/lib/knowledge/public-arguments.mjs';
import { publicResolveResponse } from '../../src/lib/knowledge/public-response.mjs';
import { publicEvidenceGapReply } from '../../src/lib/knowledge/public-answer-composition.mjs';

const normalizedClaim = (value) => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim();
const exactPublishedSlugFor = (payload, claim) => {
  const references = [...(Array.isArray(payload?.relatedClaims) ? payload.relatedClaims : []), ...(payload?.primary ? [payload.primary] : [])];
  for (const reference of references) {
    const href = typeof reference?.href === 'string' ? reference.href : '';
    const match = href.match(/^\/afirmaciones\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
    if (reference?.kind === 'claim' && Number(reference.confidence) === 1
      && normalizedClaim(reference.title) === normalizedClaim(claim) && match) return match[1];
  }
  return undefined;
};

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
      axisMin: visual.axisMin,
    }));
  if (valid.length) return valid;

  const series = plan.warehouseSeries;
  if (!series || !series.labels?.length || series.labels.length !== series.values?.length || series.values.some((value) => !Number.isFinite(value))) return [];
  return [{ type: series.labels.length === 2 ? 'comparison' : 'bar', title: series.label, unit: series.unit, labels: series.labels, values: series.values, evidenceIds: plan.evidenceIds }];
};

export const localPublicCheckResponse = (payload, claim = '') => {
  const safePayload = publicResolveResponse(payload);
  const extraction = publicExtraction(safePayload?.extraction || payload?.extraction);
  claim = extraction ? extractedClaim(extraction) : claim || safePayload?.claim || payload?.claim || '';
  if (safePayload?.status === 'processing' && safePayload.requestId) {
    const hasReviewedRoute = isBroadGovernmentScorecardClaim(claim) || broadDomainPacketsFor(claim).length > 0 || Boolean(claimFocusFor(claim));
    const fallback = hasReviewedRoute ? deterministicApiFallback({ text: claim, inputType: 'text' }) : undefined;
    const structuredEvidenceGap = fallback?.status === 'uncovered'
      && fallback.result?.evidenceLevel === 'insufficient'
      && fallback.result.blocks?.some((block) => block.type === 'evidence_gap')
      && fallback.result.clarificationQuestion
      && !fallback.result.evidenceIds?.length
      && !fallback.result.sourceIds?.length;
    const preview = (['complete', 'partial'].includes(fallback?.status) || structuredEvidenceGap)
      ? localPublicCheckResponse({ ...fallback, requestId: safePayload.requestId }, claim)
      : undefined;
    return { state: 'processing', id: safePayload.requestId, claim, ...(preview ? { preview } : {}) };
  }

  const plan = safePayload && ['complete', 'partial', 'uncovered', 'draft'].includes(safePayload.status) ? safePayload.result : undefined;
  if (!plan || typeof plan !== 'object') return attachExtraction({ state: 'unavailable', id: `local-${Date.now().toString(36)}`, claim, message: extraction?.warnings[0] || 'La comprobación local no pudo completarse.', retryable: true }, extraction);

  const blocks = Array.isArray(plan.blocks) ? plan.blocks : [];
  const claimBreakdown = blocks.find((block) => block?.type === 'claim_breakdown');
  const claimItems = Array.isArray(claimBreakdown?.items) ? claimBreakdown.items : [];
  const argumentsList = publicArgumentsFromPlan(plan);
  const criteria = blocks
    .filter((block) => block?.type === 'confirmed' || block?.type === 'data_finding')
    .flatMap((block, blockIndex) => (Array.isArray(block.points) ? block.points : []).slice(0, 3).map((finding, pointIndex) => ({
      id: `evidence-${blockIndex + 1}-${pointIndex + 1}`,
      label: block.dataKind === 'context' || pointIndex ? 'Contexto' : 'Dato respaldado',
      finding,
      sourceIds: sourcesForEvidenceIds(plan, Array.isArray(block.evidenceIds) ? block.evidenceIds : []),
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
    ...argumentsList.flatMap((argument) => [...argument.evidenceIds, ...argument.sourceIds]),
    ...shareableSourceIds,
  ]);
  const sources = (Array.isArray(plan.sourceLinks) ? plan.sourceLinks : [])
    .filter((source) => attributedIds.has(source.id))
    .map((source) => ({ id: source.id, title: source.title, publisher: source.publisher, url: source.url, publishedAt: source.publishedAt, retrievedAt: source.retrievedAt }));
  const composedReply = blocks.find((block) => block?.type === 'conversation_reply')?.text;
  const reply = plan.shareableReply?.trim() || composedReply || publicEvidenceGapReply(plan) || [criteria[0]?.finding, plan.summary].filter(Boolean).join(' ');
  const evidenceFamilies = plan.evidenceSummary?.families || [];
  const hasVisibleFindings = criteria.length > 0
    || evidenceFamilies.some((family) => family.status !== 'missing' && Boolean(family.finding?.trim() || family.data?.length))
    || plannedVisuals.length > 0;
  const missingPublicEvidence = (sources.length === 0 && (hasVisibleFindings || plan.evidenceLevel !== 'insufficient'))
    || (plan.evidenceLevel === 'supported' && (!criteria.length || !sources.length));
  const coverageGap = blocks.find((block) => block?.type === 'evidence_gap');
  const coverageGapReply = plan.evidenceLevel === 'insufficient' && !sources.length && coverageGap
    ? publicEvidenceGapReply(plan, { attributionUnavailable: true }) || plan.limitation?.trim() || coverageGap.nextAction
    : undefined;
  const claimNeedsQualification = requiresPublicClaimQualification(plan, argumentsList);
  const answerNeedsQualification = claimNeedsQualification || plan.evidenceLevel === 'insufficient';
  const evidenceLevel = missingPublicEvidence ? 'insufficient' : plan.evidenceLevel === 'supported' && criteria.length && sources.length ? 'supported' : plan.evidenceLevel === 'insufficient' ? 'insufficient' : 'limited';
  const claimHasDirectEvidence = argumentsList.some((item) => item.evidenceIds.length > 0);
  const publicEvidenceLevel = evidenceLevel === 'limited' && claimItems.length > 0 && !claimHasDirectEvidence
    ? 'insufficient'
    : publicEvidenceLevelForArguments(evidenceLevel, plan, argumentsList);
  const publicReply = missingPublicEvidence
    ? coverageGapReply || 'No hemos podido recuperar datos y fuentes verificables para esta frase. Por eso no la damos por confirmada.'
    : answerNeedsQualification ? qualifyPublicClaimReply(reply, argumentsList) : reply;
  const alreadyQualifiedShareableReply = !missingPublicEvidence && Boolean(plan.shareableReply?.trim()) && publicReply === reply;
  const suppressShareableReply = missingPublicEvidence || answerNeedsQualification && !alreadyQualifiedShareableReply;
  const publishedSlug = !extraction && missingPublicEvidence ? exactPublishedSlugFor(safePayload, claim) : undefined;
  if (publishedSlug) {
    const message = 'Esta afirmación tiene una ficha revisada con datos, fuentes y límites. Abrimos esa comprobación.';
    return {
      state: 'supported',
      id: safePayload.requestId || `local-${Date.now().toString(36)}`,
      result: {
        claim, reply: message, answer: message, keyFact: 'Ficha revisada disponible',
        criteria: [], whatWeKnow: [], limitations: [], scope: {}, sources: [],
        evidenceLevel: 'supported', canonicalHref: `/comprobar/${publishedSlug}`,
      },
    };
  }
  const nextQuestion = typeof plan.clarificationQuestion === 'string'
    ? plan.clarificationQuestion
    : safePayload.guidance?.questions?.[0];

  return attachExtraction({
    state: publicEvidenceLevel,
    id: safePayload.requestId || `local-${Date.now().toString(36)}`,
    result: {
      claim,
      ...(argumentsList.length ? { arguments: argumentsList.map((argument) => ({
        ...argument,
        sourceIds: argument.sourceIds.filter((id) => sources.some((source) => source.id === id)),
      })) } : {}),
      interpretation: plan.interpretation,
      ...(nextQuestion ? { nextQuestion } : {}),
      reply: publicReply,
      answer: publicReply || plan.summary || plan.headline,
      shareableReply: suppressShareableReply ? undefined : plan.shareableReply,
      shareableSourceIds: !suppressShareableReply && shareableSourceIds.length ? shareableSourceIds : undefined,
      keyFact: missingPublicEvidence ? 'Evidencia verificable no recuperada' : answerNeedsQualification ? 'La evidencia no basta para confirmar toda la afirmación' : plan.headline,
      criteria: missingPublicEvidence ? [] : criteria,
      whatWeKnow: missingPublicEvidence ? [] : criteria.map((item) => item.finding),
      limitations: [...new Set([plan.limitation, ...(missingPublicEvidence ? ['La respuesta no contiene hallazgos atribuibles a una fuente que se pueda consultar.'] : [])].filter(Boolean))],
      scope: { checkedAt: plan.asOf },
      sources: missingPublicEvidence ? [] : sources,
      visual: missingPublicEvidence ? undefined : plannedVisuals[0],
      visuals: missingPublicEvidence ? undefined : plannedVisuals.length > 1 ? plannedVisuals : undefined,
      evidenceSummary: missingPublicEvidence ? undefined : plan.evidenceSummary,
      answerScope: missingPublicEvidence ? undefined : plan.answerScope,
      evidenceLevel: publicEvidenceLevel,
    },
  }, extraction);
};
