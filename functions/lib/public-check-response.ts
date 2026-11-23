import type { AnswerPlan } from '../../src/lib/knowledge/contracts';
import type { CatalogueEntry } from '../../src/data/catalogue';
import type { CatalogueEntry as RuntimeCatalogueEntry } from './catalogue-resolver';
import type { ClaimAssessment, CheckResult, CheckSource, CheckVisual, PublicCheckResponse, ClaimInterpretation, CheckCriterion, CheckScorecard } from '../../src/lib/knowledge/public-check';
import { composeFamilyReply } from '../../src/lib/knowledge/broad-domain-snapshot.mjs';
import { sourcesForEvidenceIds } from '../../src/lib/knowledge/evidence-source-ids.mjs';
import { publicArgumentsFromPlan, publicEvidenceLevelForArguments, qualifyPublicClaimReply, requiresPublicClaimQualification } from '../../src/lib/knowledge/public-arguments.mjs';
import { publicMetricLabel } from '../../src/lib/knowledge/public-presentation';
import { publicEvidenceGapReply } from '../../src/lib/knowledge/public-answer-composition.mjs';

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
  if (plan?.scopedPresentation && plan.shareableReply) return plan.shareableReply;
  if (plan?.evidenceSummary?.families?.length && String((plan as AnswerPlan & { id?: string }).id || '').startsWith('broad-')) return composeFamilyReply(plan, { compact: String((plan as AnswerPlan & { id?: string }).id || '') === 'broad-compound-claim' });
  const composed = plan?.blocks?.find((block) => block.type === 'conversation_reply')?.text;
  if (composed) return composed;
  const evidenceGap = publicEvidenceGapReply(plan);
  if (evidenceGap) return evidenceGap;
  const finding = plan?.blocks?.find((block) => block.type === 'confirmed' || block.type === 'data_finding');
  const firstPoint = finding && 'points' in finding ? finding.points?.[0] : undefined;
  return [firstPoint, plan?.summary].filter(Boolean).join(' ');
};
const criteriaFromPlan = (plan: AnswerPlan): CheckCriterion[] => plan.blocks.filter((block) => block.type === 'confirmed' || block.type === 'data_finding').flatMap((block, index) => {
  const points = 'points' in block ? block.points || [] : [];
  const evidenceIds = 'evidenceIds' in block && Array.isArray(block.evidenceIds) ? block.evidenceIds : [];
  return points.map((finding, pointIndex) => ({ id: `evidence-${index + 1}-${pointIndex + 1}`, label: ('dataKind' in block && block.dataKind === 'context') || pointIndex > 0 ? 'Contexto' : 'Dato respaldado', finding, sourceIds: sourcesForEvidenceIds(plan, evidenceIds) }));
}).concat(plan.blocks.filter((block) => block.type === 'scorecard').flatMap((block, index) => {
  if (!('items' in block) || !Array.isArray(block.items)) return [];
  return block.items.slice(0, 12).map((item, itemIndex) => ({ id: `scorecard-${index + 1}-${itemIndex + 1}`, label: item.label, finding: [item.baseline?.value && `${item.baseline.period}: ${item.baseline.value}`, item.comparison?.value && `${item.comparison.period}: ${item.comparison.value}`, item.change].filter(Boolean).join(' → ') || item.caveat || 'Indicador sin comparación compatible', sourceIds: sourcesForEvidenceIds(plan, item.evidenceIds || []) }));
}));
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
const publicEvidenceSummary = (summary: AnswerPlan['evidenceSummary']) => summary ? {
  ...summary,
  families: summary.families.map((family, index) => ({
    ...family,
    familyId: family.familyId || `evidence-family-${index + 1}`,
    familyLabel: publicMetricLabel(family.familyLabel || family.label),
    label: publicMetricLabel(family.label),
    sourceIds: family.sourceIds || [],
    criteria: family.criteria?.map((criterion) => ({ ...criterion, sourceIds: criterion.sourceIds || [] })),
  })),
} : undefined;
const scorecardFromPlan = (plan: AnswerPlan, sources: CheckSource[]): CheckScorecard | undefined => {
  const block = plan.blocks.find((item) => item.type === 'scorecard');
  if (!block || block.type !== 'scorecard' || !block.items.length) return undefined;
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  return {
    title: 'Indicadores nacionales revisados',
    baselinePeriod: block.baseline.period,
    comparisonPeriod: block.comparison.period,
    snapshotDate: plan.asOf,
    scope: block.geography,
    explanation: plan.limitation || 'No existe una única serie estadística que mida una valoración política tan amplia. Este cuadro reúne indicadores distintos y no calcula una nota global.',
    items: block.items.slice(0, 12).map((item) => ({
      label: publicMetricLabel(item.label), unit: item.unit || 'valor',
      baseline: item.baseline, comparison: item.comparison, change: item.change,
      direction: item.direction, caveat: item.caveat,
      sources: sourcesForEvidenceIds(plan, item.evidenceIds).map((id: string) => sourceById.get(id)).filter((source: CheckSource | undefined): source is CheckSource => Boolean(source)),
    })),
  };
};
const visualsFromPlan = (plan: AnswerPlan): CheckVisual[] => {
  const planned = plan.visuals?.length ? plan.visuals : plan.visual ? [plan.visual] : [];
  const valid = planned.filter((visual) => visual.labels.length > 0 && visual.labels.length === visual.values.length && visual.values.every(Number.isFinite))
    .map((visual) => ({ type: visual.type, title: visual.title, unit: visual.unit, labels: visual.labels, values: visual.values, evidenceIds: visual.evidenceIds, sourceId: visual.sourceId, note: visual.note, interpretation: visual.interpretation, breakAfter: visual.breakAfter, axisMin: visual.axisMin }));
  if (valid.length) return valid;
  const series = plan.warehouseSeries;
  if (!series || !series.labels.length || series.labels.length !== series.values.length || series.values.some((value) => !Number.isFinite(value))) return [];
  return [{ type: series.labels.length === 2 ? 'comparison' : 'bar', title: series.label, unit: series.unit, labels: series.labels, values: series.values, evidenceIds: plan.evidenceIds }];
};
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
  const attributedIds = new Set([
    ...criteria.flatMap((item) => item.sourceIds || []),
    ...(plan.evidenceSummary?.families || []).flatMap((family) => [...(family.sourceIds || []), ...(family.criteria || []).flatMap((criterion) => criterion.sourceIds || [])]),
    ...(plan.visual?.evidenceIds || []),
    ...(plan.visual?.sourceId ? [plan.visual.sourceId] : []),
    ...(plan.visuals || []).flatMap((visual) => [...visual.evidenceIds, ...(visual.sourceId ? [visual.sourceId] : [])]),
    ...(plan.shareableSourceIds || []),
  ]);
  const sources = sourceLinks(plan).filter((source) => attributedIds.has(source.id));
  const supported = plan.evidenceLevel === 'supported' || (plan.evidenceLevel === undefined && plan.evidenceIds.length > 0 && plan.sourceIds.length > 0 && sources.length > 0);
  const interpretation = publicInterpretation(plan.interpretation as ClaimInterpretation | undefined);
  const argumentsList = publicArgumentsFromPlan(plan);
  const counts = argumentsList.reduce((acc, item) => { acc[item.verdict] += 1; return acc; }, { supported: 0, contradicted: 0, mixed: 0, insufficient: 0, not_verifiable: 0 } as Record<string, number>);
  const evaluativeWording = /\b(?:peor|mejor|mejores|peores|mejor[ae]s)\b/i.test(claim) && /\b(?:presidente|gobierno|partido|gesti[oó]n|administraci[oó]n|pol[ií]tica)\b/i.test(claim);
  const evaluative = String(plan.claimType) === 'evaluative' || String(plan.claimType) === 'evaluative_judgment' || plan.interpretation?.kind === 'evaluative_judgment' || evaluativeWording;
  const scorecardItems = plan.blocks.find((block) => block.type === 'scorecard');
  const improved = scorecardItems && 'items' in scorecardItems ? scorecardItems.items.filter((item) => item.direction === 'improved').length : 0;
  const worsened = scorecardItems && 'items' in scorecardItems ? scorecardItems.items.filter((item) => item.direction === 'worsened').length : 0;
  const thesisConclusion = scorecardItems && 'items' in scorecardItems && scorecardItems.items.length
    ? `El cuadro de datos compara ${scorecardItems.baseline.period} con ${scorecardItems.comparison.period}: ${improved} indicadores mejoran y ${worsened} empeoran. Esa evidencia permite valorar resultados concretos, pero no convierte por sí sola la comparación en una clasificación histórica objetiva.`
    : 'La tesis se evalúa mejor separando sus argumentos y comparando resultados concretos con un periodo y criterios definidos.';
  const scorecard = scorecardFromPlan(plan, sources);
  const claimNeedsQualification = plan.evidenceLevel === 'supported' && requiresPublicClaimQualification(plan, argumentsList);
  const originalReply = plan.shareableReply?.trim() || replyFromPlan(plan);
  const reply = claimNeedsQualification ? qualifyPublicClaimReply(originalReply) : originalReply;
  const visuals = visualsFromPlan(plan);
  const hasVisibleFindings = criteria.length > 0
    || (plan.evidenceSummary?.families || []).some((family) => family.status !== 'missing' && Boolean(family.finding?.trim() || family.data?.length))
    || visuals.length > 0
    || Boolean(scorecard?.items.length);
  const missingPublicEvidence = (sources.length === 0 && (hasVisibleFindings || plan.evidenceLevel !== 'insufficient'))
    || (plan.evidenceLevel === 'supported' && (!criteria.length || !sources.length));
  const coverageGap = plan.blocks.find((block) => block.type === 'evidence_gap');
  const coverageGapReply = plan.evidenceLevel === 'insufficient' && !sources.length && coverageGap
    ? publicEvidenceGapReply(plan, { attributionUnavailable: true }) || plan.limitation?.trim() || coverageGap.nextAction
    : undefined;
  const publicReply = missingPublicEvidence
    ? coverageGapReply || 'No hemos podido recuperar datos y fuentes verificables para esta frase. Por eso no la damos por confirmada.'
    : reply;
  const publicLimitation = 'La respuesta no contiene hallazgos atribuibles a una fuente que se pueda consultar.';
  const result: CheckResult = { claim, interpretation, nextQuestion: plan.clarificationQuestion, thesis: evaluative ? { text: claim, kind: 'evaluative', conclusion: thesisConclusion, criteria: ['resultados económicos y sociales', 'calidad institucional', 'cumplimiento legal', 'comparación con otros gobiernos'] } : undefined, reply, answer: reply || plan.summary || plan.headline, shareableReply: claimNeedsQualification ? undefined : plan.shareableReply, shareableSourceIds: claimNeedsQualification ? undefined : plan.shareableSourceIds, keyFact: claimNeedsQualification ? 'La evidencia no permite confirmar todas las partes de la afirmación' : plan.headline, criteria, arguments: argumentsList.length ? argumentsList : undefined, coverageSummary: argumentsList.length ? { total: argumentsList.length, supported: counts.supported, contradicted: counts.contradicted, mixed: counts.mixed, insufficient: counts.insufficient, notVerifiable: counts.not_verifiable } : undefined, whatWeKnow: criteria.map((item) => item.finding), limitations: [plan.limitation].filter((value): value is string => Boolean(value)), scope: { checkedAt: plan.asOf }, answerScope: plan.answerScope, sources, visual: visuals[0], visuals: visuals.length > 1 ? visuals : undefined, scorecard, evidenceSummary: publicEvidenceSummary(plan.evidenceSummary) };
  const argumentEvidence = argumentsList.reduce((count, item) => count + item.evidenceIds.length, 0);
  const effectiveEvidenceLevel = publicEvidenceLevelForArguments(plan.evidenceLevel || (supported ? 'supported' : 'limited'), plan, argumentsList) || (supported ? 'supported' : 'limited');
  const state = missingPublicEvidence ? 'insufficient' : argumentsList.length && argumentEvidence === 0
    ? 'insufficient'
    : (effectiveEvidenceLevel === 'supported' && (!criteria.length || !sources.length)) ? 'insufficient' : effectiveEvidenceLevel;
  const safeResult = missingPublicEvidence ? {
    ...result,
    reply: publicReply,
    answer: publicReply,
    thesis: undefined,
    shareableReply: undefined,
    shareableSourceIds: undefined,
    keyFact: 'Evidencia verificable no recuperada',
    criteria: [],
    arguments: undefined,
    coverageSummary: undefined,
    whatWeKnow: [],
    limitations: [...new Set([...result.limitations, publicLimitation])],
    sources: [],
    visual: undefined,
    visuals: undefined,
    scorecard: undefined,
    evidenceSummary: undefined,
    answerScope: undefined,
  } : result;
  return { state, id: requestId || `check-${Date.now().toString(36)}`, result: { ...safeResult, evidenceLevel: state } };
};
export const unavailableCheck = (claim: string, message: string): PublicCheckResponse => ({ state: 'unavailable', id: `unavailable-${Date.now().toString(36)}`, claim, message, retryable: true });
export const processingCheck = (claim: string, requestId: string, preview?: Extract<PublicCheckResponse, { state: 'supported' | 'limited' | 'insufficient' }>): PublicCheckResponse => ({ state: 'processing', id: requestId, claim, ...(preview ? { preview } : {}) });
