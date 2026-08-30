import type { AnswerPlan } from '../../src/lib/knowledge/contracts';
import type { CatalogueEntry } from '../../src/data/catalogue';
import type { CatalogueEntry as RuntimeCatalogueEntry } from './catalogue-resolver';
import type { ClaimAssessment, CheckResult, CheckSource, CheckVisual, PublicCheckResponse, ClaimInterpretation, CheckCriterion, ArgumentAssessment } from '../../src/lib/knowledge/public-check';

// Interpretation confidence, model metadata and extraction provenance are
// internal quality signals. Public answers describe the meaning in plain
// language and expose sources/limitations, but never leak those internals.
const publicInterpretation = (interpretation?: ClaimInterpretation): ClaimInterpretation | undefined => {
  if (!interpretation) return undefined;
  const { confidence: _confidence, alternatives, ...visible } = interpretation;
  return {
    ...visible,
    alternatives: alternatives?.map(({ confidence: _alternativeConfidence, ...alternative }) => alternative),
  };
};

const sourceLinks = (plan?: AnswerPlan): CheckSource[] => {
  // Relevance is established by criterion-to-source attribution in the
  // answer plan. Requiring a shared claim token here rejects valid primary
  // sources (for example the Constitution does not need to mention the
  // politician named in the claim) and collapses supported fallbacks into
  // “insufficient”.
  return (plan?.sourceLinks || []).map((source) => ({ id: source.id, title: source.title, publisher: source.publisher, url: source.url, publishedAt: source.publishedAt, retrievedAt: source.retrievedAt }));
};
const replyFromPlan = (plan?: AnswerPlan): string => {
  const composed = plan?.blocks?.find((block) => block.type === 'conversation_reply')?.text;
  if (composed) return composed;
  const finding = plan?.blocks?.find((block) => block.type === 'confirmed' || block.type === 'data_finding');
  const firstPoint = finding && 'points' in finding ? finding.points?.[0] : undefined;
  return [firstPoint, plan?.summary].filter(Boolean).join(' ');
};
const criteriaFromPlan = (plan: AnswerPlan): CheckCriterion[] => plan.blocks.filter((block) => block.type === 'confirmed' || block.type === 'data_finding').flatMap((block, index) => {
  const points = 'points' in block ? block.points || [] : [];
  const evidenceIds = 'evidenceIds' in block && Array.isArray(block.evidenceIds) ? block.evidenceIds : [];
  return points.slice(0, 3).map((finding, pointIndex) => ({ id: `evidence-${index + 1}-${pointIndex + 1}`, label: pointIndex === 0 ? 'Dato respaldado' : 'Contexto', finding, sourceIds: evidenceIds }));
});
const argumentsFromPlan = (plan: AnswerPlan): ArgumentAssessment[] => {
  const breakdown = plan.blocks.find((block) => block.type === 'claim_breakdown');
  if (!breakdown || !('items' in breakdown) || !breakdown.items?.length) return [];
  const items = breakdown.items;
  const evidenceBlocks = plan.blocks.filter((block) => block.type === 'data_finding' || block.type === 'confirmed');
  return items.map((item, index) => {
    const evidenceIds = item.evidenceIds?.length
      ? item.evidenceIds
      : (breakdown.evidenceIds || []).filter((_, evidenceIndex) => evidenceIndex % items.length === index);
    const verdict = item.verdict || (evidenceIds.length ? (plan.evidenceLevel === 'supported' ? 'supported' : plan.evidenceLevel === 'limited' ? 'mixed' : 'insufficient') : 'insufficient');
    const matchingBlock = evidenceBlocks.find((block) => 'evidenceIds' in block && evidenceIds.some((id) => block.evidenceIds?.includes(id)));
    const finding = matchingBlock && 'points' in matchingBlock && matchingBlock.points?.length
      ? matchingBlock.points.join(' ')
      : plan.summary || plan.headline;
    return {
    id: breakdown.propositionIds[index] || `argument-${index + 1}`,
    claim: item.text,
    kind: item.type as ArgumentAssessment['kind'],
    verdict,
    evidenceLevel: item.evidenceLevel || (verdict === 'supported' ? 'strong' : verdict === 'mixed' ? 'limited' : 'none'),
    finding: item.finding || finding,
    evidenceIds,
    sourceIds: plan.sourceIds || [],
    limitations: [plan.limitation].filter((value): value is string => Boolean(value)),
    };
  });
};
const visualFromCatalogue = (entry: CatalogueEntry | RuntimeCatalogueEntry): CheckVisual | undefined => {
  const visual = 'visual' in entry ? entry.visual : undefined;
  if (!visual || visual.type === 'none' || !visual.labels?.length || !visual.values?.length || visual.labels.length !== visual.values.length) return undefined;
  if (!visual.evidenceIds.length || visual.evidenceIds.some((id: string) => !entry.evidenceIds.includes(id)) || visual.values.some((value: number) => !Number.isFinite(value))) return undefined;
  return { type: visual.type, title: visual.title, unit: visual.unit, labels: visual.labels, values: visual.values, evidenceIds: visual.evidenceIds };
};
const assessmentFor = (entry: CatalogueEntry | RuntimeCatalogueEntry): ClaimAssessment | undefined => {
  const value = 'assessment' in entry ? entry.assessment : undefined;
  return typeof value === 'string' && ['true', 'mostly-true', 'misleading', 'unsupported', 'uncertain', 'false'].includes(value) ? value as ClaimAssessment : undefined;
};
const scopeFor = (entry: CatalogueEntry | RuntimeCatalogueEntry) => ({ geography: entry.geography, period: entry.period, checkedAt: 'evidenceVerifiedAt' in entry ? entry.evidenceVerifiedAt : undefined });
const resultFor = (entry: CatalogueEntry | RuntimeCatalogueEntry, claim: string, stable: boolean): CheckResult => ({
  claim, reply: 'reply' in entry ? entry.reply : entry.answer, answer: entry.answer, keyFact: entry.explanation,
  whatWeKnow: [entry.explanation].filter(Boolean), limitations: 'limitations' in entry ? entry.limitations : [], scope: scopeFor(entry),
  sources: 'sources' in entry ? entry.sources.map((source) => ({ id: source.id, title: source.title, publisher: source.publisher, url: source.url, publishedAt: source.date })) : [],
  assessment: stable ? assessmentFor(entry) : undefined, visual: visualFromCatalogue(entry), canonicalSlug: stable ? entry.slug : undefined, canonicalHref: stable ? `/comprobar/${entry.slug}` : undefined,
});
export const checkFromCatalogue = (claim: string, entry: CatalogueEntry | RuntimeCatalogueEntry): PublicCheckResponse => ({ state: 'supported', id: entry.slug, result: { ...resultFor(entry, claim, true), evidenceLevel: 'supported' } });
export const clarificationCheck = (claim: string, _missingDimensions: string[] = []): PublicCheckResponse => ({ state: 'clarification', id: `clarify-${Date.now().toString(36)}`, claim, question: `¿Qué quieres medir con «${claim}»?`, options: [
  { id: 'unemployment', label: 'Personas sin empleo', interpretation: { kind: 'quantitative', predicate: 'desempleo', normalizedClaim: `${claim}: tasa de desempleo` } },
  { id: 'access', label: 'Encontrar una oferta', interpretation: { kind: 'comparative', predicate: 'acceso al empleo', normalizedClaim: `${claim}: acceso a ofertas de empleo` } },
  { id: 'quality', label: 'Condiciones del trabajo', interpretation: { kind: 'quantitative', predicate: 'calidad del empleo', normalizedClaim: `${claim}: calidad del empleo` } },
] });
const clarificationFromPlan = (claim: string, plan: AnswerPlan): PublicCheckResponse | undefined => {
  const alternatives = plan.interpretation?.alternatives?.filter((item) => item.evidenceDifference === 'material' && item.normalizedClaim && item.interpretation).slice(0, 4) || [];
  if (alternatives.length < 2) return undefined;
  const interpretation = publicInterpretation(plan.interpretation as ClaimInterpretation | undefined);
  return {
    state: 'clarification',
    id: `clarify-${Date.now().toString(36)}`,
    claim,
    interpretation: interpretation ? { ...interpretation, kind: interpretation.kind as ClaimInterpretation['kind'] } : undefined,
    question: '¿Cuál de estas interpretaciones quieres comprobar?',
    options: alternatives.map((item, index) => ({
      id: `meaning-${index + 1}`,
      label: item.interpretation,
      interpretation: {
        ...(interpretation || {}),
        kind: (interpretation?.kind || 'specific_fact') as ClaimInterpretation['kind'],
        normalizedClaim: item.normalizedClaim,
        interpretation: item.interpretation,
        alternatives: [],
      },
    })),
  };
};
export const checkFromPlan = (claim: string, plan: AnswerPlan, requestId?: string, allowClarification = true): PublicCheckResponse => {
  if (allowClarification) {
    const clarification = clarificationFromPlan(claim, plan);
    if (clarification) return clarification;
  }
  const criteria = criteriaFromPlan(plan);
  const attributedIds = new Set(criteria.flatMap((item) => item.sourceIds || []));
  const sources = sourceLinks(plan).filter((source) => attributedIds.has(source.id));
  const supported = plan.evidenceLevel === 'supported' || (plan.evidenceLevel === undefined && plan.evidenceIds.length > 0 && plan.sourceIds.length > 0 && sources.length > 0);
  const interpretation = publicInterpretation(plan.interpretation as ClaimInterpretation | undefined);
  const argumentsList = argumentsFromPlan(plan);
  const counts = argumentsList.reduce((acc, item) => { acc[item.verdict] += 1; return acc; }, { supported: 0, contradicted: 0, mixed: 0, insufficient: 0, not_verifiable: 0 } as Record<string, number>);
  const evaluative = String(plan.claimType) === 'evaluative' || String(plan.claimType) === 'evaluative_judgment' || plan.interpretation?.kind === 'evaluative_judgment' || /\b(?:peor|mejor)\s+presidente\b/i.test(claim);
  const result: CheckResult = { claim, interpretation, thesis: evaluative ? { text: claim, kind: 'evaluative', conclusion: 'No existe un veredicto objetivo sin definir los criterios y el periodo de comparación.', criteria: ['resultados económicos y sociales', 'calidad institucional', 'cumplimiento legal', 'comparación con otros gobiernos'] } : undefined, reply: replyFromPlan(plan), answer: plan.summary || plan.headline, keyFact: plan.headline, criteria, arguments: argumentsList.length ? argumentsList : undefined, coverageSummary: argumentsList.length ? { total: argumentsList.length, supported: counts.supported, contradicted: counts.contradicted, mixed: counts.mixed, insufficient: counts.insufficient, notVerifiable: counts.not_verifiable } : undefined, whatWeKnow: criteria.map((item) => item.finding), limitations: [plan.limitation].filter((value): value is string => Boolean(value)), scope: { checkedAt: plan.asOf }, sources, evidenceSummary: plan.evidenceSummary };
  const argumentEvidence = argumentsList.reduce((count, item) => count + item.evidenceIds.length, 0);
  const state = argumentsList.length && argumentEvidence === 0
    ? 'insufficient'
    : (plan.evidenceLevel === 'supported' && (!criteria.length || !sources.length)) ? 'insufficient' : (plan.evidenceLevel || (supported ? 'supported' : 'limited'));
  return { state, id: requestId || `check-${Date.now().toString(36)}`, result: { ...result, evidenceLevel: state } };
};
export const unavailableCheck = (claim: string, message: string): PublicCheckResponse => ({ state: 'unavailable', id: `unavailable-${Date.now().toString(36)}`, claim, message, retryable: true });
export const processingCheck = (claim: string, requestId: string): PublicCheckResponse => ({ state: 'processing', id: requestId, claim });
